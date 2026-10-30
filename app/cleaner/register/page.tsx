import type { Metadata } from "next";
export const metadata: Metadata = { title: "Company sign-up", robots: { index: false, follow: false } };
import { PartnerAuth } from "@/components/partner-auth";
export default function CleanerRegisterPage() { return <PartnerAuth business="cleaner" initialMode="signup" />; }
