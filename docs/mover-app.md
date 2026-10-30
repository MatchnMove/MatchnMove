# Match 'n Move business app

The shared entry points are `/login`, `/signup`, `/app` and `/install`. Every unauthenticated entry starts with Moving company and Cleaning company choices. Legacy mover/cleaner login links show the same chooser. `/mover/app` retains the same shared entry for older installed shortcuts, preserving deep links.

Login has company type, email, password and code steps. Sign-up has company type, email, business details and password/consent steps. Choosing a different company type clears credentials and incomplete account data. The selected type determines the existing API endpoints; authenticated server roles determine dashboard access. The shared app sends signed-in movers to `/mover/dashboard` and cleaners to `/cleaner/dashboard`, preserving only destinations permitted for that role. Customer details and lead permissions remain separate.

Both manifests use `lib/mover-app-manifest.ts`. Preserve the existing `/mover/dashboard` installation ID, while the neutral launch URL is `/app` and manifest scope is `/`. The shared root-scoped `/partner-sw.js` supports navigation to both company dashboards. Existing `/mover-sw.js` registrations remain in place for mover push subscriptions. The shared worker caches only the generic offline page and icon; private pages and APIs are never cached.

The app provider is shared across mover and cleaner routes. Browser installation is available before sign-in. An older Home Screen label may need renaming or reinstallation on devices that retain the original name. Movers retain phone notification setup; cleaners receive their own lead emails and access their cleaner dashboard.

Validation: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. `tests/partner-auth-forms.test.ts` exercises both company choices and endpoint selection on web and app. `tests/mover-app-http.test.ts` is opt-in against an isolated loopback database/server with a local SMTP catcher; never point it at production. Physical-device installation and notification delivery require separate real-device testing.
