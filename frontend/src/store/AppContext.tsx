import AsyncStorage from "@react-native-async-storage/async-storage";
import { jsonrepair } from "jsonrepair";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api, ApiError, streamProjectAnalysis, type SseHandle } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import type { GuestQuota, Project, ProjectListItem, ProjectSummary } from "@/types/api";

type Status = "idle" | "loading" | "ready" | "error";

interface AppState {
  projects: ProjectListItem[];
  projectsStatus: Status;
  projectsError?: string;
  currentProject: Project | null;
  currentProjectId: string | null;
  quota: GuestQuota | null;
  /** Live streaming buffer for the analysis in progress, parsed best-effort
   *  from partial JSON. Null when no stream is running. */
  partialSummary: ProjectSummary | null;
  /** True while the SSE connection for the current project is open. */
  isStreaming: boolean;

  refreshProjects: () => Promise<void>;
  refreshQuota: () => Promise<void>;
  openProject: (id: string) => Promise<Project | null>;
  setCurrentProject: (id: string | null) => void;
  streamProject: (id: string) => void;
  deleteProject: (id: string) => Promise<void>;
}

function tryRepairSummary(buffer: string): ProjectSummary | null {
  if (buffer.length < 8) return null;
  try {
    const repaired = jsonrepair(buffer);
    const parsed = JSON.parse(repaired);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      doors: Array.isArray(parsed.doors) ? parsed.doors : [],
      windows: Array.isArray(parsed.windows) ? parsed.windows : [],
      walls: Array.isArray(parsed.walls) ? parsed.walls : [],
      execution_checklist: Array.isArray(parsed.execution_checklist)
        ? parsed.execution_checklist.filter((x: unknown) => typeof x === "string")
        : [],
      general_notes:
        typeof parsed.general_notes === "string" ? parsed.general_notes : null,
    };
  } catch {
    return null;
  }
}

