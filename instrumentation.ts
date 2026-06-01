export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { startBackgroundJobs } = await import("@/lib/background-jobs");
  startBackgroundJobs();
}
