const http = require('http');
const { handleRequest } = require('./handler');

const { getRequiredAdminPassword } = require('./admin-auth');

const PORT = process.env.PORT || 3000;
const DEFAULT_PASSWORD = getRequiredAdminPassword() || 'local-dev-ChangeMe1';

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, function () {
    console.log("Jack's Barber Style → http://localhost:" + PORT);
    console.log('Staff area → http://localhost:' + PORT + '/admin/');
    console.log('Staff login: admin / ' + DEFAULT_PASSWORD);
  });
}

module.exports = server;
