const { readJSON, writeJSON } = require('./store');
const { breakdown, isGstRegistered } = require('./gst');
const { sendTaxInvoice } = require('./invoice');

function getPayId() {
  return (process.env.PAYID || process.env.BUSINESS_PAYID || '').trim();
}

function getAbn() {
  return (process.env.BUSINESS_ABN || '').trim();
}

function azupayConfigured() {
  return !!(process.env.AZUPAY_CLIENT_ID && process.env.AZUPAY_SECRET);
}

function paymentsEnabled() {
  return !!getPayId() || azupayConfigured();
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

function buildPaymentInstructions(booking, settings) {
  const amount = Number(booking.amount) || getBookingTotal(settings, booking);
  const gstInfo = breakdown(amount);
  const payId = getPayId();
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const payIdName = process.env.PAYID_NAME || brand;

  return {
    method: 'payid',
    payId: payId,
    payIdName: payIdName,
    amount: amount,
    reference: booking.id,
    abn: getAbn(),
    gst: gstInfo.gst,
    net: gstInfo.net,
    gstRegistered: isGstRegistered(),
    instructions: [
      'Open your mobile banking app',
      'Choose Pay Anyone or PayID',
      'Enter PayID: ' + payId,
      'Confirm the name shown is: ' + payIdName,
      'Enter the exact amount: $' + amount.toFixed(2),
      'Use payment reference: ' + booking.id,
      'Your appointment is confirmed once we receive your payment (usually within minutes)'
    ]
  };
}

async function createAzupayPaymentRequest(booking, settings) {
  const amount = Number(booking.amount) || getBookingTotal(settings, booking);
  const apiBase = (process.env.AZUPAY_API_URL || 'https://api.azupay.com.au').replace(/\/$/, '');
  const clientId = process.env.AZUPAY_CLIENT_ID;
  const secret = process.env.AZUPAY_SECRET;
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";

  const authRes = await fetch(apiBase + '/v1/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: clientId, clientSecret: secret })
  });
  if (!authRes.ok) {
    throw new Error('Could not connect to PayID provider. Please pay using the instructions shown or call us.');
  }
  const authData = await authRes.json();
  const token = authData.accessToken || authData.token;
  if (!token) {
    throw new Error('PayID provider authentication failed.');
  }

  const paymentRes = await fetch(apiBase + '/v1/paymentRequest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      PaymentRequest: {
        paymentDescription: booking.service + ' - ' + brand,
        paymentAmount: amount.toFixed(2),
        paymentReference: booking.id,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    })
  });
  if (!paymentRes.ok) {
    throw new Error('Could not create PayID payment request. Please use the PayID details shown.');
  }
  const paymentData = await paymentRes.json();
  const pr = paymentData.PaymentRequest || paymentData.paymentRequest || paymentData;
  const instructions = buildPaymentInstructions(booking, settings);

  return {
    instructions: instructions,
    checkoutUrl: pr.checkoutUrl || pr.checkoutURL || null,
    payId: pr.payID || pr.payId || instructions.payId,
    providerPaymentId: pr.paymentRequestId || pr.id || null
  };
}

async function createPaymentRequest(booking, settings) {
  if (azupayConfigured()) {
    try {
      return await createAzupayPaymentRequest(booking, settings);
    } catch (e) {
      if (getPayId()) {
        return { instructions: buildPaymentInstructions(booking, settings), fallback: true };
      }
      throw e;
    }
  }
  if (!getPayId()) return null;
  return { instructions: buildPaymentInstructions(booking, settings) };
}

async function markBookingPaid(bookingId, details) {
  const bookings = await readJSON('bookings.json', []);
  const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
  if (idx === -1) return { ok: false, reason: 'not_found' };

  if (bookings[idx].paymentStatus === 'paid' && !details.force) {
    return { ok: true, booking: bookings[idx], alreadyPaid: true };
  }

  const amount = Number(details.amount) || Number(bookings[idx].amount) || 0;
  const gstInfo = breakdown(amount);

  bookings[idx].status = details.status || 'confirmed';
  bookings[idx].paymentStatus = 'paid';
  bookings[idx].paidAt = new Date().toISOString();
  bookings[idx].amount = amount;
  bookings[idx].paymentMethod = details.method || 'payid';
  bookings[idx].paymentReference = details.reference || bookingId;

  const existingTx = await readJSON('transactions.json', []);
  const hasTx = existingTx.some(function (t) { return t.bookingId === bookingId; });
  if (!hasTx) {
    existingTx.unshift({
      id: 't' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount: gstInfo.total,
      gst: gstInfo.gst,
      net: gstInfo.net,
      service: bookings[idx].service,
      clientName: bookings[idx].name,
      notes: (details.method || 'PayID') + ' payment - booking ' + bookingId,
      createdAt: new Date().toISOString(),
      bookingId: bookingId,
      paymentMethod: details.method || 'payid',
      paymentReference: details.reference || bookingId
    });
    await writeJSON('transactions.json', existingTx);
  }

  await writeJSON('bookings.json', bookings);

  let invoice = null;
  if (details.sendInvoice !== false && bookings[idx].email) {
    try {
      const settings = await readJSON('settings.json', { brand: { name: "Jack's Barber Style" }, contact: {} });
      invoice = await sendTaxInvoice(bookings[idx], settings);
      if (invoice && invoice.ok) {
        bookings[idx].invoiceNumber = invoice.invoiceNumber;
        bookings[idx].invoiceSentAt = new Date().toISOString();
        await writeJSON('bookings.json', bookings);
      }
    } catch (e) {
      invoice = { ok: false, error: e.message };
    }
  }

  return { ok: true, booking: bookings[idx], invoice: invoice };
}

async function handlePayIdWebhook(payload) {
  const bookingId =
    payload.paymentReference ||
    payload.reference ||
    (payload.PaymentRequest && payload.PaymentRequest.paymentReference) ||
    (payload.paymentRequest && payload.paymentRequest.paymentReference);
  if (!bookingId) return false;

  const amount = Number(
    payload.paymentAmount ||
    payload.amount ||
    (payload.PaymentRequest && payload.PaymentRequest.paymentAmount)
  ) || 0;

  const result = await markBookingPaid(bookingId, {
    amount: amount,
    method: 'payid',
    reference: bookingId
  });
  return result.ok;
}

module.exports = {
  paymentsEnabled,
  createPaymentRequest,
  buildPaymentInstructions,
  handlePayIdWebhook,
  getServicePrice,
  getTravelFee,
  getBookingTotal,
  siteUrl,
  markBookingPaid,
  getPayId,
  getAbn
};
