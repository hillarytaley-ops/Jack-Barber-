const { handleRequest } = require('../../server/handler');

function apiPath(req) {
  var segments = req.query.path;
  if (Array.isArray(segments) && segments.length) {
    return '/api/admin/' + segments.join('/');
  }
  if (typeof segments === 'string' && segments) {
    return '/api/admin/' + segments;
  }
  var url = req.url || '';
  if (url.indexOf('?') !== -1) url = url.split('?')[0];
  if (url.startsWith('/api/')) return url;
  return '/api/admin/' + url.replace(/^\/+/, '');
}

module.exports = async function (req, res) {
  req.url = apiPath(req);
  if (req.url.indexOf('?') === -1 && req.url && req.originalUrl) {
    var q = req.originalUrl.indexOf('?');
    if (q !== -1) req.url += req.originalUrl.slice(q);
  }
  return handleRequest(req, res);
};
