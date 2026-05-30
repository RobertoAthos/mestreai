import type { ReactNode, SVGProps } from "react";

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

function Base({
  size = 20,
  color = "currentColor",
  strokeWidth = 2,
  className,
  children,
  ...rest
}: IconProps & { children: ReactNode } & Omit<SVGProps<SVGSVGElement>, "color">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HardHatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 18h20" />
    <path d="M4 18v-3a8 8 0 0 1 16 0v3" />
    <path d="M10 7V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
  </Base>
);

export const DashboardIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Base>
);

export const ClipboardIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <polyline points="9 14 11 16 15 12" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </Base>
);

export const HouseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
  </Base>
);

export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="m16 8-4 8-4-8 4 2 4-2z" />
  </Base>
);

export const FileIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <polyline points="9 18 15 12 9 6" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </Base>
);

export const CheckIcon = ({ strokeWidth = 2.5, ...p }: IconProps) => (
  <Base strokeWidth={strokeWidth} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Base>
);

export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Base>
);

export const RulerIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Base>
);

export const DoorIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
  </Base>
);

export const WindowIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </Base>
);

export const WallIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="8" y1="3" x2="8" y2="9" />
    <line x1="14" y1="9" x2="14" y2="15" />
    <line x1="10" y1="15" x2="10" y2="21" />
  </Base>
);

export const ChecklistIcon = (p: IconProps) => (
  <Base {...p}>
    <polyline points="3 6 5 8 9 4" />
    <line x1="13" y1="6" x2="21" y2="6" />
    <polyline points="3 13 5 15 9 11" />
    <line x1="13" y1="13" x2="21" y2="13" />
    <polyline points="3 20 5 22 9 18" />
    <line x1="13" y1="20" x2="21" y2="20" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Base>
);

export const CloudUploadIcon = ({ strokeWidth = 1.8, ...p }: IconProps) => (
  <Base strokeWidth={strokeWidth} {...p}>
    <path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8 6 6 0 0 0-11.7 1.8A4 4 0 0 0 6 19h11.5z" />
    <polyline points="9 13 12 10 15 13" />
    <line x1="12" y1="10" x2="12" y2="18" />
  </Base>
);

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Base>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 11 15 16 9" />
  </Base>
);

export const PdfFileIcon = ({ strokeWidth = 2, ...p }: IconProps) => (
  <Base strokeWidth={strokeWidth} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 14h2v3M13 14h2a1 1 0 0 1 0 2h-2zM18 14h-2v3M16 15.5h1.5" strokeWidth={strokeWidth - 0.4} />
  </Base>
);

export const MailIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <polyline points="22 6 12 13 2 6" />
  </Base>
);

export const LockIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Base>
);

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const EyeOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Base>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
    <polyline points="9 12 11 14 15 10" />
  </Base>
);

export const LogoutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Base>
);

export const SparklesIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5z" />
    <path d="M5 16l-1 3 3-1 1 3 1-3 3 1-1-3" />
  </Base>
);

export const ZapIcon = (p: IconProps) => (
  <Base {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Base>
);

export const ScanIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </Base>
);

export const LayersIcon = (p: IconProps) => (
  <Base {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </Base>
);
