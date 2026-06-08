const { readJSON, writeJSON } = require('./store');
const { sendEmail, sendSms } = require('./notify');

function normalizeTime(time) {
  if (!time) return '00:00';
  const t = String(time).trim();
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    if (ampm[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return String(h).padStart(2, '0') + ':' + m;
  }
  const parts = t.split(':');
  return String(parseInt(parts[0], 10)).padStart(2, '0') + ':'
    + String(parseInt(parts[1] || 0, 10)).padStart(2, '0');
}

function melbourneParts(date) {
  const f = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(date);
  const get = function (type) {
    return parseInt(f.find(function (x) { return x.type === type; }).value, 10);
  };
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute')
  };
}

function parseMelbourneAppointment(date, time) {
  const parts = date.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  const timeParts = normalizeTime(time).split(':').map(Number);
  const h = timeParts[0];
  const mi = timeParts[1];
  let ms = Date.UTC(y, mo - 1, d, h, mi);

  for (let n = 0; n < 5; n++) {
    const p = melbourneParts(new Date(ms));
    const diff = (h * 60 + mi) - (p.hour * 60 + p.minute) + (d - p.day) * 1440;
    if (diff === 0) return new Date(ms);
    ms -= diff * 60000;
  }

  return new Date(ms);
}

function formatDisplay(date, time) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(parseMelbourneAppointment(date, time));
}

function buildMessages(booking, settings, type) {
  const brand = (settings.brand && settings.brand.name) || "Jack's Barber Style";
  const when = formatDisplay(booking.date, booking.time);
  const service = booking.service;
  const location = booking.serviceType === 'home'
    ? ('Home service at ' + (booking.address || 'your address'))
    : ((settings.contact && settings.contact.address) + ', ' + (settings.contact && settings.contact.city));
  const phone = (settings.contact && settings.contact.phoneDisplay)
    || (settings.contact && settings.contact.phone)
    || '0478 268 399';

  if (type === 'dayBefore') {
    return {
      subject: 'Reminder: your ' + brand + ' appointment is tomorrow',
      html: '<p>Hi ' + booking.name + ',</p>'
        + '<p>This is a friendly reminder that your appointment at <strong>' + brand + '</strong> is <strong>tomorrow</strong>.</p>'
        + '<ul><li><strong>When:</strong> ' + when + '</li>'
        + '<li><strong>Service:</strong> ' + service + '</li>'
        + '<li><strong>Where:</strong> ' + location + '</li></ul>'
        + '<p>Questions or need to reschedule? Call ' + phone + '.</p>',
      sms: 'Hi ' + booking.name + ', reminder: your ' + brand + ' appointment is tomorrow (' + when + '). Service: ' + service + '. Call ' + phone + ' to change.'
    };
  }

  return {
    subject: 'Reminder: your ' + brand + ' appointment is in 1 hour',
    html: '<p>Hi ' + booking.name + ',</p>'
      + '<p>Your appointment at <strong>' + brand + '</strong> is in about <strong>one hour</strong>.</p>'
      + '<ul><li><strong>When:</strong> ' + when + '</li>'
      + '<li><strong>Service:</strong> ' + service + '</li>'
      + '<li><strong>Where:</strong> ' + location + '</li></ul>'
      + '<p>See you soon! Call ' + phone + ' if you are running late.</p>',
    sms: 'Hi ' + booking.name + ', your ' + brand + ' appointment is in about 1 hour (' + when + '). ' + location + '. Call ' + phone + ' if you are running late.'
  };
}

async function notifyClient(booking, settings, type) {
  const msg = buildMessages(booking, settings, type);
  const channels = [];

  const emailResult = await sendEmail({
    to: booking.email,
    subject: msg.subject,
    html: msg.html
  });
  if (emailResult.ok) channels.push('email');

  if (booking.phone) {
    const smsResult = await sendSms({ to: booking.phone, body: msg.sms });
    if (smsResult.ok) channels.push('sms');
  }

  if (!channels.length) {
    throw new Error('No notification channel configured. Add RESEND_API_KEY in Vercel (and Twilio for SMS).');
  }

  return channels;
}

async function processReminders() {
  const bookings = await readJSON('bookings.json', []);
  const settings = await readJSON('settings.json', {});
  const now = Date.now();
  const results = { dayBefore: 0, oneHour: 0, skipped: 0, errors: [] };
  let changed = false;

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (b.status !== 'confirmed') continue;
    if (!b.date || !b.time || !b.email) continue;

    const apptMs = parseMelbourneAppointment(b.date, b.time).getTime();
    if (apptMs <= now) continue;

    const msUntil = apptMs - now;
    b.reminders = b.reminders || {};

    if (!b.reminders.dayBefore && msUntil <= 25 * 3600000 && msUntil >= 22.5 * 3600000) {
      try {
        await notifyClient(b, settings, 'dayBefore');
        b.reminders.dayBefore = new Date().toISOString();
        results.dayBefore++;
        changed = true;
      } catch (e) {
        results.errors.push({ id: b.id, type: 'dayBefore', error: e.message });
      }
    }

    if (!b.reminders.oneHour && msUntil <= 75 * 60000 && msUntil >= 45 * 60000) {
      try {
        await notifyClient(b, settings, 'oneHour');
        b.reminders.oneHour = new Date().toISOString();
        results.oneHour++;
        changed = true;
      } catch (e) {
        results.errors.push({ id: b.id, type: 'oneHour', error: e.message });
      }
    }
  }

  if (changed) await writeJSON('bookings.json', bookings);
  return results;
}

module.exports = {
  processReminders,
  parseMelbourneAppointment,
  formatDisplay
};
