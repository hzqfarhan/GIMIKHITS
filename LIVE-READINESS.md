# Live readiness

Run `npm run test:stress` for the isolated HTTP/event-service load test. It creates
a temporary SQLite database, uses a random loopback port and never connects to
the configured event database. A failed request, p95 latency above two seconds,
quota overshoot, privacy regression or launch-state regression fails the run.

The initial local run completed 7,000 HTTP requests with no failures, up to 100
concurrent requests, and a worst scenario p95 of 74 ms. These are local service
measurements, not a claim about simultaneous attendees or hosting capacity.
The replay scenario makes two HTTP requests per iteration.

Run `npm run test:supabase` to exercise the production PostgreSQL migration and
RPC adapter in embedded PostgreSQL. This checks SQL behavior and access rules;
it does not measure remote Supabase latency, connection limits or service tiers.

Before the live event, test a separate staging deployment with the same hosting
and database configuration as production. Set the load from the confirmed
attendance and expected arrival burst. Measure p95 latency, errors, database CPU,
CDN cache hits and activation accuracy. Do not reset or stress the real live event.

On the actual projector laptop, use a production build and rehearse the entire
code submission, graphics sequence, video start, audio and end screen. Repeat
with venue Wi-Fi and a cold browser cache. Check dropped video frames and buffering
in browser media diagnostics. Keep the MP4 available locally for operator recovery.
Local backend tests do not certify frame rate, audio output or network reliability.
