export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const fromForwarded = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return fromForwarded || request.headers.get("x-real-ip") || "unknown";
}
