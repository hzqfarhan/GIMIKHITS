# HITS × IUIC UTHM — launch experience

An audience-powered launch for Hussein Innovation & Talent Symposium with IUIC, HDSC, Suara Cendekia, SUTERA and UI Festival. Built with **Next.js 16 and Three.js**.

## Four connected screens

| Screen | Local / review route | Planned host |
| --- | --- | --- |
| Main | `/` or `/main` | `hitsmainpanel.seladevs.my` |
| QR | `/qr` | `qr.seladevs.my` |
| Bypass | `/bypass` | `bypass.seladevs.my` |
| Audience | `/audience` | `audience.seladevs.my` |

The older `/activate` and `/control` links remain aliases for audience and bypass. The QR screen opens the audience destination. All four hosts use one shared event database and the same API. The exact seladevs.my hostnames above are recognised; DNS connection remains deferred and no DNS records have been changed. Once connected, set `EVENT_BASE_DOMAIN=seladevs.my` and point all four hosts to this deployment. Local previews retain local links until then. Root requests are routed by hostname. Each host keeps its own secure organiser session; arm the main display separately from signing in to bypass.

The QR screen places a high-contrast code on the left and a Three.js phone on the right. The phone demonstrates the activation confirmation without contributing to the real count. Its energy readout reflects the live event. The central orb uses an extruded silhouette traced from the supplied HITS logo, with a textured plaque fallback. Space Grotesk and Orbitron are hosted locally; their licenses are included under `public/fonts/`.

Enable **Sound on** on the main screen before the VIP arrives. Original synthesised sounds cover incoming activations, keypad touches, verification, assembly, charging, countdown and ignition. Sound can also be muted during the cinematic. Browser autoplay rules require this initial user interaction; final video audio remains controlled by the video itself.

For local host-routing rehearsal, the four `main.localhost`, `qr.localhost`, `bypass.localhost`, and `audience.localhost` names are supported, retaining port 5173. Some systems require these names to be added to local DNS/hosts; the path routes always work. A localhost QR cannot be reached from an audience phone. Use the hosted audience URL at the venue.

## Rehearse

1. Keep `CONTROL-ACCESS.txt` private. It contains the generated organiser key and is excluded from source control. Ignored `.dev.vars` supplies the local secret; production uses `ORGANISER_KEY`.
2. Open `/bypass`, sign in and set the target. The initial target is **100**, in English. Leave the video URL empty for the intentional placeholder.
3. Open the main display and use **Prepare stage** with the organiser key. This arms that browser for 12 hours. Set up focus/fullscreen and sound before the VIP arrives.
4. Put `/qr` on a separate display if needed. Audience phones open `/audience` and contribute once per browser per rehearsal.
5. Use boosts or complete the charge when necessary. When the quota is reached the six-digit code appears. The VIP enters it on the main display using its large on-screen keypad or a physical keyboard.
6. The 22-second launch sequence follows the shared server timestamp: authorisation, 3D assembly, energy charge, a five-second countdown, and the HITS logo reveal. It then plays the final video or holds the branded placeholder. Refreshing resumes the same launch.
7. Reset starts a fresh rehearsal, clears contributions and boosts, and rotates the code while retaining target and video settings.

Contributions survive reloads. Audience requests and boosts enforce the target in atomic database statements. Cookie deduplication limits a browser, not a person: another browser or clearing cookies permits another activation. Audience activations freeze at the target and after launch. Temporary disconnects preserve the last received display state; new activations require the server connection.

## Final video

Put a video in `public/media/` and configure `/media/filename.mp4` in bypass, or use a direct HTTPS MP4 URL. A YouTube page is not a direct video file. A playback button appears if the browser blocks automatic playback. Rehearse the actual video, sound output, display and venue network before the event.

## Genuine Next.js runtime

For a quick local preview on this Windows computer, double-click `START-PREVIEW.cmd` and open `http://localhost:5173`. Keep its window open while rehearsing.

```powershell
npm install
npm run dev
# http://localhost:5173
```

`dev` runs stock `next dev`. The Node API stores its data in ignored `.local/event.sqlite`, using Node 22's built-in SQLite. `EVENT_DB_PATH` can point to a persistent mounted file. `.env.example` documents the deployment settings. Use Node **22.13 or newer**.

```powershell
npm run build:next
npm run start
```

These run stock `next build` and `next start`. Deploy the project to a persistent Node server and provide a writable database path. All four hosts must reach the same Node service/database. A serverless filesystem is not suitable for the SQLite deployment. Private secrets and local data are excluded from build tracing.

## Sites / Cloudflare deployment

The existing Sites platform serves Workers rather than a long-running Node process. `npm run build` therefore creates **both** the real Next.js Node build and a second, official **Next.js static export**. The exported frontend is combined with the same event service running against the existing Cloudflare D1 database. No Vinext runtime is used.

`npm run build:sites` rebuilds only this export and Worker. It stages the frontend without the Node API under ignored `.sites-runtime/next-export`, runs stock `next build` with `output: 'export'`, and writes `dist/client`, `dist/server/index.js`, the Worker configuration and Sites metadata. The Worker serves same-origin `/api/event` and performs the same four-host routing. Node rehearsal data and hosted D1 data are intentionally separate.

```powershell
npm run build:sites
# Apply the existing schema for a fresh local Worker database only:
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dear_iron_lad.sql
npm run preview:sites
# http://localhost:5174
```

The production `ORGANISER_KEY` remains private and must be configured before the stage or bypass can be armed. Set `EVENT_BASE_DOMAIN` as a server environment value when domain mapping is ready. Same-origin mutations reject foreign origins, organiser cookies are HMAC-signed and HttpOnly, and login attempts are rate limited.

The hosted Site retains its existing private-review audience. It needs the intended public access before real audience participation; do not hand the private review QR to the venue audience.

## Verification

Current revision: the production Next.js build and static export compile successfully. The Node and Worker versions each pass 51 HTTP rehearsal checks and 26 page, subdomain and asset checks; the routing helper passes 48 checks, including the exact seladevs.my hostnames. Browser visual verification is outstanding because local browser control is disabled in Work settings. Publishing this revision is blocked because the connected Sites service returns `project_not_found` for the existing project; the earlier hosted URL does not contain these local updates.

`npm run check` checks TypeScript. `npm run test:rehearsal` tests the real local HTTP API, including concurrent quota enforcement, deduplication, pause, authorised controls, wrong-code rejection, launch freeze, reset and foreign-origin rejection. It only permits loopback origins and leaves a fresh 100-activation rehearsal. Pass `http://localhost:5174` to test the Worker API. `node scripts/check-routing.mjs` verifies four-host URL mapping.

Original logo assets are retained in `../LOGOS`; served copies are in `public/logos`.
