function isProduction() {
  return process.env.NODE_ENV === 'production'
    || process.env.VERCEL === '1'
    || process.env.RENDER === 'true';
}

module.exports = { isProduction };
