import type { Metadata } from "next";
export const metadata: Metadata = { title: "Company login", robots: { index: false, follow: false } };
import { PartnerAuth } from "@/components/partner-auth";
export default function CleanerLoginPage() { return <PartnerAuth business="cleaner" />; }
