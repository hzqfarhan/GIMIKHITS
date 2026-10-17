export const launchViews = ['main', 'qr', 'bypass', 'audience'] as const;
export type LaunchView = typeof launchViews[number];
export type LaunchLinks = Record<LaunchView, string>;
const paths: Record<LaunchView, string> = { main: '/', qr: '/qr', bypass: '/bypass', audience: '/audience' };
const eventHosts: Record<LaunchView,string> = {main:'hitsmainpanel.seladevs.my',qr:'qr.seladevs.my',bypass:'bypass.seladevs.my',audience:'audience.seladevs.my'};
function hostForView(view:LaunchView,domain:string) { return domain==='seladevs.my'?eventHosts[view]:`${view}.${domain}`; }

export function eventBaseDomain(value?: string) {
  const domain = (value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(domain) ? domain : '';
}

export function viewForHost(hostname: string, configuredDomain?: string): LaunchView | null {
  const domain = eventBaseDomain(configuredDomain);
  const host = hostname.toLowerCase();
  for (const view of launchViews) {
    if (host === eventHosts[view] || host === `${view}.localhost` || (domain && host === hostForView(view,domain))) return view;
  }
  return null;
}

export function pathForView(view: LaunchView) { return paths[view]; }

export function launchLinks(requestUrl: string, configuredDomain?: string): LaunchLinks {
  const url = new URL(requestUrl);
  const localSubdomain = launchViews.some(view => url.hostname === `${view}.localhost`);
  const configured = eventBaseDomain(configuredDomain);
  const eventHost = Object.values(eventHosts).includes(url.hostname);
  const domain = localSubdomain ? 'localhost' : eventHost ? 'seladevs.my' : configured;
  return Object.fromEntries(launchViews.map(view => [view, domain
    ? `${domain === 'localhost' ? url.protocol : 'https:'}//${hostForView(view,domain)}${domain === 'localhost' && url.port ? `:${url.port}` : ''}/`
    : new URL(paths[view], url.origin).href])) as LaunchLinks;
}
