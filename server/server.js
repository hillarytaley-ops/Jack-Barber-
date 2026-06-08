const http = require('http');
const { handleRequest } = require('./handler');
const { isProduction } = require('./env');

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, function () {
    console.log("Jack's Barber Style → http://localhost:" + PORT);
    console.log('Staff area → http://localhost:' + PORT + '/admin/');
    if (!isProduction()) {
      console.log('Set ADMIN_PASSWORD and ADMIN_SECRET in production.');
    }
  });
}

module.exports = server;
