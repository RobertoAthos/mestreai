export type ProjectStatus = "processing" | "ready" | "failed";

/** Normalized bounding box of an element on the floor-plan page: x, y, w, h are
 *  fractions of the page in [0,1], origin at the top-left corner. `page` is the
 *  zero-based page index. Never pixels — so the overlay maps at any zoom/scale. */
export interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
  /** 0-based index into the project's sheets. Falls back to `page` for legacy. */
  sheet?: number;
}

/** One folha of a project — a single renderable page (file + page). */
export interface Sheet {
  index: number;
  label: string;
  page_count: number;
  source_filename: string | null;
}

export interface Room {
  name: string;
  width_m: number | null;
  length_m: number | null;
  area_m2: number | null;
  notes: string | null;
  geometry?: Geometry | null;
}

export interface Door {
  code: string;
  width_m: number;
  height_m: number;
  room: string | null;
  notes: string | null;
  geometry?: Geometry | null;
}

export interface Window {
  code: string;
  width_m: number;
  height_m: number;
  sill_height_m: number | null;
  room: string | null;
  notes: string | null;
  geometry?: Geometry | null;
}

export interface WallSpec {
  type: string;
  thickness_cm: number;
  notes: string | null;
  geometry?: Geometry | null;
}

export interface ProjectSummary {
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  walls: WallSpec[];
  execution_checklist: string[];
  general_notes: string | null;
}

export interface Project {
  id: string;
  name: string;
  filename: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  pages: number;
  size_bytes: number;
  summary: ProjectSummary | null;
  error: string | null;
  chat_memory: string | null;
  sheets: Sheet[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
  pages: number;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  quick_replies: string[];
}

export interface UploadResponse {
  project: Project;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  is_guest: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GuestQuota {
  is_guest: boolean;
  used: number;
  limit: number | null;
}
