import { CheckCircleIcon } from "@/components/Icon";

type Props = {
  title: string;
  description?: string;
  index?: number;
  divider?: boolean;
};

export function CheckListItem({ title, description, index, divider = true }: Props) {
  return (
    <div
      className={[
        "flex min-h-14 items-start gap-2 py-2",
        divider ? "border-b border-[rgba(198,198,205,0.3)]" : "",
      ].join(" ")}
    >
      <span className="mt-0.5 text-secondary">
        <CheckCircleIcon size={18} />
      </span>
      <div className="flex-1">
        <p className="type-title-md text-[15px] text-on-surface">
          {typeof index === "number" ? `${index}. ` : ""}
          {title}
        </p>
        {description && (
          <p className="mt-0.5 type-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
    </div>
  );
}
