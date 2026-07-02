import blocklist from './server/bot-blocklist.json';

function isBlockedBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  for (const allowed of blocklist.allowed || []) {
    if (ua.includes(String(allowed).toLowerCase())) return false;
  }
  for (const blocked of blocklist.blocked || []) {
    if (ua.includes(String(blocked).toLowerCase())) return true;
  }
  return false;
}

function shouldSkip(pathname) {
  for (const path of blocklist.skipPaths || []) {
    if (pathname === path || pathname.startsWith(path + '/')) return true;
  }
  return false;
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (shouldSkip(url.pathname)) return;

  const ua = request.headers.get('user-agent') || '';
  if (!isBlockedBot(ua)) return;

  return new Response('Access denied — automated AI/scraper access is not permitted.', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noai, noimageai',
      'Cache-Control': 'no-store'
    }
  });
}

export const config = {
  matcher: [
    '/((?!_vercel|favicon\\.ico|assets/).*)'
  ]
};
