const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'jbs-data')
  : path.join(__dirname, 'data');

const DEFAULTS_DIR = path.join(__dirname, 'data');

if (process.env.VERCEL) {
  globalThis.__jbsStore = globalThis.__jbsStore || {};
}

function hasKv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function kvKey(name) {
  return 'jbs:' + name.replace(/\.json$/, '');
}

function blobPath(name) {
  return 'jbs-data/' + name;
}

function readDefaultSync(name, fallback) {
  const source = path.join(DEFAULTS_DIR, name.replace('.json', '.default.json'));
  if (fs.existsSync(source)) {
    return JSON.parse(fs.readFileSync(source, 'utf8'));
  }
  return fallback;
}

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function copyDefault(name) {
  const target = filePath(name);
  if (fs.existsSync(target)) return;
  const source = path.join(DEFAULTS_DIR, name.replace('.json', '.default.json'));
  if (fs.existsSync(source)) {
    ensureDataDir();
    fs.copyFileSync(source, target);
  }
}

function ensureDefaultsSync() {
  ensureDataDir();
  ['settings.json', 'bookings.json', 'transactions.json'].forEach(copyDefault);
}

async function kvGet(key) {
  const base = process.env.KV_REST_API_URL.replace(/\/$/, '');
  const res = await fetch(base + '/get/' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
  });
  if (!res.ok) throw new Error('Storage read failed');
  const json = await res.json();
  if (json.result === null || json.result === undefined) return null;
  if (typeof json.result === 'string') {
    try { return JSON.parse(json.result); } catch (e) { return json.result; }
  }
  return json.result;
}

async function kvSet(key, value) {
  const base = process.env.KV_REST_API_URL.replace(/\/$/, '');
  const encoded = encodeURIComponent(JSON.stringify(value));
  const res = await fetch(base + '/set/' + encodeURIComponent(key) + '/' + encoded, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
  });
  if (!res.ok) throw new Error('Storage write failed');
}

async function blobGet(name) {
  const { list } = require('@vercel/blob');
  const pathname = blobPath(name);
  const result = await list({
    prefix: pathname,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  const hit = result.blobs.find(function (b) { return b.pathname === pathname; });
  if (!hit) return null;
  const res = await fetch(hit.url);
  if (!res.ok) return null;
  return res.json();
}

async function blobSet(name, data) {
  const { put } = require('@vercel/blob');
  await put(blobPath(name), JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: 'application/json'
  });
}

function memoryGet(name) {
  if (!process.env.VERCEL || !globalThis.__jbsStore) return null;
  return globalThis.__jbsStore[name] || null;
}

function memorySet(name, data) {
  if (process.env.VERCEL && globalThis.__jbsStore) {
    globalThis.__jbsStore[name] = data;
  }
}

async function readJSON(name, fallback) {
  if (hasKv()) {
    let data = await kvGet(kvKey(name));
    if (data === null || data === undefined) {
      data = readDefaultSync(name, fallback);
      if (data !== undefined && data !== null) await writeJSON(name, data);
      return data;
    }
    return data;
  }

  if (hasBlob()) {
    let data = await blobGet(name);
    if (data === null || data === undefined) {
      data = readDefaultSync(name, fallback);
      if (data !== undefined && data !== null) await writeJSON(name, data);
      return data;
    }
    memorySet(name, data);
    return data;
  }

  const cached = memoryGet(name);
  if (cached !== null && cached !== undefined) return cached;

  ensureDefaultsSync();
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    const data = JSON.parse(raw);
    memorySet(name, data);
    return data;
  } catch {
    if (fallback !== undefined) {
      await writeJSON(name, fallback);
      return fallback;
    }
    throw new Error('Missing data file: ' + name);
  }
}

async function writeJSON(name, data) {
  memorySet(name, data);

  if (hasKv()) {
    await kvSet(kvKey(name), data);
    return;
  }

  if (hasBlob()) {
    await blobSet(name, data);
    return;
  }

  ensureDataDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

function hasSharedStorage() {
  return hasKv() || hasBlob();
}

module.exports = {
  readJSON,
  writeJSON,
  DATA_DIR,
  ensureDefaults: ensureDefaultsSync,
  DEFAULTS_DIR,
  hasKv,
  hasBlob,
  hasSharedStorage
};
