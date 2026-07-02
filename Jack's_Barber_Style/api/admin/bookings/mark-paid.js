const { handleRequest } = require('../../../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/admin/bookings/mark-paid';
  return handleRequest(req, res);
};
