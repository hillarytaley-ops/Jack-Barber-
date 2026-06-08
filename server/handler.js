const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { readJSON, writeJSON, DATA_DIR, ensureDefaults, saveImage, getImage, deleteImage } = require('./store');
const { normalizeHoursSchedule } = require('./hours');
const { createSession, verifyToken } = require('./auth-token');
const { isProduction } = require('./env');
const { paymentsEnabled, createCheckoutSession, verifyCheckoutSession, getServicePrice, getBookingTotal, getTravelFee } = require('./payments');
const { isBlockedBot, shouldSkipBotGuard, aiProtectionHeaders } = require('./bot-guard');

const ROOT = path.join(__dirname, '..');
const UPLOADS = process.env.VERCEL
  ? path.join('/tmp', 'jbs-uploads')
  : path.join(ROOT, 'uploads', 'gallery');
const DEFAULT_PASSWORD = isProduction()
  ? null
  : (process.env.ADMIN_PASSWORD || 'JackStyle2026');

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
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (isProduction() && !adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required in production.');
  }
  const admin = await readJSON('admin.json', null);
  if (!admin) {
    await writeJSON('admin.json', {
      username: 'admin',
      passwordHash: hashPassword(adminPassword || DEFAULT_PASSWORD)
    });
  }
  ready = true;
}

async function getSettings() {
  const settings = await readJSON('settings.json');
  if (settings.hours) {
    normalizeHoursSchedule(settings.hours);
  }
    if (!settings.homeService) {
      settings.homeService = {
        enabled: true,
        label: 'We Come to You',
        title: 'Home Service Haircut',
        travelFee: 15,
        serviceArea: 'Wodonga and surrounding areas',
        coverageNote: '',
        parkingNote: '',
        minNoticeHours: 24,
        steps: []
      };
    }
    if (!Array.isArray(settings.gallery)) {
      settings.gallery = [];
    }
    return settings;
}

async function saveSettings(data) {
  if (data.hours) {
    normalizeHoursSchedule(data.hours);
  }
  return writeJSON('settings.json', data);
}

function applyAiHeaders(res, pathname) {
  const headers = aiProtectionHeaders(pathname.indexOf('/admin') === 0);
  Object.keys(headers).forEach(function (key) {
    if (typeof res.setHeader === 'function') res.setHeader(key, headers[key]);
  });
}

