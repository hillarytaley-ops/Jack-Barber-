function getRequiredAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.VERCEL) return null;
  return 'local-dev-ChangeMe1';
}

function adminPasswordConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

function isProductionHost() {
  return !!process.env.VERCEL;
}

module.exports = {
  getRequiredAdminPassword,
  adminPasswordConfigured,
  isProductionHost
};
