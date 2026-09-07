import Link from "next/link";

type AdminArea = "quote-flow" | "verification" | "leads";

const links: Array<{ id: AdminArea; href: string; label: string }> = [
  { id: "quote-flow", href: "/admin/quote-flow", label: "Quote flow" },
  { id: "verification", href: "/admin/verification", label: "Mover verification" },
  { id: "leads", href: "/admin/leads", label: "Google Sheets" },
];

export function AdminNavigation({ current }: { current: AdminArea }) {
  return (
    <nav aria-label="Admin sections" className="flex max-w-full gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active = link.id === current;

        return (
          <Link
            key={link.id}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-bold transition ${
              active
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
