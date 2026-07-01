const { readJSON, writeJSON } = require('./store');
const { sendEmail } = require('./notify');
const { breakdown, isGstRegistered } = require('./gst');

function getAbn() {
  return (process.env.BUSINESS_ABN || '').trim();
}

async function nextInvoiceNumber() {
  const counter = await readJSON('invoice-counter.json', { last: 0, year: new Date().getFullYear() });
  const year = new Date().getFullYear();
  if (counter.year !== year) {
    counter.year = year;
    counter.last = 0;
  }
  counter.last += 1;
  await writeJSON('invoice-counter.json', counter);
  return 'JBS-INV-' + year + '-' + String(counter.last).padStart(4, '0');
}

function formatMoney(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function formatAppt(booking) {
  var when = booking.date || '';
  if (booking.time) when += (when ? ' at ' : '') + booking.time;
  if (booking.serviceType === 'home' && booking.address) {
    return booking.service + ' - Home service at ' + booking.address + (when ? ' (' + when + ')' : '');
  }
  return booking.service + ' - In-shop' + (when ? ' (' + when + ')' : '');
}

function buildTaxInvoiceHtml(booking, settings, invoiceNumber) {
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const contact = settings.contact || {};
  const amount = Number(booking.amount) || 0;
  const gstInfo = breakdown(amount);
  const abn = getAbn();
  const gstRegistered = isGstRegistered();
  const issued = new Date().toLocaleDateString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const gstRows = gstRegistered && gstInfo.gst > 0
    ? '<tr><td style="padding:8px 0;color:#555;">Subtotal (ex GST)</td><td style="text-align:right;">' + formatMoney(gstInfo.net) + '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#555;">GST (10%)</td><td style="text-align:right;">' + formatMoney(gstInfo.gst) + '</td></tr>'
    : '';

  const gstNote = gstRegistered
    ? (gstInfo.gst > 0 ? 'Total price includes GST.' : 'GST registered.')
    : 'No GST has been charged.';

  return (
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">' +
    '<h1 style="font-size:1.25rem;margin:0 0 4px;">TAX INVOICE</h1>' +
    '<p style="margin:0 0 16px;color:#555;">' + brand + '</p>' +
    '<p style="margin:0;line-height:1.5;">' +
    (contact.address || "47 O'Meara Street") + '<br>' +
    (contact.city || 'Wodonga, VIC 3690') + '<br>' +
    (abn ? 'ABN: ' + abn + '<br>' : '') +
    'Phone: ' + (contact.phoneDisplay || contact.phone || '0478 268 399') +
    '</p>' +
    '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">' +
    '<p style="margin:0 0 4px;"><strong>Invoice #:</strong> ' + invoiceNumber + '</p>' +
    '<p style="margin:0 0 4px;"><strong>Date:</strong> ' + issued + '</p>' +
    '<p style="margin:0 0 16px;"><strong>Booking ref:</strong> ' + booking.id + '</p>' +
    '<p style="margin:0 0 16px;"><strong>Bill to:</strong> ' + booking.name + '<br>' + (booking.email || '') + '</p>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' +
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">' + formatAppt(booking) + '</td>' +
    '<td style="text-align:right;border-bottom:1px solid #eee;">' + formatMoney(amount) + '</td></tr>' +
    gstRows +
    '<tr><td style="padding:12px 0;font-weight:bold;">TOTAL</td><td style="text-align:right;font-weight:bold;">' + formatMoney(amount) + '</td></tr>' +
    '</table>' +
    '<p style="margin:0 0 8px;color:#555;">' + gstNote + '</p>' +
    '<p style="margin:0;color:#555;">Payment method: ' + (booking.paymentMethod || 'PayID') +
    (booking.paymentReference ? ' | Reference: ' + booking.paymentReference : '') + '</p>' +
    '<p style="margin:24px 0 0;font-size:0.9rem;color:#777;">Thank you for booking with ' + brand + '.</p>' +
    '</div>'
  );
}

function buildTaxInvoiceText(booking, settings, invoiceNumber) {
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const amount = Number(booking.amount) || 0;
  const gstInfo = breakdown(amount);
  const abn = getAbn();
  const lines = [
    'TAX INVOICE',
    brand,
    abn ? 'ABN: ' + abn : '',
    'Invoice #: ' + invoiceNumber,
    'Booking ref: ' + booking.id,
    'Bill to: ' + booking.name + ' (' + (booking.email || '') + ')',
    '',
    formatAppt(booking) + ' - ' + formatMoney(amount),
    isGstRegistered() && gstInfo.gst > 0 ? 'GST included: ' + formatMoney(gstInfo.gst) : 'No GST charged',
    'TOTAL: ' + formatMoney(amount),
    '',
    'Thank you for your booking.'
  ];
  return lines.filter(Boolean).join('\n');
}

async function sendTaxInvoice(booking, settings, options) {
  options = options || {};
  if (!booking.email) {
    return { ok: false, skipped: true, reason: 'No client email on booking' };
  }
  if (booking.invoiceSentAt && !options.resend) {
    return { ok: false, skipped: true, reason: 'Invoice already sent' };
  }

  const invoiceNumber = booking.invoiceNumber || await nextInvoiceNumber();
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const html = buildTaxInvoiceHtml(Object.assign({}, booking, { invoiceNumber: invoiceNumber }), settings, invoiceNumber);
  const text = buildTaxInvoiceText(Object.assign({}, booking, { invoiceNumber: invoiceNumber }), settings, invoiceNumber);

  const result = await sendEmail({
    to: booking.email,
    subject: 'Tax invoice ' + invoiceNumber + ' - ' + brand,
    html: html,
    text: text
  });

  if (result.ok) {
    booking.invoiceNumber = invoiceNumber;
    booking.invoiceSentAt = new Date().toISOString();
  }

  return Object.assign({ invoiceNumber: invoiceNumber }, result);
}

module.exports = {
  buildTaxInvoiceHtml,
  buildTaxInvoiceText,
  sendTaxInvoice,
  nextInvoiceNumber
};
