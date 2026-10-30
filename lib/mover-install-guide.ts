import type { InstallPlatform } from "@/lib/mover-app-client";

export const moverInstallGuides: Record<InstallPlatform, Array<{ title: string; text: string }>> = {
  ios: [
    { title: "Open the mover app link in Safari", text: "Go to www.matchnmove.co.nz/mover/app. If you opened the link inside Gmail or another app, use its menu to open it in Safari." },
    { title: "Choose Add to Home Screen", text: "Tap Share (the square with an upward arrow). Depending on your Safari layout, open the page menu first. Scroll down and tap Add to Home Screen. If missing, look under Edit Actions." },
    { title: "Add the mover app", text: "If Open as Web App is shown, leave it on. Tap Add, then open the new Match Movers icon on your Home Screen." },
    { title: "Log in and turn on alerts", text: "Use your existing mover account. Enter the emailed sign-in code if asked. In the dashboard, tap Enable notifications, then Allow. Tap Send test notification to check this device. iPhone/iPad alerts require iOS/iPadOS 16.4 or later." },
  ],
  android: [
    { title: "Open the mover app link in Chrome", text: "Go to www.matchnmove.co.nz/mover/app in Chrome. Open it in Chrome rather than inside Gmail, Facebook or another app." },
    { title: "Install Match Movers", text: "Tap Install mover app if offered. Otherwise open Chrome's three-dot menu, then Install and create shortcut → Install. Some versions call this Install app or Add to Home screen; choose Install when available." },
    { title: "Open and log in", text: "Open Match Movers from your Home Screen or apps. Use your existing mover email and password. Enter the emailed sign-in code if asked. Do not create another account." },
    { title: "Turn on alerts", text: "In the dashboard, tap Enable notifications, then Allow. Tap Send test notification and check it arrives. If alerts are blocked, allow them in Android's app/browser notification settings." },
  ],
  desktop: [
    { title: "Open the mover app link", text: "Go to www.matchnmove.co.nz/mover/app in Chrome or Edge." },
    { title: "Install the mover app", text: "Use Install mover app if offered, or your browser's install icon/menu. In Safari on a supported Mac, use File → Add to Dock." },
    { title: "Use your existing account", text: "Open Match Movers from your apps, Dock or taskbar. Log in with your mover account and enable notifications if you want alerts on this computer." },
  ],
};
