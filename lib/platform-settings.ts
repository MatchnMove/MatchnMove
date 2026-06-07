import { prisma } from "@/lib/db";

export const MOVER_LAUNCH_TRIAL_SETTING_KEY = "mover_launch_trial_enabled";

export type MoverLaunchTrialSetting = {
  enabled: boolean;
};

function parseBooleanSetting(value: string | null | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function getMoverLaunchTrialSetting(): Promise<MoverLaunchTrialSetting> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: MOVER_LAUNCH_TRIAL_SETTING_KEY },
  });

  return {
    enabled: parseBooleanSetting(setting?.value, true),
  };
}

export async function setMoverLaunchTrialSetting(enabled: boolean, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.platformSetting.findUnique({
      where: { key: MOVER_LAUNCH_TRIAL_SETTING_KEY },
    });
    const previous = parseBooleanSetting(current?.value, true);

    const setting = await tx.platformSetting.upsert({
      where: { key: MOVER_LAUNCH_TRIAL_SETTING_KEY },
      update: { value: enabled ? "true" : "false" },
      create: {
        key: MOVER_LAUNCH_TRIAL_SETTING_KEY,
        value: enabled ? "true" : "false",
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "mover_launch_trial_updated",
        meta: {
          previous,
          next: enabled,
        },
      },
    });

    return {
      enabled: parseBooleanSetting(setting.value, true),
    };
  });
}
