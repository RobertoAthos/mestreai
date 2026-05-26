import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { ChatBubble, TimestampPill } from "@/components/ChatBubble";
import { EmptyState } from "@/components/EmptyState";
import { ChatIcon, SendIcon } from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QuickReplyChip } from "@/components/QuickReplyChip";
import { api, ApiError, streamChatMessage, type SseHandle } from "@/services/api";
import { useApp } from "@/store/AppContext";
import { colors, radius, spacing, typography } from "@/theme";
import type { ChatMessage } from "@/types/api";

const FALLBACK_QUICK_REPLIES = [
  "Lista de portas",
  "Lista de janelas",
  "Medidas dos quartos",
  "Checklist de execução",
];

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
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

export default function ChatScreen() {
  const router = useRouter();
  const { currentProject, currentProjectId, openProject } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const scrollRef = useRef<ScrollView>(null);
  const streamRef = useRef<SseHandle | null>(null);

  // Tear down any in-flight stream when leaving the screen so we don't keep
  // an SSE socket open in the background.
  useEffect(() => {
    return () => {
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, []);

  const lastQuickReplies = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant?.quick_replies?.length ? lastAssistant.quick_replies : FALLBACK_QUICK_REPLIES;
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

  useFocusEffect(
    useCallback(() => {
      if (currentProjectId) {
        openProject(currentProjectId);
        loadHistory();
      }
    }, [currentProjectId, loadHistory, openProject]),
  );

  // Also depend on the last message's content length so we keep scrolling
  // as the assistant types — otherwise the streaming bubble grows below
  // the fold without bringing it into view.
  const lastContentLen = messages.length ? messages[messages.length - 1].content.length : 0;
  useEffect(() => {
    if (!scrollRef.current) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
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
      Haptics.selectionAsync().catch(() => {});

      // ID assigned by the server for the assistant message. We swap the
      // optimistic id for the real one once the stream tells us, so the
      // final `done` event can update the same bubble in place.
      let assistantId = optimisticAssistantId;

      streamRef.current?.close();
      streamRef.current = streamChatMessage(currentProjectId, text, (event) => {
        if (event.type === "user_message") {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticUserId ? event.message : m)),
          );
        } else if (event.type === "assistant_start") {
          const newId = event.id;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, id: newId } : m)),
          );
          assistantId = newId;
        } else if (event.type === "token") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.delta } : m,
            ),
          );
        } else if (event.type === "done") {
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? event.message : m)));
          setSending(false);
        } else if (event.type === "error") {
          setError(event.message);
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUserId && m.id !== assistantId));
          setSending(false);
        }
      });

      streamRef.current.done
        .catch((err) => {
          setError(err instanceof ApiError ? err.message : "Falha ao enviar a pergunta.");
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUserId && m.id !== assistantId));
        })
        .finally(() => {
          setSending(false);
          streamRef.current = null;
        });
    },
    [currentProjectId, sending],
  );

  if (!currentProject) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader />
        <View style={styles.placeholder}>
          <EmptyState
            title="Escolha um projeto"
            description="O chat usa o resumo do projeto selecionado como contexto. Selecione um projeto no Dashboard para começar."
            icon={<ChatIcon color={colors.secondary} size={26} />}
          />
          <PrimaryButton label="Ir para o Dashboard" onPress={() => router.replace("/(tabs)")} />
        </View>
      </SafeAreaView>
    );
  }

  if (currentProject.status !== "ready") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader title={currentProject.name} subtitle="Analisando…" />
        <View style={styles.placeholder}>
          <ActivityIndicator color={colors.secondary} size="large" />
          <Text style={styles.placeholderText}>
            O chat fica disponível assim que a análise da planta terminar.
          </Text>
          <PrimaryButton
            label="Ver progresso no resumo"
            variant="ghost"
            onPress={() => router.replace("/(tabs)/summary")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title={currentProject.name} subtitle="Chat do projeto" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {loading && messages.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.secondary} />
            </View>
          ) : null}

          {messages.length > 0 && <TimestampPill label={dayLabel(messages[0].created_at)} />}

          {messages.map((message) => {
            // While the assistant message is still being streamed (empty
            // content), swap in the typing indicator instead of an empty
            // bubble so the chat doesn't show a blank gap.
            if (message.role === "assistant" && message.content.length === 0 && sending) {
              return (
                <View key={message.id} style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator color={colors.secondary} />
                    <Text style={styles.typingText}>Mestre IA está digitando…</Text>
                  </View>
                </View>
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

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.bottom}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {lastQuickReplies.map((label, i) => (
              <QuickReplyChip
                key={label}
                index={i}
                label={label}
                onPress={() => send(label)}
                disabled={sending}
              />
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Pergunte ao Mestre IA…"
                placeholderTextColor={colors.secondary}
                style={styles.input}
                multiline
                editable={!sending}
                onSubmitEditing={() => send(input)}
                blurOnSubmit={false}
                accessibilityLabel="Caixa de mensagem"
              />
            </View>
            <Pressable
              onPress={() => send(input)}
              disabled={sending || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              style={({ pressed }) => [
                styles.sendButton,
                (sending || !input.trim()) && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <SendIcon size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: "center" },
  placeholder: { flex: 1, padding: spacing.lg, gap: spacing.md, justifyContent: "center" },
  placeholderText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: "center" },
  typingRow: { flexDirection: "row", paddingVertical: spacing.xs },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  typingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(198, 198, 205, 0.3)",
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
  },
  quickRow: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  inputWrap: { flex: 1 },
  input: {
    minHeight: 56,
    maxHeight: 140,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: "rgba(198, 198, 205, 0.5)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
});
