const blocklist = require('./bot-blocklist.json');

function isBlockedBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const allowed = blocklist.allowed || [];
  for (let i = 0; i < allowed.length; i++) {
    if (ua.indexOf(String(allowed[i]).toLowerCase()) !== -1) return false;
  }
  const blocked = blocklist.blocked || [];
  for (let j = 0; j < blocked.length; j++) {
    if (ua.indexOf(String(blocked[j]).toLowerCase()) !== -1) return true;
  }
  return false;
}

function shouldSkipBotGuard(pathname) {
  const skip = blocklist.skipPaths || [];
  for (let i = 0; i < skip.length; i++) {
    if (pathname === skip[i] || pathname.startsWith(skip[i] + '/')) return true;
  }
  return false;
}

function aiProtectionHeaders(isAdmin) {
  if (isAdmin) {
    return {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noai, noimageai'
    };
  }
  return {
    'X-Robots-Tag': 'noai, noimageai'
  };
}

module.exports = {
  isBlockedBot,
  shouldSkipBotGuard,
  aiProtectionHeaders,
  blocklist
};
