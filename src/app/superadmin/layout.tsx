import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { LogoutButton } from "@/components/layout/logout-button";
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import {
  ShieldAlert,
  Building,
  Home,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/superadmin",         label: "Dashboard Globale", Icon: ShieldAlert },
  { href: "/superadmin/tenants",  label: "Gestione Saloni",    Icon: Building },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin({ next: "/superadmin", mode: "notFound" });

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      {/* Radial gradient background in stile superadmin (accento viola/magenta) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(900px 700px at 15% 0%, rgba(139,92,246,0.06), transparent 60%), radial-gradient(700px 500px at 85% 80%, rgba(219,39,119,0.04), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[240px_1fr]">
        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <aside className="flex h-fit flex-col rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur-md md:sticky md:top-6">
          {/* Logo brand */}
          <div className="mb-5 flex items-center gap-3 px-1">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg p-0.5">
              <Image
                src="/logo.png"
                alt="DogWash24 Logo"
                width={56}
                height={56}
                priority
                className="h-full w-full object-contain rounded-xl"
              />
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-violet-500 z-10" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-50">DogWash24</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                Super Admin
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-3 h-px bg-slate-800/60" />

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                iconNode={<item.Icon className="h-4 w-4" />}
              />
            ))}
          </nav>

          {/* Divider */}
          <div className="my-4 h-px bg-slate-800/60" />

          {/* Torna alla app */}
          <Link
            href="/"
            className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 ring-1 ring-inset ring-transparent transition-all hover:bg-slate-800/50 hover:text-slate-300"
          >
            <span>Torna alla app</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          <div className="mt-2">
            <LogoutButton />
          </div>
        </aside>

        {/* ── CONTENT ───────────────────────────────────────── */}
        <main className="relative z-10 flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
