import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api, ApiError } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import type { GuestQuota, Project, ProjectListItem } from "@/types/api";

type Status = "idle" | "loading" | "ready" | "error";

interface AppState {
  projects: ProjectListItem[];
  projectsStatus: Status;
  projectsError?: string;
  currentProject: Project | null;
  currentProjectId: string | null;
  quota: GuestQuota | null;

  refreshProjects: () => Promise<void>;
  refreshQuota: () => Promise<void>;
  openProject: (id: string) => Promise<Project | null>;
  setCurrentProject: (id: string | null) => void;
  pollProject: (id: string) => Promise<void>;
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
  const pollingRef = useRef<Set<string>>(new Set());

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

  const pollProject = useCallback(
    async (id: string) => {
      if (pollingRef.current.has(id)) return;
      pollingRef.current.add(id);
      try {
        for (let attempt = 0; attempt < 60; attempt += 1) {
          try {
            const project = await api.getProject(id);
            setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: project.status } : p)));
            if (project.id === currentProjectId) {
              setCurrentProjectState(project);
            }
            if (project.status !== "processing") {
              refreshProjects();
              refreshQuota();
              return;
            }
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } finally {
        pollingRef.current.delete(id);
      }
    },
    [currentProjectId, refreshProjects, refreshQuota],
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
      setProjects([]);
      setProjectsStatus("idle");
      setProjectsError(undefined);
      setCurrentProjectState(null);
      setCurrentProjectIdState(null);
      setQuota(null);
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
      refreshProjects,
      refreshQuota,
      openProject,
      setCurrentProject,
      pollProject,
    }),
    [projects, projectsStatus, projectsError, currentProject, currentProjectId, quota, refreshProjects, refreshQuota, openProject, setCurrentProject, pollProject],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve estar dentro de <AppProvider>");
  return ctx;
}
