const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function isWeekdayGroup(row) {
  if (!row) return false;
  if (row.id === 'weekdays') return true;
  return /mon/i.test(row.label || '') && /fri/i.test(row.label || '');
}

function findRow(schedule, matcher) {
  return schedule.find(matcher);
}

function rowTemplate(row, fallback) {
  var base = row || fallback || {};
  return {
    open: base.open || '',
    close: base.close || '',
    closed: !!base.closed
  };
}

function normalizeHoursSchedule(hours) {
  if (!hours || !Array.isArray(hours.schedule)) return hours;

  var schedule = hours.schedule;
  if (
    schedule.length === 7 &&
    schedule.every(function (row, i) {
      return row.id === DAY_IDS[i] || row.label === DAY_LABELS[i];
    })
  ) {
    return hours;
  }

  var byId = {};
  schedule.forEach(function (row) {
    if (row && row.id) byId[row.id] = row;
  });

  var weekdays = byId.weekdays || findRow(schedule, isWeekdayGroup);
  var saturday = byId.saturday || findRow(schedule, function (r) {
    return r.id === 'saturday' || /sat/i.test(r.label || '');
  });
  var sunday = byId.sunday || findRow(schedule, function (r) {
    return r.id === 'sunday' || /sun/i.test(r.label || '');
  });

  var weekdayDefaults = rowTemplate(weekdays, { open: '09:00', close: '18:00', closed: false });
  var saturdayDefaults = rowTemplate(saturday, { open: '08:00', close: '16:00', closed: false });
  var sundayDefaults = rowTemplate(sunday, { open: '', close: '', closed: true });

  hours.schedule = DAY_IDS.map(function (id, i) {
    if (byId[id]) {
      return {
        id: id,
        label: DAY_LABELS[i],
        open: byId[id].open || '',
        close: byId[id].close || '',
        closed: !!byId[id].closed
      };
    }

    if (id === 'saturday') {
      return Object.assign({ id: id, label: DAY_LABELS[i] }, saturdayDefaults);
    }

    if (id === 'sunday') {
      return Object.assign({ id: id, label: DAY_LABELS[i] }, sundayDefaults);
    }

    return Object.assign({ id: id, label: DAY_LABELS[i] }, weekdayDefaults);
  });

  return hours;
}

module.exports = {
  DAY_IDS,
  DAY_LABELS,
  normalizeHoursSchedule
};
