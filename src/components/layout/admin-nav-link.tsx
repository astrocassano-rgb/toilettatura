"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface AdminNavLinkProps {
  href: string;
  label: string;
  iconNode: React.ReactNode;
}

export function AdminNavLink({ href, label, iconNode }: AdminNavLinkProps) {
  const pathname = usePathname() ?? "";
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href as any}
      className={`
        flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium
        transition-all duration-150
        ${isActive
          ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-inset ring-cyan-500/30 shadow-sm"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 ring-1 ring-inset ring-transparent"
        }
      `}
    >
      <div className={`flex shrink-0 items-center justify-center ${isActive ? "text-cyan-400" : "text-slate-500"}`}>
        {iconNode}
      </div>
      {label}
    </Link>
  );
}
