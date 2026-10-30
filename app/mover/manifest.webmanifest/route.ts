import { moverAppManifest } from "@/lib/mover-app-manifest";

export function GET() {
  return Response.json(moverAppManifest(), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } });
}
