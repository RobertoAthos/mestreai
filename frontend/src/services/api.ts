import Constants from "expo-constants";
import { fetch as expoFetch } from "expo/fetch";

import type {
  AuthResponse,
  ChatMessage,
  GuestQuota,
  LoginRequest,
  Project,
  ProjectListItem,
  ProjectSummary,
  SignupRequest,
  UploadResponse,
  User,
} from "@/types/api";

const fallbackBase = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBase || ""

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Token is set by the AuthContext at boot and on login/logout — every
// request automatically picks it up so screens don't have to thread it
// through manually.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  // ---------- auth -------------------------------------------------------
  signup: (payload: SignupRequest) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginRequest) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  guestSession: () =>
    request<AuthResponse>("/auth/guest", { method: "POST" }),
  me: () => request<User>("/auth/me"),

  // ---------- projects ---------------------------------------------------
  listProjects: () => request<ProjectListItem[]>("/projects"),
  getQuota: () => request<GuestQuota>("/projects/quota"),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  uploadProject: async (file: { uri: string; name: string; mimeType?: string }, name?: string) => {
    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/pdf",
    } as unknown as Blob);
    if (name) form.append("name", name);
    return request<UploadResponse>("/projects", {
      method: "POST",
      body: form,
    });
  },

  // ---------- chat -------------------------------------------------------
  getChatHistory: (projectId: string) => request<ChatMessage[]>(`/chat/${projectId}`),
  sendMessage: (projectId: string, message: string) =>
    request<{ message: ChatMessage; history: ChatMessage[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, message }),
    }),
  resetChat: (projectId: string) => request<void>(`/chat/${projectId}`, { method: "DELETE" }),
};

// ---------- SSE -----------------------------------------------------------
//
// Both streaming endpoints emit `text/event-stream`. The frontend uses
// expo/fetch (WinterCG fetch) because the React Native polyfill backed by
// XHR can't expose a ReadableStream body. Each SSE frame is separated by a
// blank line; we accumulate bytes and dispatch `data:` payloads as parsed
// JSON to the caller.

export type AnalysisStreamEvent =
  | { type: "status"; project: Project }
  | { type: "token"; delta: string }
  | { type: "done"; summary: ProjectSummary }
  | { type: "error"; message: string }
  | { type: "closed" };

export type ChatStreamEvent =
  | { type: "user_message"; message: ChatMessage }
  | { type: "assistant_start"; id: string }
  | { type: "token"; delta: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; message: string };

export interface SseHandle {
  close(): void;
  done: Promise<void>;
}

interface SseInit {
  method: "GET" | "POST";
  body?: string;
}

async function consumeSse<E>(
  url: string,
  init: SseInit,
  onEvent: (event: E) => void,
  signal: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await expoFetch(`${API_BASE_URL}${url}`, {
    method: init.method,
    body: init.body,
    headers,
    signal,
  });
  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  const body = (res as unknown as { body: ReadableStream<Uint8Array> | null }).body;
  if (!body) throw new ApiError(0, "Streaming não suportado neste ambiente.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLines = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      try {
        const event = JSON.parse(dataLines.join("\n")) as E;
        onEvent(event);
      } catch {
        // ignore malformed frames (e.g. heartbeat comments)
      }
    }
  }
}

function startSse<E>(url: string, init: SseInit, onEvent: (event: E) => void): SseHandle {
  const controller = new AbortController();
  const done = consumeSse<E>(url, init, onEvent, controller.signal).catch((err) => {
    // AbortError is expected when the caller closes the handle; swallow it
    // so callers don't have to special-case "I cancelled this myself".
    if (err?.name === "AbortError") return;
    throw err;
  });
  return {
    close: () => controller.abort(),
    done,
  };
}

export function streamProjectAnalysis(
  projectId: string,
  onEvent: (event: AnalysisStreamEvent) => void,
): SseHandle {
  return startSse(`/projects/${projectId}/analyze/stream`, { method: "GET" }, onEvent);
}

export function streamChatMessage(
  projectId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
): SseHandle {
  return startSse(
    "/chat/stream",
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, message }),
    },
    onEvent,
  );
}

export { ApiError };
