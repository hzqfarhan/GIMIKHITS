import { NextResponse, type NextRequest } from 'next/server';
import { pathForView, viewForHost } from './lib/launch-routing';

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get('host') || request.nextUrl.host).split(':')[0];
  const view = viewForHost(hostname, process.env.EVENT_BASE_DOMAIN);
  if (!view || view === 'main') return NextResponse.next();
  const target = request.nextUrl.clone();
  target.pathname = pathForView(view);
  return NextResponse.rewrite(target);
}
export const config = { matcher: '/' };
