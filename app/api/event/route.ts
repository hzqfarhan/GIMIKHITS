import { createEventHandler } from '@/lib/event-service';
import { nodeEventRuntime } from '@/lib/node-event-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function publicRequest(request: Request) {
  // Next's Node server can normalise request.url to localhost. The actual Host
  // header preserves the origin used by a phone, subdomain or loopback browser.
  const url = new URL(request.url);
  url.host = request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol === 'https' || protocol === 'http') url.protocol = `${protocol}:`;
  return new Request(url,request);
}
export async function GET(request: Request) { return createEventHandler(nodeEventRuntime()).GET(publicRequest(request)); }
export async function POST(request: Request) { return createEventHandler(nodeEventRuntime()).POST(publicRequest(request)); }
