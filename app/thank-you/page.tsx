import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function ThankYouPage() {
  return <SiteShell><section className="bg-slateBlue text-white"><div className="container-shell py-20 text-center"><h1 className="text-5xl font-bold">Thank you for submitting your quote!</h1><p className="mt-6 text-2xl max-w-3xl mx-auto">We’ve received your details and will send you free, no-obligation moving quotes from trusted local moving companies shortly!</p><div className="mt-8 flex justify-center gap-4"><Link className="bg-accentOrange px-8 py-3 rounded" href="/contact">Contact us</Link><Link className="underline text-2xl" href="/">Back to home</Link></div></div></section></SiteShell>;
}
