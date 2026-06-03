const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function readJSON(name, fallback) {
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
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON, DATA_DIR, filePath };
