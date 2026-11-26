# Public demo: how it works

This note walks through the change that lets anyone open the hosted app without an account.

## The problem

Every screen except `/login` needs a signed-in student, and sign-in goes through Supabase Auth. An interviewer opening the link would have to create a UMN-style account first. Most won't.

## The fix, file by file

1. **`src/services/demoSession.ts` (new).** It holds the demo persona (Sophia Rodriguez, the student the mock data was written for) and four functions:
   - `start()` saves the persona to `localStorage` and returns an `AuthSession`, the same shape a real sign-in returns.
   - `restore()` reads it back after a page reload.
   - `update()` applies profile edits (onboarding answers, language, "tour done") to the saved copy.
   - `end()` deletes it.

   The persona has `onboardedAt` set, so the visitor lands on the dashboard rather than the onboarding form, and `touredAt` unset, so the dashboard tour runs once.
2. **`src/context/AuthContext.tsx`.** On load, it checks for a saved demo session before asking Supabase. `updateProfile` writes to the demo store when the user is the demo student, and to the `profiles` table otherwise. `logout` clears both. It also exposes `startDemo()` and `isDemo`.
3. **`src/screens/LoginScreen.tsx`.** Adds the **Try the demo** button, which calls `startDemo()`. The router already redirects signed-in users from `/login` to `/`, so no navigation code was needed.
4. **`src/screens/AccountScreen.tsx`.** Shows "Exit demo" in place of "Sign out" while in the demo.
5. **`wrangler.jsonc`.** Names the Cloudflare Worker. The Lovable Vite preset already builds for Cloudflare through Nitro, so hosting needed config, not code.

## Why it was built this way

- **No backend changes.** The demo never touches Supabase, so visitors can't create junk accounts or read real profiles.
- **The rest of the app doesn't know about the demo.** Every screen still reads `useAuth()`. The demo plugs in at the session layer, the same seam a real UMN SSO login would use.
- **It's safe on a public URL.** Goldy falls back to the offline assistant when `ANTHROPIC_API_KEY` is unset, so a public link can't run up a bill.

## How it was checked

- `bun run build` succeeds, and `wrangler deploy --dry-run` reports a 557 KiB gzipped Worker, under the 3 MB free-plan limit.
- The build ran under `wrangler dev` (the real Workers runtime), and a headless browser at phone size ran through the flow:
  1. Opened `/login` and tapped Try the demo.
  2. Landed on Sophia's dashboard with the tour.
  3. Tapped "Not now" and reloaded. Still signed in, and the tour stayed dismissed.
  4. Asked Goldy "What is due this week?" and got an offline answer.
  5. Tapped Exit demo and returned to `/login`.

  No page errors appeared.
- `tsc --noEmit` passes. `eslint` shows 0 errors; its 7 warnings were already there.
