require('@neondatabase/serverless');
const { processReminders } = require('../../server/reminders');

module.exports = async function (req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== 'Bearer ' + secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const results = await processReminders();
    return res.status(200).json({ ok: true, results: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
