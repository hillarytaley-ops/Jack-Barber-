const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'jbs-data')
  : path.join(__dirname, 'data');

const DEFAULTS_DIR = path.join(__dirname, 'data');

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

function ensureDefaults() {
  ensureDataDir();
  ['settings.json', 'bookings.json', 'transactions.json'].forEach(copyDefault);
}

function readJSON(name, fallback) {
  ensureDefaults();
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    return JSON.parse(raw);
  } catch {
    if (fallback !== undefined) {
      writeJSON(name, fallback);
      return fallback;
    }
    throw new Error('Missing data file: ' + name);
  }
}

function writeJSON(name, data) {
  ensureDataDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON, DATA_DIR, filePath, ensureDefaults, DEFAULTS_DIR };
