import type { Metadata } from "next";
import { PartnerAuth } from "@/components/partner-auth";
export const metadata: Metadata = { title: "Company sign-up", robots: { index: false, follow: false } };
export default function CompanySignupPage() { return <PartnerAuth initialMode="signup" />; }
