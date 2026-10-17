# Vercel: four HITS subdomains

Use ONE Vercel project for all four domains. The existing proxy.ts selects the screen from its hostname.

## Project settings

- Framework: Next.js.
- Root Directory: hits-launch if your repository contains this folder; otherwise the repository root.
- Build Command: npm run build:next (the default npm run build also packages the separate Sites deployment).
- Output Directory: leave the Next.js default.
- Environment Variables / Production: EVENT_BASE_DOMAIN=seladevs.my.
- Environment Variables / Production: ORGANISER_KEY=a private organiser password. Never use a NEXT_PUBLIC_ name for this secret.
- Redeploy after environment changes. The local .dev.vars file is intentionally not deployed.

## Domains and DNS

In this project's Settings > Domains, add each hostname individually and connect it to Production. Do not redirect them to the main hostname.

| Hostname | Screen | DNS record name | Type |
| --- | --- | --- | --- |
| hitsmainpanel.seladevs.my | Main/VIP stage | hitsmainpanel | CNAME |
| qr.seladevs.my | QR presentation | qr | CNAME |
| audience.seladevs.my | Audience activation | audience | CNAME |
| bypass.seladevs.my | Organiser controls | bypass | CNAME |

At the DNS provider hosting seladevs.my, use the exact CNAME target Vercel displays for each domain. Do not paste an https:// URL or a page path into a DNS value. If DNS is managed in Vercel, follow its automatic DNS prompt instead. Remove conflicting records only at these four specific names; keep unrelated website and email records. Add a verification TXT record if Vercel requests one.

Return to Vercel and wait for Valid Configuration and HTTPS on all four names. Open each URL directly and confirm the intended screen. The QR should link to https://audience.seladevs.my/.

Official guide: https://vercel.com/docs/domains/working-with-domains/add-a-domain

## Shared Supabase database (required on Vercel)

Follow SUPABASE-SETUP.md. The Vercel Node API now uses Supabase whenever configured and refuses local SQLite on Vercel. All four subdomains must use this same Vercel project and the same Supabase project. The browser calls its own /api/event; server-only RPC calls share one event row with atomic mutations.

The schema migration and adapter are implemented and tested locally. You still need to create the Supabase project, run the SQL migration, add its server credentials to Vercel, and redeploy. No live cloud database has been created or connected by this change.

## Placeholder video

public/media/hits-placeholder.mp4 is a local 12-second, silent, 1280x720 H.264 rehearsal film. The main panel preloads it and plays it after the launch transitions whenever Continuity Video is empty. The existing play-recovery button handles browser autoplay restrictions.

To use the final video, put an MP4 in public/media and save its /media/filename.mp4 path in Bypass > Continuity Video, or provide a direct HTTPS MP4 URL. Redeploy to publish new local video assets.

After the database is connected, rehearse with two devices: activate on audience, check both progress columns, complete the target, enter the VIP code, then confirm the transition and video handoff. Reset only the rehearsal event afterward.
