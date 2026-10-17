# Connect HITS to Supabase and Vercel

## 1. Create the database

Create a Supabase project in your account. Choose a region close to your event and save its database password privately. Use a dedicated rehearsal project for Preview deployments if you do not want previews to change the live event.

Open SQL Editor, create a new query, paste the entire contents of:

supabase/migrations/20261018_hits_shared_event.sql

Run it once. It creates private tables and one server-only RPC function. Re-running the migration preserves the existing event. It does not require enabling Realtime or making any table public.

## 2. Configure Vercel

Find the project URL and server secret key in Supabase's Connect / API Keys settings. Copy the HTTPS project root URL, not a dashboard URL or database connection string.

In Vercel > the HITS project > Settings > Environment Variables, set these for Production:

| Variable | Value |
| --- | --- |
| SUPABASE_URL | Your Supabase project URL, such as https://YOUR_PROJECT_REF.supabase.co |
| SUPABASE_SECRET_KEY | Supabase server secret key (sb_secret_...) |
| EVENT_BASE_DOMAIN | seladevs.my |
| ORGANISER_KEY | A long private organiser password you choose |

If using the legacy service_role JWT key, set SUPABASE_SERVICE_ROLE_KEY instead of SUPABASE_SECRET_KEY. Never use the anon/publishable key for this server adapter. Never prefix either secret with NEXT_PUBLIC_. Do not paste secrets into source files, chat, or the browser.

Use Next.js, npm run build:next, and the default output directory in Vercel. Redeploy after saving the variables. All four subdomains should point to this ONE Vercel project. Do not assign different databases to different screens.

## What each setting does

- SUPABASE_URL and SUPABASE_SECRET_KEY connect the Vercel server to the shared database.
- EVENT_BASE_DOMAIN makes the app generate your four production screen links, including the audience URL inside the QR code. It is the parent domain only, without https://, a subdomain, or a path. It does not configure DNS. The exact seladevs.my hostnames are also recognised by the router.
- ORGANISER_KEY is your app's backstage password. It is unrelated to your Supabase password or API key. It protects settings, boosts, reset, and VIP launch. Use the same value for all four screens. Changing it invalidates existing organiser sessions.

## 3. Rehearse across devices

1. Open bypass.seladevs.my, sign in, and set a small rehearsal target.
2. Open hitsmainpanel.seladevs.my and use Prepare stage to sign in there too. Organiser cookies intentionally stay on the hostname where you sign in.
3. Open qr.seladevs.my. Scan its code on a phone and activate.
4. Both presentation bars should update on their next poll (roughly every second plus network time); audience screens poll roughly every 2.5 seconds. This uses shared database polling, not Supabase Realtime subscriptions.
5. Repeat on another device. Repeated taps from a browser with its activation cookie count once per event. Clearing cookies or using another browser creates a new audience identity.
6. Complete the target, enter the VIP access code, and confirm both the launch sequence and placeholder video.
7. Reset the rehearsal from bypass before the real event. Reset removes audience activations and rotates the code; it retains the quota and video setting.

Do not run resets against your real event while guests are participating.

## Security and consistency

Tables are in hits_room, have RLS enabled, and have no anonymous/authenticated access. Only service_role may call the fixed-operation RPC. Server authentication remains required for organiser actions. Each activation, boost, unlock, launch, and reset locks the shared event row within a PostgreSQL transaction; simultaneous taps cannot exceed the quota. The service role key never enters client code.

Vercel fails with 503 when database credentials are missing; it never creates a separate local SQLite counter there. Local development without Supabase credentials retains SQLite. A valid Supabase URL/key with a missing migration also returns an unavailable response; run the SQL and check server logs.

Local validation: npm run test:supabase runs the migration and real server handler against disposable embedded PostgreSQL with a simulated HTTP RPC transport. It covers four-host state sharing and the security/control flow, but is not a live Supabase connectivity test.

Official references:
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/api/api-keys

## Sharing a Supabase project with other apps

This app uses the dedicated `hits_room` schema:

- `hits_room.event`
- `hits_room.activations`
- `hits_room.login_attempts`
- Server API function: `public.hits_room_store`

Run the updated migration above. The app has been updated to call this exact function. No changes to the other projects' tables or policies are needed. Keep `hits_room` out of the exposed-schema list; the server calls the restricted function in `public`.

If you already ran the previous `hits_private` / `public.hits_store` query, those objects are left untouched. This revised query starts a separate HITS room; it does not copy an earlier rehearsal's data. Do not delete old objects until you have confirmed nothing uses them.

The schema separates names and app operations, but Supabase's server secret still has project-wide privileges. Store it only in the Vercel server environment.
