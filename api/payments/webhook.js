const { handlePayIdWebhook } = require('../../server/payments');

function rawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    var buf = await rawBody(req);
    var payload = JSON.parse(buf.toString('utf8'));
    var eventType = payload.eventType || payload.type || payload.event;

    if (eventType && !/payment|complete|received|success/i.test(String(eventType))) {
      return res.status(200).json({ received: true, ignored: true });
    }

    var handled = await handlePayIdWebhook(payload);
    if (!handled && payload.PaymentRequest) {
      handled = await handlePayIdWebhook(payload.PaymentRequest);
    }
    return res.status(200).json({ received: true, handled: handled });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
