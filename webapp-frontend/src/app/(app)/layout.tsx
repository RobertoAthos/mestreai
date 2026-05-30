"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppNav } from "@/components/AppNav";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/store/AuthContext";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-secondary">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />
      {/* Bottom padding leaves room for the mobile tab bar. */}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pb-12">{children}</main>
    </div>
  );
}