function send(res, status, data, type) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  if (typeof res.status === 'function' && typeof res.send === 'function') {
    res.setHeader('Content-Type', type || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(status).send(body);
  }
  res.writeHead(status, {
    'Content-Type': type || 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function sendBinary(res, status, buffer, mimeType) {
  const headers = {
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*'
  };
  if (typeof res.status === 'function' && typeof res.send === 'function') {
    res.status(status);
    Object.keys(headers).forEach(function (key) { res.setHeader(key, headers[key]); });
    return res.send(buffer);
  }
  res.writeHead(status, headers);
  res.end(buffer);
}

function parseBody(req) {
  const maxBytes = 1024 * 1024;
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
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
  return '/api/gallery/' + encodeURIComponent(item.filename);
}

function adminResourceId(pathname, basePath, searchParams, body) {
  const fromQuery = searchParams.get('id');
  if (fromQuery) return decodeURIComponent(fromQuery);
  if (body && body.id) return String(body.id);
  if (pathname.startsWith(basePath + '/')) {
    return decodeURIComponent(pathname.slice(basePath.length + 1).replace(/\/$/, ''));
  }
  return '';
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
  var filePath = path.normalize(path.join(ROOT, ...rel.split('/')));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return null;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return path.join(filePath, 'index.html');
  }
  return filePath;
}

function serveStatic(req, res, filePath, pathname) {
  fs.readFile(filePath, function (err, data) {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    applyAiHeaders(res, pathname || '');
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

  if (!shouldSkipBotGuard(pathname)) {
    const ua = req.headers['user-agent'] || req.headers['User-Agent'] || '';
    if (isBlockedBot(ua)) {
      applyAiHeaders(res, pathname);
      return send(res, 403, 'Access denied — automated AI/scraper access is not permitted.', 'text/plain');
    }
  }

  applyAiHeaders(res, pathname);

  try {
    await ensureReady();

    if (req.method === 'GET' && pathname === '/api/public/config') {
      const settings = await getSettings();
      return send(res, 200, {
        contact: settings.contact,
        social: settings.social || { facebook: '', tiktok: '' },
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
          return {
            id: item.id,
            caption: item.caption,
            alt: item.alt,
            src: galleryUrl(item),
            filename: item.filename,
            service: item.service || ''
          };
        }),
        closedDates: settings.hours.closedDates || [],
        paymentsEnabled: paymentsEnabled(),
        homeService: settings.homeService || {}
      });
    }

    if (req.method === 'GET' && pathname === '/api/public/payment-status') {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) return send(res, 400, { error: 'session_id required' });
      const status = await verifyCheckoutSession(sessionId);
      if (!status) return send(res, 404, { error: 'Payment session not found' });
      return send(res, 200, status);
    }

    if (req.method === 'GET' && pathname.startsWith('/api/gallery/')) {
      const filename = decodeURIComponent(pathname.slice('/api/gallery/'.length));
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return send(res, 400, { error: 'Invalid filename' });
      }
      const image = await getImage(filename);
      if (!image) return send(res, 404, 'Not found', 'text/plain');
      return sendBinary(res, 200, image.buffer, image.mimeType);
    }

    if (req.method === 'POST' && pathname === '/api/bookings') {
      const body = await parseBody(req);
      if (!body.name || !body.email || !body.phone || !body.service || !body.date || !body.time) {
        return send(res, 400, { error: 'Missing required fields' });
      }
      const settings = await getSettings();
      const serviceType = body.serviceType || 'shop';
      const hs = settings.homeService || {};

      if (serviceType === 'home') {
        if (hs.enabled === false) {
          return send(res, 400, { error: 'Home service is not available at the moment. Please call us to book.' });
        }
        if (!body.address || !String(body.address).trim()) {
          return send(res, 400, { error: 'Home address is required for home service bookings.' });
        }
      }

      const travelFee = getTravelFee(settings, serviceType);
      const price = getServicePrice(settings, body.service) + travelFee;
      if (price <= 0) {
        return send(res, 400, { error: 'Could not find a price for this service.' });
      }

      const bookings = await readJSON('bookings.json', []);
      const booking = Object.assign({}, body, {
        id: 'b' + Date.now(),
        serviceType: serviceType,
        status: 'pending',
        paymentStatus: 'unpaid',
        travelFee: travelFee,
        amount: price,
        createdAt: new Date().toISOString()
      });
      bookings.unshift(booking);
      await writeJSON('bookings.json', bookings);

      if (paymentsEnabled()) {
        try {
          const session = await createCheckoutSession(booking, settings);
          if (session && session.url) {
            booking.stripeSessionId = session.id;
            bookings[0] = booking;
            await writeJSON('bookings.json', bookings);
            return send(res, 200, { ok: true, id: booking.id, checkoutUrl: session.url, amount: price });
          }
        } catch (e) {
          /* booking is saved — payment can be arranged manually */
        }
      }

      return send(res, 200, {
        ok: true,
        id: booking.id,
        amount: price,
        message: serviceType === 'home'
          ? 'Your home service request was received. We will contact you to confirm payment and arrival time.'
          : 'Your booking request was received. We will contact you shortly with payment details.'
      });
    }

    if (req.method === 'POST' && pathname === '/api/payments/checkout') {
      const body = await parseBody(req);
      if (!body.bookingId) return send(res, 400, { error: 'Booking ID required' });
      if (!paymentsEnabled()) return send(res, 503, { error: 'Online payments are not configured yet.' });

      const bookings = await readJSON('bookings.json', []);
      const booking = bookings.find(function (b) { return b.id === body.bookingId; });
      if (!booking) return send(res, 404, { error: 'Booking not found' });
      if (booking.paymentStatus === 'paid') return send(res, 400, { error: 'This booking is already paid' });

      try {
        const settings = await getSettings();
        const session = await createCheckoutSession(booking, settings);
        return send(res, 200, { checkoutUrl: session.url });
      } catch (e) {
        return send(res, 500, { error: e.message });
      }
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
      const settings = await getSettings();
      settings.gallery = settings.gallery.map(function (item) {
        return Object.assign({}, item, { src: galleryUrl(item) });
      });
      return send(res, 200, settings);
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
      const buffer = Buffer.from(body.image.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return send(res, 400, { error: 'Image must be 5 MB or smaller' });
      }
      const mimeType = MIME[ext] || 'image/jpeg';
      await saveImage(name, buffer, mimeType);
      const settings = await getSettings();
      const item = {
        id: 'g' + Date.now(),
        caption: body.caption || 'Gallery photo',
        alt: body.alt || body.caption || 'Gallery photo',
        filename: name,
        service: body.service || ''
      };
      settings.gallery.push(item);
      await saveSettings(settings);
      return send(res, 200, { ok: true, item: Object.assign({}, item, { src: galleryUrl(item) }) });
    }

    if (req.method === 'PATCH' && (pathname === '/api/admin/gallery' || pathname.startsWith('/api/admin/gallery/'))) {
      const body = await parseBody(req);
      const id = adminResourceId(pathname, '/api/admin/gallery', searchParams, body);
      if (!id) return send(res, 400, { error: 'Gallery id required' });
      const settings = await getSettings();
      const idx = settings.gallery.findIndex(function (g) { return g.id === id; });
      if (idx === -1) return send(res, 404, { error: 'Photo not found' });
      const item = settings.gallery[idx];
      if (body.caption !== undefined) {
        item.caption = String(body.caption).trim() || item.caption;
        item.alt = item.caption;
      }
      if (body.service !== undefined) {
        item.service = String(body.service || '');
      }
      if (body.image && body.filename) {
        const ext = path.extname(body.filename).toLowerCase() || '.jpg';
        const name = 'gallery-' + Date.now() + ext;
        const buffer = Buffer.from(body.image.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          return send(res, 400, { error: 'Image must be 5 MB or smaller' });
        }
        const mimeType = MIME[ext] || 'image/jpeg';
        await saveImage(name, buffer, mimeType);
        if (item.filename && !item.filename.endsWith('.svg')) {
          try {
            await deleteImage(item.filename);
          } catch (err) {
            console.error('deleteImage failed:', err.message);
          }
        }
        item.filename = name;
      }
      settings.gallery[idx] = item;
      await saveSettings(settings);
      return send(res, 200, { ok: true, item: Object.assign({}, item, { src: galleryUrl(item) }) });
    }

    if (req.method === 'DELETE' && (pathname === '/api/admin/gallery' || pathname.startsWith('/api/admin/gallery/'))) {
      const body = await parseBody(req);
      const id = adminResourceId(pathname, '/api/admin/gallery', searchParams, body);
      if (!id) return send(res, 400, { error: 'Gallery id required' });
      const settings = await getSettings();
      const item = settings.gallery.find(function (g) { return g.id === id; });
      if (!item) return send(res, 404, { error: 'Photo not found' });
      if (item.filename && !item.filename.endsWith('.svg')) {
        try {
          await deleteImage(item.filename);
        } catch (err) {
          console.error('deleteImage failed:', err.message);
        }
      }
      settings.gallery = settings.gallery.filter(function (g) { return g.id !== id; });
      await saveSettings(settings);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && (pathname === '/api/admin/bookings' || pathname.startsWith('/api/admin/bookings/'))) {
      const body = await parseBody(req);
      const id = adminResourceId(pathname, '/api/admin/bookings', searchParams, body);
      if (!id) return send(res, 400, { error: 'Booking id required' });
      const bookings = await readJSON('bookings.json', []);
      await writeJSON('bookings.json', bookings.filter(function (b) { return b.id !== id; }));
      return send(res, 200, { ok: true });
    }

    if (req.method === 'PATCH' && (pathname === '/api/admin/bookings' || pathname.startsWith('/api/admin/bookings/'))) {
      const body = await parseBody(req);
      const id = adminResourceId(pathname, '/api/admin/bookings', searchParams, body);
      if (!id) return send(res, 400, { error: 'Booking id required' });
      const bookings = await readJSON('bookings.json', []);
      const idx = bookings.findIndex(function (b) { return b.id === id; });
      if (idx === -1) return send(res, 404, { error: 'Not found' });
      if (body.status !== undefined) bookings[idx].status = body.status;
      if (body.notes !== undefined) bookings[idx].notes = body.notes;
      await writeJSON('bookings.json', bookings);
      return send(res, 200, bookings[idx]);
    }

    if (req.method === 'DELETE' && (pathname === '/api/admin/transactions' || pathname.startsWith('/api/admin/transactions/'))) {
      const body = await parseBody(req);
      const id = adminResourceId(pathname, '/api/admin/transactions', searchParams, body);
      if (!id) return send(res, 400, { error: 'Transaction id required' });
      const transactions = await readJSON('transactions.json', []);
      await writeJSON('transactions.json', transactions.filter(function (t) { return t.id !== id; }));
      return send(res, 200, { ok: true });
    }

    if (process.env.VERCEL) {
      return send(res, 404, { error: 'Not found' });
    }

    if (pathname === '/admin' || pathname === '/admin/') {
      return serveStatic(req, res, path.join(ROOT, 'admin', 'index.html'), pathname);
    }

    var filePath = resolveStaticFile(pathname);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic(req, res, filePath, pathname);
    }

    send(res, 404, 'Not found', 'text/plain');
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}

module.exports = { handleRequest, UPLOADS, ROOT };
