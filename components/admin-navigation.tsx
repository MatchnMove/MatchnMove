"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChartNoAxesCombined, CheckCheck, ClipboardList, FileSpreadsheet, LayoutDashboard, Mail, Settings, ShieldCheck, Users, LifeBuoy } from "lucide-react";
import { adminNavigationFor, currentAdminSection, type AdminNavigationActor } from "@/lib/admin-navigation";
import { InboxUnreadBadge } from "@/components/partner-inbox-summary";

const icons = {
  overview: LayoutDashboard, companies: Building2, email: Mail, tasks: ClipboardList,
  leads: CheckCheck, reports: ChartNoAxesCombined, verification: ShieldCheck,
  support: LifeBuoy, sheets: FileSpreadsheet, team: Users, settings: Settings,
};

export function AdminNavigation({ actor, onNavigate }: { actor: AdminNavigationActor; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = currentAdminSection(pathname, actor);
  return (
    <nav aria-label="Administration" className="space-y-6">
      {adminNavigationFor(actor).map(group => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
          <div className="space-y-1">
            {group.items.map(item => {
              const Icon = icons[item.icon as keyof typeof icons];
              const selected = active?.href === item.href;
              return <Link key={item.href} href={item.href} onClick={onNavigate}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${selected ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                <Icon size={18} aria-hidden="true" className="shrink-0" />{item.label}
                {item.href === "/admin/inbox" && <InboxUnreadBadge />}
              </Link>;
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
