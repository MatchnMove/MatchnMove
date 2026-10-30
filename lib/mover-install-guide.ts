import type { InstallPlatform } from "@/lib/mover-app-client";

export const moverInstallGuides: Record<InstallPlatform, Array<{ title: string; text: string }>> = {
  ios: [
    { title: "Open the business app link in Safari", text: "Go to www.matchnmove.co.nz/app. If you opened the link inside Gmail or another app, use its menu to open it in Safari." },
    { title: "Choose Add to Home Screen", text: "Tap Share (the square with an upward arrow). Depending on your Safari layout, open the page menu first. Scroll down and tap Add to Home Screen. If missing, look under Edit Actions." },
    { title: "Add the business app", text: "If Open as Web App is shown, leave it on. Tap Add, then open the new Match 'n Move icon on your Home Screen." },
    { title: "Log in and turn on alerts", text: "Choose Moving company or Cleaning company and use your existing account. Enter the emailed sign-in code if asked. Check Leads in your dashboard and your email alerts. Movers can also enable phone notifications and send a test alert. iPhone/iPad phone alerts require iOS/iPadOS 16.4 or later." },
  ],
  android: [
    { title: "Open the business app link in Chrome", text: "Go to www.matchnmove.co.nz/app in Chrome. Open it in Chrome rather than inside Gmail, Facebook or another app." },
    { title: "Install Match 'n Move", text: "Tap Install business app if offered. Otherwise open Chrome's three-dot menu, then Install and create shortcut → Install. Some versions call this Install app or Add to Home screen; choose Install when available." },
    { title: "Open and log in", text: "Open Match 'n Move from your Home Screen or apps. Choose Moving company or Cleaning company, then use your existing company email and password. Enter the emailed sign-in code if asked. Do not create another account." },
    { title: "Turn on alerts", text: "Check Leads in your dashboard and your email alerts. Movers can also enable phone notifications and send a test alert." },
  ],
  desktop: [
    { title: "Open the business app link", text: "Go to www.matchnmove.co.nz/app in Chrome or Edge." },
    { title: "Install the business app", text: "Use Install business app if offered, or your browser's install icon/menu. In Safari on a supported Mac, use File → Add to Dock." },
    { title: "Use your existing account", text: "Open Match 'n Move from your apps, Dock or taskbar. Choose your company type and log in with your existing account to check your leads." },
  ],
};
