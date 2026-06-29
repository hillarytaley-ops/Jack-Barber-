const { handleRequest } = require('../../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/admin/login';
  return handleRequest(req, res);
};
