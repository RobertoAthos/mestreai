import Constants from "expo-constants";

import type {
  AuthResponse,
  ChatMessage,
  GuestQuota,
  LoginRequest,
  Project,
  ProjectListItem,
  SignupRequest,
  UploadResponse,
  User,
} from "@/types/api";

const fallbackBase = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBase || "http://localhost:8000";

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

export { ApiError };
