const { handleRequest } = require('../../../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/admin/bookings/send-invoice';
  return handleRequest(req, res);
};
