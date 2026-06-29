module.exports = async function (req, res) {
  return res.status(200).json({ ok: true, time: new Date().toISOString() });
};
