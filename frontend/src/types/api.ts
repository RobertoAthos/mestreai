export type ProjectStatus = "processing" | "ready" | "failed";

export interface Room {
  name: string;
  width_m: number | null;
  length_m: number | null;
  area_m2: number | null;
  notes: string | null;
}

export interface Door {
  code: string;
  width_m: number;
  height_m: number;
  room: string | null;
  notes: string | null;
}

export interface Window {
  code: string;
  width_m: number;
  height_m: number;
  sill_height_m: number | null;
  room: string | null;
  notes: string | null;
}

export interface WallSpec {
  type: string;
  thickness_cm: number;
  notes: string | null;
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
