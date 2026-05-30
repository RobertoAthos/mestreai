import type { ReactNode } from "react";

import { ClipboardIcon } from "@/components/Icon";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Heading element for the title. Defaults to h3; pass "h1" when this is the
   *  only content on the page (e.g. a gateway/empty state) for a valid outline. */
  headingLevel?: "h1" | "h2" | "h3";
};

export function EmptyState({ title, description, icon, headingLevel = "h3" }: Props) {
  const Heading = headingLevel;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-container-highest bg-surface-container-lowest p-6 text-center">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-secondary">
        {icon ?? <ClipboardIcon size={28} />}
      </div>
      <Heading className="type-title-md text-on-surface">{title}</Heading>
      {description && (
        <p className="max-w-[280px] type-body-md text-on-surface-variant">{description}</p>
      )}
    </div>
  );
}
