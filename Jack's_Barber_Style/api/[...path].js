require('@neondatabase/serverless');
const { handleRequest } = require('../server/handler');

module.exports = async function (req, res) {
  var url = req.url || '/';
  if (url.indexOf('?') !== -1) url = url.split('?')[0];
  if (!url.startsWith('/api/')) {
    var segments = req.query.path;
    if (Array.isArray(segments) && segments.length) {
      url = '/api/' + segments.join('/');
    } else if (typeof segments === 'string' && segments) {
      url = '/api/' + segments;
    } else {
      url = '/api' + (url.startsWith('/') ? url : '/' + url);
    }
    req.url = url + (req.url && req.url.indexOf('?') !== -1 ? req.url.slice(req.url.indexOf('?')) : '');
  }
  return handleRequest(req, res);
};
