type Props = {
  size?: number;
  /** Stroke color — defaults to currentColor so it inherits text color. */
  color?: string;
  className?: string;
};

export function Spinner({ size = 20, color = "currentColor", className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className ?? ""}`}
      role="status"
      aria-label="Carregando"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
