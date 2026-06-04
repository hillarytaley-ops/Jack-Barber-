const { readJSON, writeJSON } = require('./store');

let stripeClient = null;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = require('stripe')(key);
  return stripeClient;
}

function paymentsEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  return 'http://localhost:3000';
}

function getServicePrice(settings, serviceName) {
  const services = settings.services || [];
  for (let i = 0; i < services.length; i++) {
    if (services[i].name === serviceName) return Number(services[i].price) || 0;
  }
  return 0;
}

function getTravelFee(settings, serviceType) {
  if (serviceType !== 'home') return 0;
  const hs = settings.homeService || {};
  return Number(hs.travelFee) || 0;
}

function getBookingTotal(settings, booking) {
  return getServicePrice(settings, booking.service) + getTravelFee(settings, booking.serviceType);
}

async function createCheckoutSession(booking, settings) {
  const stripe = getStripe();
  if (!stripe) return null;

  const price = getBookingTotal(settings, booking);
  if (price <= 0) {
    throw new Error('Could not find a price for this service. Please call us to book.');
  }

  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const base = siteUrl();
  const when = booking.date + ' at ' + booking.time;
  const location = booking.serviceType === 'home'
    ? ('Home service — ' + (booking.address || 'client address'))
    : 'In-shop';

  const lineItems = [{
    price_data: {
      currency: 'aud',
      unit_amount: Math.round(getServicePrice(settings, booking.service) * 100),
      product_data: {
        name: booking.service + ' — ' + brand,
        description: location + ' on ' + when
      }
    },
    quantity: 1
  }];

  const travelFee = getTravelFee(settings, booking.serviceType);
  if (travelFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'aud',
        unit_amount: Math.round(travelFee * 100),
        product_data: {
          name: 'Home service travel fee',
          description: 'Travel to your address'
        }
      },
      quantity: 1
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: booking.email,
    client_reference_id: booking.id,
    metadata: {
      bookingId: booking.id,
      service: booking.service
    },
    success_url: base + '/?booking=success#book',
    cancel_url: base + '/?booking=cancelled&id=' + encodeURIComponent(booking.id) + '#book'
  });

  return session;
}

async function markBookingPaid(bookingId, details) {
  const bookings = await readJSON('bookings.json', []);
  const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
  if (idx === -1) return false;

  bookings[idx].status = 'confirmed';
  bookings[idx].paymentStatus = 'paid';
  bookings[idx].paidAt = new Date().toISOString();
  bookings[idx].amount = details.amount;
  bookings[idx].stripeSessionId = details.sessionId;
  await writeJSON('bookings.json', bookings);

  const transactions = await readJSON('transactions.json', []);
  transactions.unshift({
    id: 't' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    amount: details.amount,
    service: bookings[idx].service,
    clientName: bookings[idx].name,
    notes: 'Stripe card payment — booking ' + bookingId,
    createdAt: new Date().toISOString(),
    bookingId: bookingId,
    stripeSessionId: details.sessionId
  });
  await writeJSON('transactions.json', transactions);
  return true;
}

async function handleStripeWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata && session.metadata.bookingId;
    if (!bookingId) return;
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    await markBookingPaid(bookingId, { sessionId: session.id, amount: amount });
  }
}

module.exports = {
  getStripe,
  paymentsEnabled,
  createCheckoutSession,
  handleStripeWebhook,
  getServicePrice,
  getTravelFee,
  getBookingTotal,
  siteUrl,
  markBookingPaid
};