const CURRENT_PROJECT_KEY = "mestreai:currentProjectId";

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectsStatus, setProjectsStatus] = useState<Status>("idle");
  const [projectsError, setProjectsError] = useState<string | undefined>(undefined);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [quota, setQuota] = useState<GuestQuota | null>(null);
  const [partialSummary, setPartialSummary] = useState<ProjectSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<{ id: string; handle: SseHandle } | null>(null);

  const refreshProjects = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    setProjectsStatus((prev) => (prev === "ready" ? prev : "loading"));
    try {
      const data = await api.listProjects();
      setProjects(data);
      setProjectsStatus("ready");
      setProjectsError(undefined);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível carregar os projetos.";
      setProjectsError(message);
      setProjectsStatus("error");
    }
  }, [authStatus]);

  const refreshQuota = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    try {
      setQuota(await api.getQuota());
    } catch {
      // Non-critical; UI falls back to defaults.
    }
  }, [authStatus]);

  const openProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const project = await api.getProject(id);
      setCurrentProjectState(project);
      setCurrentProjectIdState(project.id);
      AsyncStorage.setItem(CURRENT_PROJECT_KEY, project.id).catch(() => {});
      return project;
    } catch {
      return null;
    }
  }, []);

  const setCurrentProject = useCallback(
    (id: string | null) => {
      setCurrentProjectIdState(id);
      if (id) {
        AsyncStorage.setItem(CURRENT_PROJECT_KEY, id).catch(() => {});
        openProject(id);
      } else {
        setCurrentProjectState(null);
        AsyncStorage.removeItem(CURRENT_PROJECT_KEY).catch(() => {});
      }
    },
    [openProject],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await api.deleteProject(id);
      // Tear down any open analysis stream for this project before clearing
      // it from state so onEvent callbacks don't resurrect the row.
      if (streamRef.current?.id === id) {
        streamRef.current.handle.close();
        streamRef.current = null;
        setIsStreaming(false);
        setPartialSummary(null);
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setCurrentProjectIdState((prev) => (prev === id ? null : prev));
      setCurrentProjectState((prev) => (prev?.id === id ? null : prev));
      AsyncStorage.getItem(CURRENT_PROJECT_KEY).then((stored) => {
        if (stored === id) AsyncStorage.removeItem(CURRENT_PROJECT_KEY).catch(() => {});
      });
      refreshQuota();
    },
    [refreshQuota],
  );

  const streamProject = useCallback(
    (id: string) => {
      // Idempotent: a second call for the same project reuses the open SSE.
      // Switching projects mid-stream tears the old one down.
      if (streamRef.current?.id === id) return;
      if (streamRef.current) {
        streamRef.current.handle.close();
        streamRef.current = null;
      }

      let buffer = "";
      let lastRepairAt = 0;
      setPartialSummary(null);
      setIsStreaming(true);

      const handle = streamProjectAnalysis(id, (event) => {
        if (event.type === "status") {
          setCurrentProjectState((prev) =>
            prev?.id === event.project.id ? { ...prev, ...event.project } : event.project,
          );
          setProjects((prev) =>
            prev.map((p) => (p.id === event.project.id ? { ...p, status: event.project.status } : p)),
          );
          if (event.project.status !== "processing") {
            // Stream may have closed events coming; nothing else to render.
            setIsStreaming(false);
          }
        } else if (event.type === "token") {
          buffer += event.delta;
          // Repair-parse at most ~6x/sec so we don't burn CPU on every chunk.
          const now = Date.now();
          if (now - lastRepairAt > 150) {
            lastRepairAt = now;
            const repaired = tryRepairSummary(buffer);
            if (repaired) setPartialSummary(repaired);
          }
        } else if (event.type === "done") {
          setPartialSummary(event.summary);
          setCurrentProjectState((prev) =>
            prev?.id === id
              ? { ...prev, status: "ready", summary: event.summary, error: null }
              : prev,
          );
          setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: "ready" } : p)));
          setIsStreaming(false);
          refreshProjects();
          refreshQuota();
        } else if (event.type === "error") {
          setCurrentProjectState((prev) =>
            prev?.id === id ? { ...prev, status: "failed", error: event.message } : prev,
          );
          setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed" } : p)));
          setIsStreaming(false);
          refreshProjects();
        } else if (event.type === "closed") {
          setIsStreaming(false);
        }
      });

      streamRef.current = { id, handle };
      handle.done.finally(() => {
        setIsStreaming(false);
        if (streamRef.current?.id === id) streamRef.current = null;
      });
    },
    [refreshProjects, refreshQuota],
  );

  // Boot/reset when auth changes. Logging out clears the cached state so
  // the next user doesn't briefly see the previous user's projects.
  useEffect(() => {
    if (authStatus === "authenticated") {
      (async () => {
        const stored = await AsyncStorage.getItem(CURRENT_PROJECT_KEY);
        await refreshProjects();
        await refreshQuota();
        if (stored) openProject(stored).catch(() => {});
      })();
    } else if (authStatus === "anonymous") {
      if (streamRef.current) {
        streamRef.current.handle.close();
        streamRef.current = null;
      }
      setProjects([]);
      setProjectsStatus("idle");
      setProjectsError(undefined);
      setCurrentProjectState(null);
      setCurrentProjectIdState(null);
      setQuota(null);
      setPartialSummary(null);
      setIsStreaming(false);
      AsyncStorage.removeItem(CURRENT_PROJECT_KEY).catch(() => {});
    }
  }, [authStatus, user?.id, openProject, refreshProjects, refreshQuota]);

  const value = useMemo<AppState>(
    () => ({
      projects,
      projectsStatus,
      projectsError,
      currentProject,
      currentProjectId,
      quota,
      partialSummary,
      isStreaming,
      refreshProjects,
      refreshQuota,
      openProject,
      setCurrentProject,
      streamProject,
      deleteProject,
    }),
    [
      projects,
      projectsStatus,
      projectsError,
      currentProject,
      currentProjectId,
      quota,
      partialSummary,
      isStreaming,
      refreshProjects,
      refreshQuota,
      openProject,
      setCurrentProject,
      streamProject,
      deleteProject,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve estar dentro de <AppProvider>");
  return ctx;
}
