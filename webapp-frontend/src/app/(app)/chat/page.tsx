"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatBubble, TimestampPill } from "@/components/ChatBubble";
import { EmptyState } from "@/components/EmptyState";
import { ChatIcon, SendIcon } from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QuickReplyChip } from "@/components/QuickReplyChip";
import { Spinner } from "@/components/Spinner";
import { api, ApiError, streamChatMessage, type SseHandle } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import type { ChatMessage } from "@/types/api";

const FALLBACK_QUICK_REPLIES = [
  "Lista de portas",
  "Lista de janelas",
  "Medidas dos quartos",
  "Checklist de execução",
];

/** The backend emits naive UTC (datetime.utcnow()) with no timezone suffix; a
 *  tz-less string is parsed as LOCAL by `new Date`, showing times offset by the
 *  user's UTC offset. Treat a missing tz as UTC so it converts correctly. */
function parseApiDate(iso: string): Date {
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

function formatTime(iso: string): string {
  try {
    return parseApiDate(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  const d = parseApiDate(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return `Hoje, ${formatTime(iso)}`;
  if (sameDay(d, yesterday)) return `Ontem, ${formatTime(iso)}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function ChatPage() {
  const router = useRouter();
  const { currentProject, currentProjectId, openProject } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<SseHandle | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, []);

  const lastQuickReplies = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant?.quick_replies?.length
      ? lastAssistant.quick_replies
      : FALLBACK_QUICK_REPLIES;
  }, [messages]);

  const loadHistory = useCallback(async () => {
    if (!currentProjectId) return;
    setLoading(true);
    setError(undefined);
    try {
      const history = await api.getChatHistory(currentProjectId);
      setMessages(history);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o chat.");
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (currentProjectId) {
      openProject(currentProjectId);
      loadHistory();
    }
  }, [currentProjectId, openProject, loadHistory]);

  const lastContentLen = messages.length ? messages[messages.length - 1].content.length : 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [messages.length, lastContentLen, sending]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || !currentProjectId || sending) return;
      setInput("");
      const optimisticUserId = `tmp-user-${Date.now()}`;
      const optimisticAssistantId = `tmp-asst-${Date.now()}`;
      const optimisticUser: ChatMessage = {
        id: optimisticUserId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
        quick_replies: [],
      };
      const optimisticAssistant: ChatMessage = {
        id: optimisticAssistantId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        quick_replies: [],
      };
      setMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);
      setSending(true);
      setError(undefined);

      // Keep a STABLE id for both optimistic messages for the whole turn. Do NOT
      // rename the assistant id on `assistant_start`: a setMessages updater reads
      // the id lazily at render time, but the old code reassigned `assistantId`
      // synchronously right after queueing the rename — so the updater ran later,
      // looked for the NEW id (not yet applied), matched nothing, and every
      // subsequent token + the final `done` were dropped → empty bubble. The
      // server message id isn't needed for display.
      const assistantId = optimisticAssistantId;

      streamRef.current?.close();
      const handle = streamChatMessage(currentProjectId, text, (event) => {
        if (event.type === "user_message") {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticUserId ? { ...event.message, id: optimisticUserId } : m)),
          );
        } else if (event.type === "assistant_start") {
          // Intentionally a no-op — the bubble keeps its stable optimistic id.
        } else if (event.type === "token") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.delta } : m,
            ),
          );
        } else if (event.type === "done") {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...event.message, id: assistantId } : m)),
          );
          setSending(false);
        } else if (event.type === "error") {
          setError(event.message);
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUserId && m.id !== assistantId),
          );
          setSending(false);
        }
      });

      streamRef.current = handle;

      handle.done
        .catch((err) => {
          setError(err instanceof ApiError ? err.message : "Falha ao enviar a pergunta.");
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUserId && m.id !== assistantId),
          );
        })
        .finally(() => {
          setSending(false);
          // Only clear if no newer send replaced this handle (avoid orphaning).
          if (streamRef.current === handle) streamRef.current = null;
        });
    },
    [currentProjectId, sending],
  );

  if (!currentProject) {
    return (
      <div className="flex flex-col justify-center gap-4 py-10">
        <EmptyState
          title="Escolha um projeto"
          description="O chat usa o resumo do projeto selecionado como contexto. Selecione um projeto no Dashboard para começar."
          icon={<ChatIcon size={26} color="var(--color-secondary)" />}
        />
        <PrimaryButton label="Ir para o Dashboard" onClick={() => router.push("/dashboard")} />
      </div>
    );
  }

  if (currentProject.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Spinner size={36} color="var(--color-secondary)" />
        <p className="type-body-md text-on-surface-variant">
          O chat fica disponível assim que a análise da planta terminar.
        </p>
        <PrimaryButton
          label="Ver progresso no resumo"
          variant="ghost"
          fullWidth={false}
          onClick={() => router.push("/summary")}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-200px)] flex-col sm:h-[calc(100dvh-136px)]">
      <div className="border-b border-surface-container-highest/60 pb-3">
        <h1 className="type-title-lg text-on-surface">{currentProject.name}</h1>
        <p className="type-body-md text-secondary">Chat do projeto</p>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8 text-secondary">
            <Spinner size={24} />
          </div>
        ) : null}

        {messages.length > 0 && <TimestampPill label={dayLabel(messages[0].created_at)} />}

        {messages.map((message) => {
          if (message.role === "assistant" && message.content.length === 0 && sending) {
            return (
              <div key={message.id} className="flex py-1">
                <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3">
                  <span className="flex items-center gap-1">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary [animation-delay:0.2s]" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary [animation-delay:0.4s]" />
                  </span>
                  <span className="type-body-md text-on-surface-variant">
                    Mestre IA está digitando…
                  </span>
                </div>
              </div>
            );
          }
          return (
            <ChatBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={formatTime(message.created_at)}
            />
          );
        })}

        {error && <p className="py-2 text-center type-body-md text-error">{error}</p>}
      </div>

      <div className="border-t border-surface-container-highest/60 bg-surface pt-3">
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {lastQuickReplies.map((label, i) => (
            <QuickReplyChip
              key={label}
              index={i}
              label={label}
              onClick={() => send(label)}
              disabled={sending}
            />
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte ao Mestre IA…"
            rows={1}
            disabled={sending}
            aria-label="Caixa de mensagem"
            className="max-h-36 min-h-14 flex-1 resize-none rounded-full border border-[rgba(198,198,205,0.5)] bg-surface-container-lowest px-6 py-4 text-[15px] leading-[22px] text-on-surface outline-none placeholder:text-secondary focus:border-secondary"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            aria-label="Enviar mensagem"
            className={[
              "press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-send",
              sending || !input.trim() ? "opacity-50" : "hover:brightness-110",
            ].join(" ")}
          >
            <SendIcon size={20} color="var(--color-on-primary)" />
          </button>
        </div>
      </div>
    </div>
  );
}
