type Props = {
  label: string;
  value: string;
  sub?: string;
};

export function MeasureRow({ label, value, sub }: Props) {
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-md bg-surface-container-highest p-2">
      <div className="flex-1">
        <p className="type-body-lg text-on-surface-variant">{label}</p>
        {sub && <p className="mt-0.5 type-body-sm text-secondary">{sub}</p>}
      </div>
      <span className="rounded-sm border border-outline-variant bg-surface px-2.5 py-[5px] font-mono text-[14px] font-medium text-on-surface">
        {value}
      </span>
    </div>
  );
}
