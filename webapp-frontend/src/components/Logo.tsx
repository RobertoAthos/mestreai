// Aspect ratio of the brand PNG (366x422). Height is the controllable
// dimension; width tracks the ratio so the artwork never stretches.
const ASPECT = 366 / 422;

type Props = {
  size?: number;
  className?: string;
};

export function Logo({ size = 28, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Mestre IA"
      width={Math.round(size * ASPECT)}
      height={size}
      style={{ width: size * ASPECT, height: size }}
      className={className}
    />
  );
}
