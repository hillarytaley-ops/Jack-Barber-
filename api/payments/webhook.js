require('@neondatabase/serverless');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { handleStripeWebhook } = require('../../server/payments');

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
    var sig = req.headers['stripe-signature'];
    var secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !sig) {
      return res.status(400).json({ error: 'Webhook not configured' });
    }
    var event = stripe.webhooks.constructEvent(buf, sig, secret);
    await handleStripeWebhook(event);
    return res.status(200).json({ received: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
