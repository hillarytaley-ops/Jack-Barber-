const { handleRequest } = require('../../../server/handler');

module.exports = async function (req, res) {
  req.url = '/api/admin/bookings/update-status';
  return handleRequest(req, res);
};
