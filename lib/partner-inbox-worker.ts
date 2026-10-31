import { bridgeRecruitmentMessages } from "@/lib/partner-inbox-outgoing";
import { syncPartnerInbox } from "@/lib/partner-inbox-sync";

type State = { running: boolean; timer?: NodeJS.Timeout };
const globalInbox = globalThis as typeof globalThis & {
  partnerInboxWorker?: State;
};

// Separate from the lead lifecycle tick: mailbox imports never hold up customer jobs.
export function startPartnerInboxWorker() {
  if (globalInbox.partnerInboxWorker) return;
  const state: State = { running: false };
  globalInbox.partnerInboxWorker = state;
  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      await bridgeRecruitmentMessages();
      await syncPartnerInbox();
    } catch {
      console.error("Partner inbox worker failed; the next tick will retry.");
    } finally {
      state.running = false;
    }
  };
  state.timer = setInterval(() => {
    void tick();
  }, 60000);
  state.timer.unref?.();
  setTimeout(() => {
    void tick();
  }, 10000).unref?.();
}
