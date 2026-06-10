require('@neondatabase/serverless');
const { handleRequest } = require('../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/bookings';
  return handleRequest(req, res);
};
