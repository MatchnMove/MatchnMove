"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Mail, Menu } from "lucide-react";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { currentAdminSection, type AdminNavigationActor } from "@/lib/admin-navigation";

export function AdminShell({ actor, children }: { actor: AdminNavigationActor & { name: string }; children: ReactNode }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  if (pathname === "/admin/mfa" || pathname === "/admin/accept-invitation") return children;
  const current = currentAdminSection(pathname, actor);
  return <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to admin content</a>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/admin/recruitment" className="shrink-0 text-lg font-black tracking-tight">Match <span className="text-teal-700">&apos;n</span> Move<span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Administration</span></Link>
        <div className="flex items-center gap-3">
          <Link href="/admin/recruitment/messages?compose=1" className="hidden min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 sm:inline-flex"><Mail size={16} />Write email</Link>
          <div className="hidden text-right lg:block"><p className="text-sm font-semibold">{actor.name}</p><p className="text-xs text-slate-500">{actor.role === "OWNER" ? "Owner" : "Recruitment team"}</p></div>
          <AdminLogoutButton />
        </div>
      </div>
      <details ref={mobileMenu} className="border-t border-slate-100 lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold sm:px-6"><span className="flex items-center gap-2"><Menu size={18} />Menu</span><span className="text-teal-700">{current?.label || "Admin workspace"}</span></summary>
        <div className="max-h-[65vh] overflow-y-auto border-t border-slate-100 p-4"><AdminNavigation actor={actor} onNavigate={() => { if (mobileMenu.current) mobileMenu.current.open = false; }} /></div>
      </details>
    </header>
    <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 lg:flex lg:flex-col">
        <AdminNavigation actor={actor} />
        <Link href="/" className="mt-8 flex items-center gap-2 border-t border-slate-100 px-3 pt-5 text-xs font-semibold text-slate-500 hover:text-teal-700">View public website<ArrowUpRight size={14} /></Link>
      </aside>
      <main id="admin-content" className="min-w-0 p-4 sm:p-6 xl:p-9">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link href="/admin/recruitment" className="hover:text-teal-700">Administration</Link><span aria-hidden="true">/</span><span className="font-semibold text-slate-700">{current?.label || "Workspace"}</span></div>
        {children}
      </main>
    </div>
  </div>;
}
