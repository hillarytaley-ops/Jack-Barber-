const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { readJSON, writeJSON, DATA_DIR, ensureDefaults, hasKv } = require('./store');
const { createSession, verifyToken } = require('./auth-token');

const ROOT = path.join(__dirname, '..');
const UPLOADS = process.env.VERCEL
  ? path.join('/tmp', 'jbs-uploads')
  : path.join(ROOT, 'uploads', 'gallery');
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'JackStyle2026';

let ready = false;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex') === hash;
}

async function ensureReady() {
  if (ready) return;
  ensureDefaults();
  const admin = await readJSON('admin.json', null);
  if (!admin) {
    await writeJSON('admin.json', {
      username: 'admin',
      passwordHash: hashPassword(DEFAULT_PASSWORD)
    });
  }
  ready = true;
}

async function getSettings() {
  return readJSON('settings.json');
}

async function saveSettings(data) {
  return writeJSON('settings.json', data);
}

function send(res, status, data, type) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': type || 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
  });
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function requireAuth(req, res) {
  if (!verifyToken(getToken(req))) {
    send(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

function galleryUrl(item) {
  if (item.filename.startsWith('photo-') && item.filename.endsWith('.svg')) {
    return '/assets/gallery/' + item.filename;
  }
  return '/uploads/gallery/' + item.filename;
}

function parsePeriod(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'weekly') {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  } else if (period === 'monthly') start.setDate(1);
  return { start, end: now, period: period || 'daily' };
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

async function buildReport(period) {
  const { start, end, period: p } = parsePeriod(period);
  const transactions = await readJSON('transactions.json', []);
  const bookings = await readJSON('bookings.json', []);
  const filtered = transactions.filter(function (t) { return inRange(t.date, start, end); });
  const total = filtered.reduce(function (s, t) { return s + Number(t.amount || 0); }, 0);
  const byService = {};
  filtered.forEach(function (t) {
    const k = t.service || 'Other';
    byService[k] = (byService[k] || 0) + Number(t.amount || 0);
  });
  return {
    period: p,
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue: total,
      transactionCount: filtered.length,
      bookingCount: bookings.filter(function (b) { return inRange(b.createdAt, start, end); }).length,
      averageTicket: filtered.length ? total / filtered.length : 0
    },
    byService: byService,
    transactions: filtered,
    bookings: bookings.filter(function (b) { return inRange(b.createdAt, start, end); })
  };
}

function resolveStaticFile(pathname) {
  var rel = decodeURIComponent(pathname).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!rel) return path.join(ROOT, 'index.html');
  var filePath = path.join(ROOT, ...rel.split('/'));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return path.join(filePath, 'index.html');
  }
  return filePath;
}

