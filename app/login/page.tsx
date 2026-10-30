import type { Metadata } from "next";
import { PartnerAuth } from "@/components/partner-auth";
export const metadata: Metadata = { title: "Company login", robots: { index: false, follow: false } };
export default function CompanyLoginPage() { return <PartnerAuth />; }
