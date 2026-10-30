import { MoverLogin } from "@/components/mover-login";
export default async function MoverLoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const params = await searchParams;
  return <MoverLogin initialMode={params.mode === "signup" && !params.next ? "signup" : "login"} />;
}
