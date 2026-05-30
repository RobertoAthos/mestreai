"use client";

type Props = {
  title: string;
  action?: { label: string; onClick: () => void };
};

export function SectionHeader({ title, action }: Props) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="type-headline-md text-on-surface">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="type-label-md uppercase text-on-surface press"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
