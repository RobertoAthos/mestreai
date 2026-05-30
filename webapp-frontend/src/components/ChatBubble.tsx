import { HardHatIcon } from "@/components/Icon";
import type { ChatRole } from "@/types/api";

type Props = {
  role: ChatRole;
  content: string;
  timestamp?: string;
};

export function ChatBubble({ role, content, timestamp }: Props) {
  const isUser = role === "user";
  return (
    <div
      className={[
        "animate-fade-up flex w-full items-end gap-3 py-1",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(198,198,205,0.5)] bg-primary text-on-primary">
          <HardHatIcon size={20} />
        </div>
      )}
      <div
        className={[
          "min-h-11 max-w-[82%] border border-transparent px-4 py-4",
          isUser
            ? "rounded-t-lg rounded-bl-lg rounded-br-sm bg-primary text-on-primary"
            : "rounded-t-lg rounded-br-lg rounded-bl-sm border-[rgba(198,198,205,0.3)] bg-surface-container-low text-on-surface-variant",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words type-body-lg text-[15px]">{content}</p>
        {timestamp && (
          <p
            className={[
              "mt-1 type-label-md",
              isUser ? "text-on-primary opacity-80" : "text-secondary",
            ].join(" ")}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

export function TimestampPill({ label }: { label: string }) {
  return (
    <div className="animate-fade-in flex items-center justify-center py-2">
      <span className="rounded-full border border-[rgba(198,198,205,0.5)] bg-surface-container px-4 py-[5px] type-label-md text-secondary">
        {label}
      </span>
    </div>
  );
}
