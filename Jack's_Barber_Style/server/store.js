const fs = require('fs');
const path = require('path');

let neonFn = null;
let blobList = null;
let blobPut = null;

try {
  neonFn = require('@neondatabase/serverless').neon;
} catch (e) {
  try {
    neonFn = require(path.join(__dirname, '..', 'node_modules', '@neondatabase/serverless')).neon;
  } catch (e2) {
    try {
      neonFn = require(path.join(__dirname, '..', 'api', 'node_modules', '@neondatabase/serverless')).neon;
    } catch (e3) {
      /* optional on local file-only runs */
    }
  }
}

try {
  const blob = require('@vercel/blob');
  blobList = blob.list;
  blobPut = blob.put;
} catch (e) {
  /* optional when blob storage not configured */
}

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'jbs-data')
  : path.join(__dirname, 'data');

const DEFAULTS_DIR = path.join(__dirname, 'data');

if (process.env.VERCEL) {
  globalThis.__jbsStore = globalThis.__jbsStore || {};
}

let sql = null;
let pgReady = false;

function pgUrl() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.STORAGE_DATABASE_URL
    || process.env.STORAGE_POSTGRES_URL;
}

function hasPg() {
  return !!pgUrl() && !!neonFn;
}

function hasKv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN && !!blobList && !!blobPut;
}

function kvKey(name) {
  return 'jbs:' + name.replace(/\.json$/, '');
}

function blobPath(name) {
  return 'jbs-data/' + name;
}

const ARRAY_FILES = ['bookings.json', 'transactions.json'];

function normalizeStored(name, data, fallback) {
  if (data === null || data === undefined) return fallback;

  let value = data;
  while (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  if (ARRAY_FILES.indexOf(name) !== -1) {
    return Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
  }

  return value;
}

function needsRepair(name, data, normalized) {
  if (data === null || data === undefined) return false;
  if (typeof data === 'string') return true;
  if (ARRAY_FILES.indexOf(name) !== -1) return !Array.isArray(data);
  return false;
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

async function ensurePg() {
  if (!hasPg() || pgReady) return;
  sql = neonFn(pgUrl());
  if (typeof sql !== 'function') {
    throw new Error('Database driver failed to initialize. Redeploy after connecting Neon.');
  }
  await sql`CREATE TABLE IF NOT EXISTS jbs_store (
    file_key TEXT PRIMARY KEY,
    file_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS jbs_images (
    file_key TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    image_data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  pgReady = true;
}

async function pgGet(name) {
  await ensurePg();
  const rows = await sql`SELECT file_data FROM jbs_store WHERE file_key = ${name}`;
  return rows[0] ? rows[0].file_data : null;
}

async function pgSet(name, data) {
  await ensurePg();
  const json = JSON.stringify(data);
  await sql`
    INSERT INTO jbs_store (file_key, file_data, updated_at)
    VALUES (${name}, ${json}::jsonb, NOW())
    ON CONFLICT (file_key) DO UPDATE
    SET file_data = EXCLUDED.file_data, updated_at = NOW()
  `;
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
  const pathname = blobPath(name);
  const result = await blobList({
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
  await blobPut(blobPath(name), JSON.stringify(data), {
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
  if (hasPg()) {
    let data = await pgGet(name);
    if (data === null || data === undefined) {
      data = readDefaultSync(name, fallback);
      if (data !== undefined && data !== null) await writeJSON(name, data);
      return normalizeStored(name, data, fallback);
    }
    const normalized = normalizeStored(name, data, fallback);
    if (needsRepair(name, data, normalized)) await pgSet(name, normalized);
    return normalized;
  }

  if (hasKv()) {
    let data = await kvGet(kvKey(name));
    if (data === null || data === undefined) {
      data = readDefaultSync(name, fallback);
      if (data !== undefined && data !== null) await writeJSON(name, data);
      return normalizeStored(name, data, fallback);
    }
    const normalized = normalizeStored(name, data, fallback);
    if (needsRepair(name, data, normalized)) await writeJSON(name, normalized);
    return normalized;
  }

  if (hasBlob()) {
    let data = await blobGet(name);
    if (data === null || data === undefined) {
      data = readDefaultSync(name, fallback);
      if (data !== undefined && data !== null) await writeJSON(name, data);
      return normalizeStored(name, data, fallback);
    }
    memorySet(name, data);
    const normalized = normalizeStored(name, data, fallback);
    if (needsRepair(name, data, normalized)) await writeJSON(name, normalized);
    return normalized;
  }

  const cached = memoryGet(name);
  if (cached !== null && cached !== undefined) {
    return normalizeStored(name, cached, fallback);
  }

  ensureDefaultsSync();
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    const data = JSON.parse(raw);
    memorySet(name, data);
    return normalizeStored(name, data, fallback);
  } catch {
    if (fallback !== undefined) {
      await writeJSON(name, fallback);
      return normalizeStored(name, fallback, fallback);
    }
    throw new Error('Missing data file: ' + name);
  }
}

async function writeJSON(name, data) {
  memorySet(name, data);

  if (hasPg()) {
    await pgSet(name, data);
    return;
  }

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
  return hasPg() || hasKv() || hasBlob();
}

const LOCAL_GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');

function mimeFromExt(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

async function saveImage(filename, buffer, mimeType) {
  if (hasPg()) {
    await ensurePg();
    const base64 = buffer.toString('base64');
    await sql`
      INSERT INTO jbs_images (file_key, mime_type, image_data, updated_at)
      VALUES (${filename}, ${mimeType}, ${base64}, NOW())
      ON CONFLICT (file_key) DO UPDATE
      SET mime_type = ${mimeType}, image_data = ${base64}, updated_at = NOW()
    `;
    return;
  }

  if (!fs.existsSync(LOCAL_GALLERY_DIR)) fs.mkdirSync(LOCAL_GALLERY_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_GALLERY_DIR, filename), buffer);
}

async function getImage(filename) {
  if (hasPg()) {
    await ensurePg();
    const rows = await sql`SELECT mime_type, image_data FROM jbs_images WHERE file_key = ${filename}`;
    if (!rows[0]) return null;
    return {
      mimeType: rows[0].mime_type,
      buffer: Buffer.from(rows[0].image_data, 'base64')
    };
  }

  const fp = path.join(LOCAL_GALLERY_DIR, filename);
  if (!fs.existsSync(fp)) return null;
  return {
    mimeType: mimeFromExt(path.extname(filename)),
    buffer: fs.readFileSync(fp)
  };
}

async function deleteImage(filename) {
  if (hasPg()) {
    await ensurePg();
    await sql`DELETE FROM jbs_images WHERE file_key = ${filename}`;
    return;
  }

  const fp = path.join(LOCAL_GALLERY_DIR, filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

module.exports = {
  readJSON,
  writeJSON,
  ensurePg,
  saveImage,
  getImage,
  deleteImage,
  DATA_DIR,
  ensureDefaults: ensureDefaultsSync,
  DEFAULTS_DIR,
  hasPg,
  hasKv,
  hasBlob,
  hasSharedStorage,
  pgUrl
};
