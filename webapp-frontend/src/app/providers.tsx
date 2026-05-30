"use client";

import type { ReactNode } from "react";

import { AppProvider } from "@/store/AppContext";
import { AuthProvider } from "@/store/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}
