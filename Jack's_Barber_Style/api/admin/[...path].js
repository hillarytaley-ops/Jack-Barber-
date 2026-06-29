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

function appendQuery(req, pathname) {
  var parts = [];
  if (req.query) {
    Object.keys(req.query).forEach(function (key) {
      if (key === 'path') return;
      var val = req.query[key];
      if (val == null || val === '') return;
      if (Array.isArray(val)) {
        val.forEach(function (entry) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(entry)));
        });
      } else {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)));
      }
    });
  }
  if (parts.length) return pathname + '?' + parts.join('&');
  if (req.url && req.url.indexOf('?') !== -1) {
    return pathname + req.url.slice(req.url.indexOf('?'));
  }
  if (req.originalUrl && req.originalUrl.indexOf('?') !== -1) {
    return pathname + req.originalUrl.slice(req.originalUrl.indexOf('?'));
  }
  return pathname;
}

module.exports = async function (req, res) {
  req.url = appendQuery(req, apiPath(req));
  return handleRequest(req, res);
};
