function isGstRegistered() {
  return process.env.GST_REGISTERED === 'true';
}

function gstFromInclusive(totalIncGst) {
  if (!isGstRegistered() || !totalIncGst) return 0;
  return Math.round((totalIncGst / 11) * 100) / 100;
}

function netFromInclusive(totalIncGst) {
  return Math.round((totalIncGst - gstFromInclusive(totalIncGst)) * 100) / 100;
}

function breakdown(totalIncGst) {
  const gst = gstFromInclusive(totalIncGst);
  return { total: totalIncGst, gst: gst, net: totalIncGst - gst };
}

module.exports = {
  isGstRegistered,
  gstFromInclusive,
  netFromInclusive,
  breakdown
};
