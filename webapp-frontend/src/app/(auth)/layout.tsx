"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/store/AuthContext";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest text-secondary">
        <Spinner size={28} />
      </div>
    );
  }

  return <main className="min-h-screen bg-surface-container-lowest">{children}</main>;
}
