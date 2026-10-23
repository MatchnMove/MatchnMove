import { isSameOriginPushRequest } from "@/lib/mover-push-policy";

export function isRecruitmentMutationRequest(request: {
  headers: Headers;
  nextUrl: { protocol: string };
}) {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol.replace(":", "");
  return (
    isSameOriginPushRequest(request.headers.get("origin"), host, protocol) &&
    Boolean(
      request.headers.get("content-type")?.includes("application/json"),
    ) &&
    Number(request.headers.get("content-length") || 0) <= 64000
  );
}
