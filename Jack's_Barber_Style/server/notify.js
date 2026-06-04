function normalizeAuPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '61' + digits.slice(1);
  if (!digits.startsWith('61')) digits = '61' + digits;
  return '+' + digits;
}

async function sendEmail(opts) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, skipped: true, reason: 'RESEND_API_KEY not set' };
  }

  const from = process.env.REMINDER_FROM_EMAIL
    || process.env.RESEND_FROM_EMAIL
    || "Jack's Barber Style <onboarding@resend.dev>";

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, '')
    })
  });

  if (!res.ok) {
    throw new Error('Email failed: ' + (await res.text()));
  }

  return { ok: true };
}

async function sendSms(opts) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, skipped: true, reason: 'Twilio not configured' };
  }

  const to = normalizeAuPhone(opts.to);
  if (!to) return { ok: false, skipped: true, reason: 'Invalid phone number' };

  const auth = Buffer.from(sid + ':' + token).toString('base64');
  const res = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ To: to, From: from, Body: opts.body })
  });

  if (!res.ok) {
    throw new Error('SMS failed: ' + (await res.text()));
  }

  return { ok: true };
}

module.exports = { sendEmail, sendSms, normalizeAuPhone };
