"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  onClick: () => void;
  icon: ReactNode;
};

export function Fab({ label, onClick, icon }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press animate-fade-up fixed bottom-24 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-secondary px-6 text-on-secondary shadow-fab hover:brightness-105 sm:bottom-6"
    >
      {icon}
      <span className="type-label-md">{label}</span>
    </button>
  );
}
