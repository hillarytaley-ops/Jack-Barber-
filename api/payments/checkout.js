require('@neondatabase/serverless');
const { handleRequest } = require('../../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/payments/checkout';
  return handleRequest(req, res);
};
