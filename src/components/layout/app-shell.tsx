import * as React from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LogoutButton } from "@/components/layout/logout-button";
import { DevSwCleanup } from "@/components/dev/dev-sw-cleanup";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <DevSwCleanup />
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-300">Toilettatura</p>
            <h1 className="text-base font-semibold tracking-tight">Self-Service</h1>
          </div>
          <LogoutButton />
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pb-24 pt-6">{children}</main>

      <BottomNav />
    </div>
  );
}
