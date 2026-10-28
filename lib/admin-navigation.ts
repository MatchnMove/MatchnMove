export type AdminNavigationActor = {
  role: "OWNER" | "RECRUITMENT_ADMIN";
  canViewLeads: boolean;
};

export function adminNavigationFor(actor: AdminNavigationActor) {
  return [
    {
      title: "Mover onboarding",
      items: [
        { href: "/admin/recruitment", label: "Overview", icon: "overview", description: "Your companies, priorities and recent activity." },
        { href: "/admin/recruitment/prospects", label: "Company directory", icon: "companies", description: "Find companies, record contacts and track onboarding." },
        { href: "/admin/recruitment/messages", label: "Email station", icon: "email", description: "Write invitations, review drafts and track sent emails. No lead required." },
        { href: "/admin/recruitment/tasks", label: "Follow-ups", icon: "tasks", description: "Keep track of your next conversation and due dates." },
        ...(actor.canViewLeads ? [{ href: "/admin/recruitment/leads", label: "Lead opportunities", icon: "leads", description: "Prepare invitations around authorised moving requests." }] : []),
        { href: "/admin/recruitment/performance", label: "Reports", icon: "reports", description: "Review recruitment progress and team results." },
      ],
    },
    ...(actor.role === "OWNER" ? [
      {
        title: "Platform operations",
        items: [
          { href: "/admin/quote-flow", label: "Quotes & registered movers", icon: "leads", description: "Track quote assignments, notifications and mover activity." },
          { href: "/admin/verification", label: "Mover verification", icon: "verification", description: "Review business identity and submitted documents." },
          { href: "/admin/cleaners", label: "Cleaning partners", icon: "companies", description: "Manage cleaner coverage, accounts and billing." },
          { href: "/admin/trust", label: "Trust & support", icon: "support", description: "Review support, reviews and customer trust signals." },
          { href: "/admin/leads", label: "Google Sheets register", icon: "sheets", description: "Manage the lead register and spreadsheet delivery." },
        ],
      },
      {
        title: "Team & setup",
        items: [
          { href: "/admin/recruitment/team", label: "Team & access", icon: "team", description: "Invite colleagues and manage their permissions." },
          { href: "/admin/recruitment/settings", label: "Email templates & settings", icon: "settings", description: "Set shared templates, sender details and contact limits." },
        ],
      },
    ] : []),
  ];
}

export function currentAdminSection(pathname: string, actor: AdminNavigationActor) {
  return adminNavigationFor(actor).flatMap(group => group.items).find(item =>
    item.href === "/admin/recruitment"
      ? pathname === item.href || pathname === `${item.href}/dashboard`
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
