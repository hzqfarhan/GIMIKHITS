import { createEventHandler } from '../lib/event-service';
import type { EventRuntime } from '../lib/event-store';
import { pathForView, viewForHost } from '../lib/launch-routing';

type Bindings = EventRuntime & { ASSETS: { fetch(request: Request): Promise<Response> } };
export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/event') {
      const handler = createEventHandler(env);
      if (request.method === 'GET') return handler.GET(request);
      if (request.method === 'POST') return handler.POST(request);
      return new Response('Method not allowed', { status:405, headers:{Allow:'GET, POST'} });
    }
    if (url.pathname === '/') {
      const view = viewForHost(url.hostname, env.EVENT_BASE_DOMAIN);
      if (view) url.pathname = pathForView(view);
    }
    if (!url.pathname.split('/').pop()?.includes('.')) {
      url.pathname = `${url.pathname.replace(/\/$/, '') || ''}/index.html`;
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    if (url.pathname.endsWith('.html')) headers.set('Cache-Control','no-cache');
    headers.set('X-Content-Type-Options','nosniff');
    return new Response(response.body, {status:response.status,headers});
  },
};
