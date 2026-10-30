# Mover app installation

Send existing movers to `/mover/app` to sign in and install, or `/mover/install` for device-specific instructions. Existing accounts must not register again. The installed app opens the mover dashboard when signed in and the dedicated mover login otherwise. The public website remains available in normal browser tabs.

Both `/manifest.webmanifest` (automatically emitted by Next metadata) and `/mover/manifest.webmanifest` use `lib/mover-app-manifest.ts`. Keep the stable `/mover/dashboard` app ID when changing the launch URL. The start URL is `/mover/app`, scope is `/mover/`, and display mode is standalone. Old public-homepage installations redirect to the mover app when opened standalone; stale browser shortcuts may need removal and reinstallation.

`MoverAppProvider` registers the scoped service worker before authentication and captures the install prompt across mover routes. iPhone/iPad installation uses Safari's Share menu. Home Screen web push requires iOS/iPadOS 16.4 or later. Notifications require an explicit user action and permission; installation alone does not subscribe a device. The dashboard includes Enable notifications and Send test notification.

The service worker caches only the static offline page and icon. It never stores authenticated pages, API responses, customer contact information or lead data. Lead access requires a connection. Logout removes the push subscription before clearing the session. Notification deep links return through mover login and preserve the dashboard destination.

## Validation

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- `tests/mover-app-installation.test.ts` checks manifest identity/icons, safe dashboard redirects, worker activation failures and the static-only cache boundary.
- `tests/mover-app-http.test.ts` is opt-in. Set `MOVER_APP_TEST_BASE_URL` and `MOVER_APP_TEST_DATABASE_URL` to an isolated local server/database. The server and test process must use the same database and test secrets, with SMTP at `127.0.0.1:3112`, fake SMTP credentials, and background jobs disabled. The test refuses non-loopback targets and receives email in its local mail catcher. It exercises public installation, an existing account's password/code login, protected dashboard access and logout. Never point it at production.
- Physical iPhone/Android installation and receipt of a device notification require a real supported device; automated HTTP checks do not establish those outcomes.