function serveStatic(req, res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

function getPathname(req) {
  const raw = req.url || '/';
  const url = new URL(raw, 'http://localhost');
  return decodeURIComponent(url.pathname);
}

function getSearchParams(req) {
  const raw = req.url || '/';
  const url = new URL(raw, 'http://localhost');
  return url.searchParams;
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  const pathname = getPathname(req);
  const searchParams = getSearchParams(req);

  try {
    await ensureReady();

    if (req.method === 'GET' && pathname === '/api/public/config') {
      const settings = await getSettings();
      return send(res, 200, {
        contact: settings.contact,
        brand: settings.brand,
        hero: settings.hero,
        roots: settings.roots,
        hours: settings.hours,
        hoursDisplay: settings.hours.schedule.map(function (row) {
          if (row.closed) return { label: row.label, text: 'Closed' };
          return { label: row.label, text: formatTime(row.open) + ' – ' + formatTime(row.close) };
        }),
        services: settings.services,
        gallery: settings.gallery.map(function (item) {
          return { id: item.id, caption: item.caption, alt: item.alt, src: galleryUrl(item) };
        }),
        closedDates: settings.hours.closedDates || []
      });
    }

    if (req.method === 'POST' && pathname === '/api/bookings') {
      if (process.env.VERCEL && !hasKv()) {
        return send(res, 503, {
          error: 'Online booking storage is not set up yet. Please call 0478 268 399 to book, or try again after the site owner connects Vercel KV storage.'
        });
      }
      const body = await parseBody(req);
      if (!body.name || !body.email || !body.phone || !body.service || !body.date || !body.time) {
        return send(res, 400, { error: 'Missing required fields' });
      }
      const bookings = await readJSON('bookings.json', []);
      const booking = Object.assign({}, body, {
        id: 'b' + Date.now(),
        serviceType: body.serviceType || 'shop',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      bookings.unshift(booking);
      await writeJSON('bookings.json', bookings);
      return send(res, 200, { ok: true, id: booking.id });
    }

    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const body = await parseBody(req);
      const admin = await readJSON('admin.json');
      if (body.username !== admin.username || !verifyPassword(body.password, admin.passwordHash)) {
        return send(res, 401, { error: 'Invalid username or password' });
      }
      const token = createSession(admin.username);
      return send(res, 200, { token: token, username: admin.username });
    }

    if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login' && !requireAuth(req, res)) return;

    if (req.method === 'POST' && pathname === '/api/admin/logout') {
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/admin/change-password') {
      const body = await parseBody(req);
      if (!body.newPassword || body.newPassword.length < 8) {
        return send(res, 400, { error: 'New password must be at least 8 characters' });
      }
      const admin = await readJSON('admin.json');
      if (!verifyPassword(body.currentPassword, admin.passwordHash)) {
        return send(res, 401, { error: 'Current password is incorrect' });
      }
      admin.passwordHash = hashPassword(body.newPassword);
      await writeJSON('admin.json', admin);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/admin/settings') {
      return send(res, 200, await getSettings());
    }
    if (req.method === 'PUT' && pathname === '/api/admin/settings') {
      await saveSettings(await parseBody(req));
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/admin/bookings') {
      return send(res, 200, await readJSON('bookings.json', []));
    }
    if (req.method === 'GET' && pathname === '/api/admin/transactions') {
      return send(res, 200, await readJSON('transactions.json', []));
    }
    if (req.method === 'GET' && pathname === '/api/admin/overview') {
      const bookings = await readJSON('bookings.json', []);
      const daily = await buildReport('daily');
      const weekly = await buildReport('weekly');
      const monthly = await buildReport('monthly');
      return send(res, 200, {
        daily: daily.summary,
        weekly: weekly.summary,
        monthly: monthly.summary,
        pendingBookings: bookings.filter(function (b) { return b.status === 'pending'; }).length,
        totalBookings: bookings.length
      });
    }
    if (req.method === 'GET' && pathname === '/api/admin/reports') {
      return send(res, 200, await buildReport(searchParams.get('period') || 'daily'));
    }

    if (req.method === 'POST' && pathname === '/api/admin/transactions') {
      const body = await parseBody(req);
      if (!body.amount || !body.date) return send(res, 400, { error: 'Amount and date required' });
      const transactions = await readJSON('transactions.json', []);
      const item = {
        id: 't' + Date.now(),
        date: body.date,
        amount: Number(body.amount),
        service: body.service || '',
        clientName: body.clientName || '',
        notes: body.notes || '',
        createdAt: new Date().toISOString()
      };
      transactions.unshift(item);
      await writeJSON('transactions.json', transactions);
      return send(res, 200, item);
    }

    if (req.method === 'POST' && pathname === '/api/admin/gallery') {
      const body = await parseBody(req);
      if (!body.image || !body.filename) return send(res, 400, { error: 'Image data required' });
      const ext = path.extname(body.filename).toLowerCase() || '.jpg';
      const name = 'gallery-' + Date.now() + ext;
      const buffer = Buffer.from(body.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(UPLOADS, name), buffer);
      const settings = await getSettings();
      const item = { id: 'g' + Date.now(), caption: body.caption || 'Gallery photo', alt: body.alt || body.caption || 'Gallery photo', filename: name };
      settings.gallery.push(item);
      await saveSettings(settings);
      return send(res, 200, { ok: true, item: Object.assign({}, item, { src: galleryUrl(item) }) });
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/gallery/')) {
      const id = pathname.split('/').pop();
      const settings = await getSettings();
      const item = settings.gallery.find(function (g) { return g.id === id; });
      if (item && item.filename && !item.filename.endsWith('.svg')) {
        const fp = path.join(UPLOADS, item.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      settings.gallery = settings.gallery.filter(function (g) { return g.id !== id; });
      await saveSettings(settings);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/bookings/')) {
      const id = pathname.split('/').pop();
      const bookings = await readJSON('bookings.json', []);
      await writeJSON('bookings.json', bookings.filter(function (b) { return b.id !== id; }));
      return send(res, 200, { ok: true });
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/admin/bookings/')) {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const bookings = await readJSON('bookings.json', []);
      const idx = bookings.findIndex(function (b) { return b.id === id; });
      if (idx === -1) return send(res, 404, { error: 'Not found' });
      bookings[idx] = Object.assign({}, bookings[idx], body);
      await writeJSON('bookings.json', bookings);
      return send(res, 200, bookings[idx]);
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/transactions/')) {
      const id = pathname.split('/').pop();
      const transactions = await readJSON('transactions.json', []);
      await writeJSON('transactions.json', transactions.filter(function (t) { return t.id !== id; }));
      return send(res, 200, { ok: true });
    }

    if (process.env.VERCEL) {
      return send(res, 404, { error: 'Not found' });
    }

    if (pathname === '/admin' || pathname === '/admin/') {
      return serveStatic(req, res, path.join(ROOT, 'admin', 'index.html'));
    }

    var filePath = resolveStaticFile(pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic(req, res, filePath);
    }

    send(res, 404, 'Not found', 'text/plain');
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}

module.exports = { handleRequest, UPLOADS, ROOT };
