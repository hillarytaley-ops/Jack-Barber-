module.exports = async function (req, res) {
  var steps = [];
  try {
    steps.push('start');
    require('fs');
    steps.push('fs');
    require('../server/store');
    steps.push('store');
    require('../server/auth-token');
    steps.push('auth-token');
    require('../server/payments');
    steps.push('payments');
    require('../server/handler');
    steps.push('handler');
    return res.status(200).json({ ok: true, steps: steps });
  } catch (e) {
    return res.status(500).json({
      steps: steps,
      error: e.message,
      stack: String(e.stack || '').split('\n').slice(0, 8)
    });
  }
};
