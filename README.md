# HITS × IUIC UTHM — launch experience

An audience-powered stage launch for Hussein Innovation & Talent Symposium, featuring IUIC, HDSC, Suara Cendekia, SUTERA, and UI Festival.

## Three connected screens

| Route | Purpose |
| --- | --- |
| `/` | Projected stage and VIP code entry |
| `/activate` | Mobile audience activation |
| `/control` | Protected organiser controls |

The initial target is **100**, in English. Each browser can contribute once per rehearsal. The organiser can change the target, add a capped boost, pause participation, or complete the charge. Contributions are stored centrally in D1 and survive reloads. The stage polls every 1.2 seconds; audience phones poll every 3 seconds. Cookie deduplication limits a browser, not a real person: clearing cookies or using another browser allows a new activation.

After the target is reached, a six-digit code appears. Only a browser armed with the organiser key can submit the correct code and start the sequence. Authorisation, ignition and countdown run for ten seconds, followed by the continuity video or the labelled placeholder. Audience activations freeze once the charge is complete. The sequence uses a server timestamp so an already-running launch resumes at the appropriate point after reloading.

## Rehearse

1. Keep `CONTROL-ACCESS.txt` private. It contains the generated organiser key and is excluded from source control. The local secret is in ignored `.dev.vars`; production uses the corresponding Sites secret.
2. Open `/control` and sign in. Set the target and leave the video field empty to use the placeholder.
3. On the stage computer, open `/` and choose **Prepare stage**. Enter the same key. This authorises that browser for 12 hours.
4. Enable sound if desired and choose **Focus mode**. Use a 1920 × 1080 or larger stage display where possible. The layout also adapts to tablets and phones.
5. Scan the QR from another device, then activate. A local `localhost` QR is only accessible on the same computer; use the hosted audience URL for actual phones.
6. Use organiser boosts or **Complete charge** if needed. Enter the displayed code on the stage computer to launch.
7. **Reset the experience** starts a new rehearsal, clears contributions and boosts, and rotates the code. It keeps the target and video settings.

If automatic video playback is blocked, a **Play continuity video** button appears. A failed video shows a recovery message. Test the final video, sound system, browser and venue network before the event. The last received state is retained during a temporary connection loss, but new audience activations need the server connection.

## Final video

Place a video under `public/media/` and set its `/media/filename.mp4` path in the control room, or supply a direct HTTPS MP4 URL. A YouTube page link is not a direct video file. No video has been supplied yet; the placeholder is intentional. Large event videos are better hosted as a direct file on a suitable CDN. Test audio playback on the actual stage browser.

## Runtime and development

React App Router components use the Next.js application structure. The supplied Sites hosting adapter runs them with **Vinext**, a Next.js-compatible runtime, on Cloudflare Workers. This is not a stock Next.js Node server deployment. Three.js renders the core and qrcode generates the QR locally; there is no third-party QR API. Google Fonts are optional and have system-font fallbacks.

```powershell
npm install
npm run build
# First local database setup, after building:
$env:CLOUDFLARE_CF_FETCH_ENABLED='false'
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dear_iron_lad.sql
npm run dev
```

The preview uses port 5173. `node node_modules/typescript/bin/tsc --noEmit` checks types. `node scripts/check-rehearsal.mjs` exercises the actual HTTP API against a local server, including concurrent activations. It deliberately resets only a loopback development database and leaves a fresh target of 100.

The production `ORGANISER_KEY` secret must be set before stage authorisation or organiser sign-in will work. It has already been configured for the private preview. API mutations reject cross-origin requests, operator sessions are signed and HttpOnly, and login attempts are rate-limited. The audience route intentionally requires no separate account in the application; the hosting platform's current access policy still applies.

## Hosting and domains

The first hosted version is a **private review site**, not an open audience deployment. Before the live event, configure the intended public access and map your domain. The planned host names are `stage.your-domain`, `audience.your-domain`, and `control.your-domain`; domain setup was deferred at the owner's request. They must connect to the same server and D1 database. Configure host-based routing and the QR audience URL when the actual domain is provided. No DNS settings have been changed.

Original logo files are retained in `../LOGOS`; served copies are under `public/logos`.
