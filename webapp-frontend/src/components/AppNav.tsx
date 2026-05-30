"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { DashboardIcon, type IconProps, UploadIcon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

// Resumo (/summary) and Chat (/chat) are intentionally NOT here: they are
// project-scoped, not global destinations. The project details view (/summary)
// is reached by opening a project from the Dashboard, and the chat is reached
// from a prominent launcher inside that project view.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/upload", label: "Upload", Icon: UploadIcon },
];

export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-surface-container-highest/60 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" className="press flex items-center gap-2.5" aria-label="Mestre IA">
            <Logo size={32} />
            <span className="type-title-lg text-on-surface">Mestre IA</span>
          </Link>

          <nav className="hidden items-center gap-4 sm:flex">
            {NAV.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={["nav-link flex items-center gap-2 px-1 py-2", active ? "is-active" : ""].join(" ")}
                >
                  <Icon size={18} strokeWidth={2} color="var(--color-primary)" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <AccountMenu />
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-surface-container-highest/60 bg-surface px-2 pb-[env(safe-area-inset-bottom)] shadow-nav sm:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={[
                  "flex items-center justify-center rounded-lg px-4 py-1 transition-colors",
                  active ? "bg-primary text-on-primary" : "text-secondary",
                ].join(" ")}
              >
                <Icon size={22} strokeWidth={2} />
              </span>
              <span
                className={[
                  "type-label-md",
                  active ? "text-on-surface" : "text-secondary",
                ].join(" ")}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
