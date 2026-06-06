import { processEmailQueue } from "@/lib/email";
import { processLeadLifecycle } from "@/lib/lead-lifecycle";
import { processDocumentExpiry } from "@/lib/document-expiry";

type BackgroundJobState = {
  started: boolean;
  running: boolean;
  timer?: NodeJS.Timeout;
};

const globalForBackgroundJobs = globalThis as typeof globalThis & {
  matchnMoveBackgroundJobs?: BackgroundJobState;
};

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_PROCESS_LIMIT = 50;

function getBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return null;
}

function getNumberEnv(name: string, fallback: number, minimum: number) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.floor(parsed), minimum);
}

function shouldRunBackgroundJobs() {
  const explicit = getBooleanEnv("BACKGROUND_JOBS_ENABLED");
  if (explicit !== null) return explicit;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  if (process.env.NODE_ENV === "test") return false;
  return process.env.NODE_ENV === "production";
}

async function runBackgroundJobTick(state: BackgroundJobState) {
  if (state.running) return;
  state.running = true;

  try {
    const limit = getNumberEnv("BACKGROUND_JOBS_PROCESS_LIMIT", DEFAULT_PROCESS_LIMIT, 1);
    const [email, leads, documents] = await Promise.all([
      processEmailQueue(limit),
      processLeadLifecycle(limit),
      processDocumentExpiry(limit),
    ]);

    if (email.processed || leads.warnings.claimed || leads.expirations.checked || documents.checked) {
      console.log("background jobs processed", {
        email: {
          processed: email.processed,
          sent: email.sent,
          failed: email.failed,
        },
        leads: {
          warningsClaimed: leads.warnings.claimed,
          warningsSent: leads.warnings.sent,
          expirationsChecked: leads.expirations.checked,
          redistributed: leads.expirations.redistributed,
        },
        documents,
      });
    }
  } catch (error) {
    console.error("background jobs failed", error);
  } finally {
    state.running = false;
  }
}

export function startBackgroundJobs() {
  if (!shouldRunBackgroundJobs()) return;

  const state = globalForBackgroundJobs.matchnMoveBackgroundJobs ?? {
    started: false,
    running: false,
  };
  globalForBackgroundJobs.matchnMoveBackgroundJobs = state;

  if (state.started) return;

  state.started = true;
  const intervalMs = getNumberEnv("BACKGROUND_JOBS_INTERVAL_MS", DEFAULT_INTERVAL_MS, 15_000);
  state.timer = setInterval(() => {
    void runBackgroundJobTick(state);
  }, intervalMs);
  state.timer.unref?.();

  setTimeout(() => {
    void runBackgroundJobTick(state);
  }, 5_000).unref?.();
}
