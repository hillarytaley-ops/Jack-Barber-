const { handleRequest } = require('../../server/handler');

module.exports = async function (req, res) {
  var filename = req.query.filename;
  if (Array.isArray(filename)) filename = filename.join('/');
  req.url = '/api/gallery/' + (filename || '');
  return handleRequest(req, res);
};
