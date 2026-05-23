import React from "react";
import Svg, { Path, Circle, Rect, Line, Polyline, G } from "react-native-svg";

import { colors } from "@/theme";

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const base = (size: number, color: string, sw: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const HardHatIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M2 18h20" />
    <Path d="M4 18v-3a8 8 0 0 1 16 0v3" />
    <Path d="M10 7V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
  </Svg>
);

export const DashboardIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Rect x="3" y="3" width="7" height="9" rx="1.5" />
    <Rect x="14" y="3" width="7" height="5" rx="1.5" />
    <Rect x="14" y="12" width="7" height="9" rx="1.5" />
    <Rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
);

export const UploadIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="17 8 12 3 7 8" />
    <Line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);

export const ClipboardIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Rect x="8" y="2" width="8" height="4" rx="1" />
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Polyline points="9 14 11 16 15 12" />
  </Svg>
);

export const ChatIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Svg>
);

export const PlusIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="16" />
    <Line x1="8" y1="12" x2="16" y2="12" />
  </Svg>
);

export const HouseIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
  </Svg>
);

export const CompassIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="m16 8-4 8-4-8 4 2 4-2z" />
  </Svg>
);

export const FileIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
  </Svg>
);

export const ChevronRightIcon = ({ size = 20, color = colors.outline, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const ArrowLeftIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

export const RefreshIcon = ({ size = 18, color = colors.secondary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Polyline points="23 4 23 10 17 10" />
    <Polyline points="1 20 1 14 7 14" />
    <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <Path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </Svg>
);

export const CheckIcon = ({ size = 18, color = colors.onTertiaryContainer, strokeWidth = 2.5 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const SendIcon = ({ size = 22, color = colors.onPrimary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Svg>
);

export const RulerIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Svg>
);

export const DoorIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
    <Line x1="3" y1="21" x2="21" y2="21" />
    <Line x1="15" y1="12" x2="15.01" y2="12" />
  </Svg>
);

export const WindowIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Rect x="4" y="4" width="16" height="16" rx="1" />
    <Line x1="12" y1="4" x2="12" y2="20" />
    <Line x1="4" y1="12" x2="20" y2="12" />
  </Svg>
);

export const WallIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Rect x="3" y="3" width="18" height="18" rx="1" />
    <Line x1="3" y1="9" x2="21" y2="9" />
    <Line x1="3" y1="15" x2="21" y2="15" />
    <Line x1="8" y1="3" x2="8" y2="9" />
    <Line x1="14" y1="9" x2="14" y2="15" />
    <Line x1="10" y1="15" x2="10" y2="21" />
  </Svg>
);

export const ChecklistIcon = ({ size = 20, color = colors.onSurface, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Polyline points="3 6 5 8 9 4" />
    <Line x1="13" y1="6" x2="21" y2="6" />
    <Polyline points="3 13 5 15 9 11" />
    <Line x1="13" y1="13" x2="21" y2="13" />
    <Polyline points="3 20 5 22 9 18" />
    <Line x1="13" y1="20" x2="21" y2="20" />
  </Svg>
);

export const TrashIcon = ({ size = 18, color = colors.error, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const InfoIcon = ({ size = 16, color = colors.secondary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="16" x2="12" y2="12" />
    <Line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

export const CloudUploadIcon = ({ size = 48, color = colors.secondary, strokeWidth = 1.8 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8 6 6 0 0 0-11.7 1.8A4 4 0 0 0 6 19h11.5z" />
    <Polyline points="9 13 12 10 15 13" />
    <Line x1="12" y1="10" x2="12" y2="18" />
  </Svg>
);

export const SparkleIcon = ({ size = 18, color = colors.onPrimary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

export const CloseIcon = ({ size = 16, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const CheckCircleIcon = ({ size = 20, color = colors.tertiary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="8 12 11 15 16 9" />
  </Svg>
);

export const PdfFileIcon = ({ size = 20, color = colors.onSecondaryContainer, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
    <Path d="M8 14h2v3M13 14h2a1 1 0 0 1 0 2h-2zM18 14h-2v3M16 15.5h1.5" strokeWidth={strokeWidth - 0.4} />
  </Svg>
);

export const MailIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <Polyline points="22 6 12 13 2 6" />
  </Svg>
);

export const LockIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const UserIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

export const EyeIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

export const EyeOffIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <Line x1="1" y1="1" x2="23" y2="23" />
  </Svg>
);

export const ArrowRightIcon = ({ size = 18, color = colors.onSecondary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Svg>
);

export const ShieldCheckIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
    <Polyline points="9 12 11 14 15 10" />
  </Svg>
);

export const LogoutIcon = ({ size = 18, color = colors.onSurfaceVariant, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

export const SparklesIcon = ({ size = 18, color = colors.secondary, strokeWidth = 2 }: IconProps) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5z" />
    <Path d="M5 16l-1 3 3-1 1 3 1-3 3 1-1-3" />
  </Svg>
);
