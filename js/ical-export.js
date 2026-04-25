/* ===== ICAL-EXPORT.JS — iCalendar (.ics) export module ===== */
/* RFC 5545 iCalendar 2.0 — No external dependencies            */
/* Compatible with file:// and PWA                              */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// RFC 5545 TEXT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escapes special characters in iCalendar text values (RFC 5545 §3.3.11).
 * Escapes: \, ;, ,  and newlines.
 */
function icsEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds iCalendar content lines to max 75 octets (RFC 5545 §3.1).
 * Continuation lines start with a single space (LWSP).
 */
function icsFold(line) {
  var MAX = 75;
  if (line.length <= MAX) return line;

  var useTextEncoder = (typeof TextEncoder !== 'undefined');

  if (!useTextEncoder) {
    // Fallback: fold by character count (safe for ASCII-only content)
    var parts = [];
    var pos = 0;
    while (pos < line.length) {
      var limit = (pos === 0) ? MAX : MAX - 1;
      parts.push((pos === 0 ? '' : ' ') + line.slice(pos, pos + limit));
      pos += limit;
    }
    return parts.join('\r\n');
  }

  // Fold by octet count to be fully RFC-compliant with UTF-8 content
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  var bytes = encoder.encode(line);
  if (bytes.length <= MAX) return line;

  var parts = [];
  var bytePos = 0;
  var isFirst = true;

  while (bytePos < bytes.length) {
    var limit = isFirst ? MAX : MAX - 1; // -1 for leading space on continuation
    var end = bytePos + limit;
    // Avoid splitting inside a multi-byte UTF-8 sequence
    while (end < bytes.length && (bytes[end] & 0xC0) === 0x80) end--;
    var chunk = bytes.slice(bytePos, end);
    parts.push((isFirst ? '' : ' ') + decoder.decode(chunk));
    bytePos = end;
    isFirst = false;
  }

  return parts.join('\r\n');
}

/**
 * Formats a Date to iCalendar local datetime string "YYYYMMDDTHHMMSS".
 * Note: uses the JavaScript Date object's local (wall-clock) time.
 * This works correctly when the browser's timezone is Europe/Madrid.
 * The output is paired with TZID=Europe/Madrid in the iCalendar event.
 */
function formatICSLocal(date) {
  var y  = date.getFullYear();
  var mo = String(date.getMonth() + 1).padStart(2, '0');
  var d  = String(date.getDate()).padStart(2, '0');
  var h  = String(date.getHours()).padStart(2, '0');
  var mi = String(date.getMinutes()).padStart(2, '0');
  var s  = String(date.getSeconds()).padStart(2, '0');
  return y + mo + d + 'T' + h + mi + s;
}

/**
 * Formats a Date to iCalendar UTC datetime string "YYYYMMDDTHHMMSSZ".
 * Used for DTSTAMP (which must be UTC).
 */
function formatICSUTC(date) {
  var y  = date.getUTCFullYear();
  var mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  var d  = String(date.getUTCDate()).padStart(2, '0');
  var h  = String(date.getUTCHours()).padStart(2, '0');
  var mi = String(date.getUTCMinutes()).padStart(2, '0');
  var s  = String(date.getUTCSeconds()).padStart(2, '0');
  return y + mo + d + 'T' + h + mi + s + 'Z';
}

/**
 * Builds a stable, unique event UID.
 * Format: {personSlug}-{dateCompact}-{startSlug}@leadership-schedule
 */
function buildUID(personId, dateISO, startOrSuffix) {
  var slug = (personId || 'person').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  var datePart = (dateISO || '').replace(/-/g, '');
  var sfx = (startOrSuffix || 'shift').replace(/[^a-zA-Z0-9_:-]/g, '_');
  return slug + '-' + datePart + '-' + sfx + '@leadership-schedule';
}

// ─────────────────────────────────────────────────────────────────────────────
// VTIMEZONE — Europe/Madrid (CET/CEST) — RFC 5545 §3.6.5
// ─────────────────────────────────────────────────────────────────────────────

var VTIMEZONE_MADRID = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Madrid',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
].join('\r\n');

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a complete iCalendar 2.0 string (RFC 5545) from an array of events.
 *
 * @param {Array}  events        Array of event objects (see below).
 * @param {string} calendarName  Display name of the calendar.
 *
 * Event object shape:
 *   {
 *     uid:          string   — unique, stable identifier
 *     dtstart:      string   — "YYYYMMDDTHHMMSS" (local Europe/Madrid) or "YYYYMMDD" (all-day)
 *     dtend:        string   — "YYYYMMDDTHHMMSS" (local Europe/Madrid) or omitted for all-day
 *     summary:      string   — event title
 *     description:  string   — optional multi-line description (use \n as separator)
 *     location:     string   — optional location
 *     allDay:       boolean  — if true, emits DATE type (no time)
 *     alarmMinutes: number   — minutes before event for reminder (0 or omitted = no alarm)
 *   }
 *
 * @returns {string}  Full iCalendar content (UTF-8, CRLF line endings)
 */
function buildICS(events, calendarName) {
  var dtstamp = formatICSUTC(new Date());
  var lines = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(icsFold('PRODID:-//Leadership Schedule//iCal Export v1.0//ES'));
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(icsFold('X-WR-CALNAME:' + icsEscape(calendarName || 'Leadership Schedule')));
  lines.push('X-WR-TIMEZONE:Europe/Madrid');
  lines.push(VTIMEZONE_MADRID);

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    lines.push('BEGIN:VEVENT');
    lines.push(icsFold('UID:' + ev.uid));
    lines.push('DTSTAMP:' + dtstamp);

    if (ev.allDay) {
      lines.push('DTSTART;VALUE=DATE:' + ev.dtstart);
    } else {
      lines.push('DTSTART;TZID=Europe/Madrid:' + ev.dtstart);
      if (ev.dtend) lines.push('DTEND;TZID=Europe/Madrid:' + ev.dtend);
    }

    lines.push(icsFold('SUMMARY:' + icsEscape(ev.summary)));

    if (ev.description) {
      lines.push(icsFold('DESCRIPTION:' + icsEscape(ev.description)));
    }
    if (ev.location) {
      lines.push(icsFold('LOCATION:' + icsEscape(ev.location)));
    }

    if (ev.alarmMinutes && ev.alarmMinutes > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(icsFold('DESCRIPTION:Recordatorio: ' + icsEscape(ev.summary)));
      lines.push('TRIGGER:-PT' + ev.alarmMinutes + 'M');
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT TIME MAPPINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a planificador shift code to {start, end} time strings (HH:MM).
 * @param {string} shiftCode  e.g. 'Early S', 'Late', 'Close C1'
 * @param {string} season     'verano' | 'invierno'
 * @returns {{start:string, end:string}|null}
 */
function shiftCodeToTimes(shiftCode, season) {
  var isVerano = (season !== 'invierno');
  var MAP = {
    'Open':     { start: '07:00', end: '16:00' },
    'Early':    { start: '08:00', end: '17:00' },
    'Early S':  { start: '08:00', end: '17:00' },
    'Early C1': { start: '08:00', end: '17:00' },
    'Early C2': { start: '08:00', end: '17:00' },
    'Mid':      { start: '11:00', end: '20:00' },
    'Mid S':    { start: '11:00', end: '20:00' },
    'Late':     { start: '12:00', end: '21:00' },
    'Close':    isVerano ? { start: '13:00', end: '22:00' } : { start: '12:30', end: '21:30' },
    'Close C1': isVerano ? { start: '13:00', end: '22:00' } : { start: '12:30', end: '21:30' },
    'Close C2': isVerano ? { start: '13:00', end: '22:00' } : { start: '12:30', end: '21:30' },
    'LDOPS':    { start: '07:00', end: '16:00' },
    'Own':      { start: '09:00', end: '18:00' },
    'BH':       { start: '09:00', end: '18:00' },
    'TG':       { start: '09:00', end: '18:00' },
  };
  return MAP[shiftCode] || null;
}

/**
 * Parses a shift string like "09:00-18:00" into {start:"09:00", end:"18:00"}.
 * Returns null if the string is not a time range.
 */
function parseShiftTimeRange(shiftStr) {
  if (!shiftStr) return null;
  var m = shiftStr.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

/**
 * Resolves a shift to {start, end} times, trying direct time-range parse first,
 * then the shift-code lookup.
 */
function resolveShiftTimes(shift, season) {
  return parseShiftTimeRange(shift) || shiftCodeToTimes(shift, season) || null;
}

/**
 * Converts a date string (YYYY-MM-DD) and time string (HH:MM) to
 * an iCalendar local datetime string "YYYYMMDDTHHMMSS".
 */
function toICSLocal(dateISO, timeStr) {
  var dateParts = dateISO.split('-');
  var timeParts = (timeStr || '00:00').split(':');
  return dateParts[0] + dateParts[1] + dateParts[2] +
         'T' + String(timeParts[0] || '0').padStart(2, '0') +
         String(timeParts[1] || '0').padStart(2, '0') + '00';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE → EVENTS CONVERTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an array of scheduled-day objects for one person into iCalendar events.
 *
 * @param {Object} params
 *   personId    {string}  Unique identifier (used in UIDs)
 *   personName  {string}  Display name
 *   role        {string}  Role label, e.g. "Manager" or "Lead"
 *   days        {Array}   Array of day objects:
 *     { date: "YYYY-MM-DD", shift: string, dayLabel: string, activities: string[] }
 *
 * @param {Object} options
 *   season          {string}   'verano' | 'invierno'  (default: 'verano')
 *   location        {string}   Location field  (default: 'Tienda')
 *   includeDaysOff  {boolean}  Emit all-day "Día libre" for off/vacation days
 *   includeLunch    {boolean}  Emit sub-events for Lunch blocks in activities
 *   includeMeetings {boolean}  Emit sub-events for meeting blocks in activities
 *   includeDD       {boolean}  Emit sub-events for DD blocks in activities
 *   alarmMinutes    {number}   Minutes before shift for reminder (0 = none)
 *
 * @returns {Array}  Event objects ready for buildICS()
 */
function personScheduleToEvents(params, options) {
  var personId   = params.personId   || 'person';
  var personName = params.personName || '';
  var role       = params.role       || '';
  var days       = params.days       || [];

  var opts = Object.assign({
    season:          'verano',
    location:        'Tienda',
    includeDaysOff:  false,
    includeLunch:    true,
    includeMeetings: true,
    includeDD:       false,
    alarmMinutes:    0,
  }, options || {});

  var OFF_PATTERN = /^(off|libre|V|V25|TGD|F|Parental|Paternidad|Lactancia|UNPAID|BH_off|Holidays|Holiday|vacation)$/i;

  var events = [];

  for (var i = 0; i < days.length; i++) {
    var day = days[i];
    if (!day || !day.date) continue;

    var shift = day.shift || '';
    var isOff = !shift ||
      shift === 'OFF' || shift === 'Off' ||
      OFF_PATTERN.test(shift);

    if (isOff) {
      if (opts.includeDaysOff) {
        events.push({
          uid:     buildUID(personId, day.date, 'free'),
          dtstart: day.date.replace(/-/g, ''),
          allDay:  true,
          summary: '🌴 Día libre — ' + (personName || role),
        });
      }
      continue;
    }

    var times = resolveShiftTimes(shift, opts.season);
    if (!times) continue; // unrecognized shift, skip

    var dtstart = toICSLocal(day.date, times.start);
    var dtend   = toICSLocal(day.date, times.end);

    // Build description from activities array
    var descLines = [];
    if (day.activities && day.activities.length > 0) {
      descLines = day.activities.slice();
    }

    // Main shift event
    events.push({
      uid:         buildUID(personId, day.date, times.start.replace(':', '')),
      dtstart:     dtstart,
      dtend:       dtend,
      summary:     '\uD83D\uDCC5 Turno ' + role + ' ' + times.start + '-' + times.end,
      description: descLines.length ? descLines.join('\\n') : undefined,
      location:    opts.location,
      alarmMinutes: opts.alarmMinutes,
    });

    if (!day.activities || day.activities.length === 0) continue;

    // Sub-events from activities
    for (var j = 0; j < day.activities.length; j++) {
      var act = day.activities[j];
      var actMatch = act.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.*)/);
      if (!actMatch) continue;

      var actStart = actMatch[1];
      var actEnd   = actMatch[2];
      var actLabel = actMatch[3].trim();

      var isLunch   = /^lunch$/i.test(actLabel);
      var isDD      = /^dd$/i.test(actLabel);
      var isMeeting = /meeting|reunión|commercial|leadership/i.test(actLabel);

      if (isLunch && opts.includeLunch) {
        events.push({
          uid:     buildUID(personId, day.date, 'lunch-' + actStart.replace(':', '')),
          dtstart: toICSLocal(day.date, actStart),
          dtend:   toICSLocal(day.date, actEnd),
          summary: '\uD83C\uDF7D\uFE0F Lunch',
          location: opts.location,
          alarmMinutes: 0,
        });
      } else if (isDD && opts.includeDD) {
        events.push({
          uid:     buildUID(personId, day.date, 'dd-' + actStart.replace(':', '')),
          dtstart: toICSLocal(day.date, actStart),
          dtend:   toICSLocal(day.date, actEnd),
          summary: '\uD83D\uDCCB Daily Download (DD)',
          location: opts.location,
          alarmMinutes: 0,
        });
      } else if (isMeeting && opts.includeMeetings) {
        events.push({
          uid:     buildUID(personId, day.date, 'mtg-' + actStart.replace(':', '')),
          dtstart: toICSLocal(day.date, actStart),
          dtend:   toICSLocal(day.date, actEnd),
          summary: '\uD83D\uDCC5 ' + actLabel,
          location: opts.location,
          alarmMinutes: opts.alarmMinutes,
        });
      }
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers a browser download of an .ics file.
 * Works with file:// URLs and the PWA (uses <a download> pattern).
 */
function downloadICS(icsContent, filename) {
  var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename || 'schedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

/**
 * Converts a person name to a URL-safe slug.
 * "Ana García" → "ana-garcia"
 */
function nameToSlug(name) {
  return (name || 'persona')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE RANGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns { from: Date, to: Date } for the requested date range.
 * @param {string} range    'week' | '4weeks' | '13weeks' | 'custom'
 * @param {string} dateFrom Custom start date (YYYY-MM-DD)
 * @param {string} dateTo   Custom end date   (YYYY-MM-DD)
 */
function getICalDateRange(range, dateFrom, dateTo) {
  var today = new Date();
  // Get Monday of the current ISO week
  var dow = today.getDay() || 7; // Sun=0→7, Mon=1, …
  var monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1);
  monday.setHours(0, 0, 0, 0);

  var from, to;

  if (range === 'week') {
    from = new Date(monday);
    to   = new Date(monday);
    to.setDate(monday.getDate() + 6);
  } else if (range === '4weeks') {
    from = new Date(monday);
    to   = new Date(monday);
    to.setDate(monday.getDate() + 27);
  } else if (range === '13weeks') {
    from = new Date(monday);
    to   = new Date(monday);
    to.setDate(monday.getDate() + (13 * 7 - 1)); // 13 full weeks, ending on Sunday
  } else if (range === 'custom' && dateFrom) {
    from = new Date(dateFrom + 'T00:00:00');
    to   = dateTo ? new Date(dateTo + 'T23:59:59') : new Date(from);
    if (!dateTo) to.setDate(to.getDate() + 6);
  } else {
    from = new Date(monday);
    to   = new Date(monday);
    to.setDate(monday.getDate() + 6);
  }

  return { from: from, to: to };
}

/**
 * Filters a days array to only include dates in [from, to].
 */
function filterDaysByRange(days, from, to) {
  var fromISO = from.getFullYear() + '-' +
    String(from.getMonth() + 1).padStart(2, '0') + '-' +
    String(from.getDate()).padStart(2, '0');
  var toISO = to.getFullYear() + '-' +
    String(to.getMonth() + 1).padStart(2, '0') + '-' +
    String(to.getDate()).padStart(2, '0');
  return days.filter(function(d) { return d.date >= fromISO && d.date <= toISO; });
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPO PAGE — Model-week day builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates day objects for a team member's repeating model week over a date range.
 * Uses member.defaultShift (working days) and member.daysOff (0=Mon … 6=Sun).
 *
 * @param {Object} member   Team member object from equipo.html
 * @param {Date}   from     Range start (inclusive)
 * @param {Date}   to       Range end   (inclusive)
 * @returns {Array}  Day objects: { date, shift, dayLabel }
 */
function buildModelWeekDays(member, from, to) {
  var daysOff = new Set(member.daysOff || []);
  var days = [];
  var current = new Date(from);
  current.setHours(0, 0, 0, 0);
  var end = new Date(to);
  end.setHours(23, 59, 59, 999);

  var DAY_LABELS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  while (current <= end) {
    var dow = current.getDay(); // JS: 0=Sun, 1=Mon, …, 6=Sat
    var idx = (dow === 0) ? 6 : dow - 1; // Mon=0 … Sun=6

    var dateISO = current.getFullYear() + '-' +
      String(current.getMonth() + 1).padStart(2, '0') + '-' +
      String(current.getDate()).padStart(2, '0');

    days.push({
      date:     dateISO,
      shift:    daysOff.has(idx) ? 'OFF' : (member.defaultShift || '09:00-18:00'),
      dayLabel: DAY_LABELS[idx],
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANIFICADOR PAGE — 13-week schedule day builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds day objects for one person from the planificador's activeSchedule.
 *
 * @param {string}  personId       Person ID key in activeSchedule
 * @param {Object}  activeSchedule { personId: string[78] }
 * @param {string}  qStartDate     "YYYY-MM-DD" (Monday of Q week 1)
 * @param {string}  season         'verano' | 'invierno'
 * @param {Date}    from           Range start
 * @param {Date}    to             Range end
 * @returns {Array}
 */
function planificadorPersonToDays(personId, activeSchedule, qStartDate, season, from, to) {
  var DAYS_PER_WEEK_P = 6; // Mon–Sat
  var DAY_NAMES_P = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var sched = activeSchedule[personId];
  if (!sched) return [];

  var parts = qStartDate.split('-');
  var qStart = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  qStart.setHours(0, 0, 0, 0);

  var days = [];

  for (var w = 0; w < 13; w++) {
    for (var di = 0; di < DAYS_PER_WEEK_P; di++) {
      var cellDate = new Date(qStart);
      cellDate.setDate(qStart.getDate() + w * 7 + di);
      cellDate.setHours(0, 0, 0, 0);

      if (cellDate < from || cellDate > to) continue;

      var dateISO = cellDate.getFullYear() + '-' +
        String(cellDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(cellDate.getDate()).padStart(2, '0');

      var shift = sched[w * DAYS_PER_WEEK_P + di] || '';

      days.push({
        date:     dateISO,
        shift:    shift,
        dayLabel: DAY_NAMES_P[di],
      });
    }
  }

  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITOR PAGE — Day builder from parsed persons
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds day objects for one person from the auditor's parsed data.
 *
 * @param {Object} person    { name, role, days: { Mon:'shift', Tue:'shift', … } }
 * @param {Array}  weekDates [{ key:'Mon', label:'Lunes 7/4', isoDate?:'2026-04-07' }]
 * @returns {Array}
 */
function auditorPersonToDays(person, weekDates) {
  var days = [];
  for (var i = 0; i < weekDates.length; i++) {
    var wd = weekDates[i];
    if (!wd.isoDate) continue;
    var shift = (person.days && person.days[wd.key]) || '';
    days.push({
      date:     wd.isoDate,
      shift:    shift,
      dayLabel: wd.label || wd.key,
    });
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — iCal Export Options
// ─────────────────────────────────────────────────────────────────────────────

var _icalCallback = null;

/**
 * Opens the iCal export options modal.
 *
 * @param {Object} ctx
 *   title       {string}    Modal title
 *   personName  {string}    Used in default calendar name
 *   show13w     {boolean}   Show "13 semanas" option in range selector
 *   showPersons {boolean}   Show single/team person selector
 *   onDownload  {function}  Called with options object when user clicks Download
 */
function openICalModal(ctx) {
  _icalCallback = ctx.onDownload || null;

  if (!document.getElementById('ical-modal-overlay')) {
    _buildICalModal();
    _injectICalStyles();
  }

  var titleEl = document.getElementById('ical-modal-title');
  if (titleEl) titleEl.textContent = ctx.title || '📅 Exportar al calendario (.ics)';

  var nameEl = document.getElementById('ical-cal-name');
  if (nameEl) {
    nameEl.value = 'Leadership Schedule' + (ctx.personName ? ' \u2013 ' + ctx.personName : '');
  }

  var row13w = document.getElementById('ical-range-13w-opt');
  if (row13w) row13w.style.display = ctx.show13w ? '' : 'none';

  var personsRow = document.getElementById('ical-persons-row');
  if (personsRow) personsRow.style.display = ctx.showPersons ? '' : 'none';

  // Reset range select to 'week'
  var rangeEl = document.getElementById('ical-range');
  if (rangeEl) rangeEl.value = 'week';
  _icalRangeChange();

  var overlay = document.getElementById('ical-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeICalModal() {
  var overlay = document.getElementById('ical-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  _icalCallback = null;
}

function _icalDownloadClicked() {
  var cb = _icalCallback;
  if (!cb) { closeICalModal(); return; }

  var get = function(id) { return document.getElementById(id); };

  var opts = {
    range:             (get('ical-range') && get('ical-range').value) || 'week',
    calName:           (get('ical-cal-name') && get('ical-cal-name').value.trim()) || 'Leadership Schedule',
    includeWorkShifts: !get('ical-incl-work') || get('ical-incl-work').checked,
    includeDaysOff:    !!(get('ical-incl-free') && get('ical-incl-free').checked),
    includeLunch:      !get('ical-incl-lunch') || get('ical-incl-lunch').checked,
    includeMeetings:   !get('ical-incl-mtg')   || get('ical-incl-mtg').checked,
    includeDD:         !!(get('ical-incl-dd') && get('ical-incl-dd').checked),
    alarmMinutes:      parseInt((get('ical-reminder') && get('ical-reminder').value) || '0', 10),
    dateFrom:          (get('ical-date-from') && get('ical-date-from').value) || '',
    dateTo:            (get('ical-date-to')   && get('ical-date-to').value)   || '',
    persons:           (get('ical-persons') && get('ical-persons').value)     || 'single',
  };

  closeICalModal();
  cb(opts);
}

function _icalRangeChange() {
  var val = document.getElementById('ical-range');
  val = val ? val.value : 'week';
  var customRow = document.getElementById('ical-custom-range');
  if (customRow) customRow.style.display = (val === 'custom') ? '' : 'none';
}

function _buildICalModal() {
  var div = document.createElement('div');
  div.innerHTML =
    '<div id="ical-modal-overlay" class="ical-modal-overlay" onclick="if(event.target===this)closeICalModal()">' +
      '<div id="ical-modal" class="ical-modal" role="dialog" aria-modal="true" aria-labelledby="ical-modal-title">' +
        '<div class="ical-modal-header">' +
          '<h2 id="ical-modal-title">\uD83D\uDCC5 Exportar al calendario (.ics)</h2>' +
          '<button class="ical-modal-close" onclick="closeICalModal()" aria-label="Cerrar">\u2715</button>' +
        '</div>' +
        '<div class="ical-modal-body">' +

          '<div class="ical-form-row">' +
            '<label for="ical-range">Rango</label>' +
            '<select id="ical-range" onchange="_icalRangeChange()">' +
              '<option value="week">Esta semana (semana ISO actual)</option>' +
              '<option value="4weeks">Pr\u00f3ximas 4 semanas</option>' +
              '<option value="13weeks" id="ical-range-13w-opt" style="display:none">Pr\u00f3ximas 13 semanas</option>' +
              '<option value="custom">Rango personalizado</option>' +
            '</select>' +
          '</div>' +

          '<div class="ical-form-row ical-custom-range" id="ical-custom-range" style="display:none">' +
            '<label>Desde</label>' +
            '<input type="date" id="ical-date-from">' +
            '<label style="margin-left:8px">Hasta</label>' +
            '<input type="date" id="ical-date-to">' +
          '</div>' +

          '<div class="ical-form-row" id="ical-persons-row" style="display:none">' +
            '<label for="ical-persons">Personas</label>' +
            '<select id="ical-persons">' +
              '<option value="single">Esta persona</option>' +
              '<option value="team">Todo el equipo</option>' +
            '</select>' +
          '</div>' +

          '<div class="ical-form-row">' +
            '<label>Incluir</label>' +
            '<div class="ical-checks">' +
              '<label><input type="checkbox" id="ical-incl-work" checked> Turnos trabajados</label>' +
              '<label><input type="checkbox" id="ical-incl-free"> D\u00edas libres \uD83C\uDF34</label>' +
              '<label><input type="checkbox" id="ical-incl-lunch" checked> Lunches</label>' +
              '<label><input type="checkbox" id="ical-incl-mtg" checked> Reuniones especiales</label>' +
              '<label><input type="checkbox" id="ical-incl-dd"> DD (Daily Download)</label>' +
            '</div>' +
          '</div>' +

          '<div class="ical-form-row">' +
            '<label for="ical-reminder">Recordatorio</label>' +
            '<select id="ical-reminder">' +
              '<option value="0">Sin recordatorio</option>' +
              '<option value="15">15 min antes</option>' +
              '<option value="60">1 hora antes</option>' +
              '<option value="1440">1 d\u00eda antes</option>' +
            '</select>' +
          '</div>' +

          '<div class="ical-form-row">' +
            '<label for="ical-cal-name">Nombre del calendario</label>' +
            '<input type="text" id="ical-cal-name" placeholder="Leadership Schedule \u2013 Nombre">' +
          '</div>' +

        '</div>' +
        '<div class="ical-modal-footer">' +
          '<button class="ical-btn-cancel" onclick="closeICalModal()">Cancelar</button>' +
          '<button class="ical-btn-download" onclick="_icalDownloadClicked()">\u2B07\uFE0F Descargar .ics</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(div.firstElementChild);
}

function _injectICalStyles() {
  if (document.getElementById('ical-modal-styles')) return;
  var style = document.createElement('style');
  style.id = 'ical-modal-styles';
  style.textContent = [
    '.ical-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;',
    'align-items:center;justify-content:center;}',
    '.ical-modal-overlay.open{display:flex;}',
    '.ical-modal{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);',
    'border-radius:var(--radius,8px);box-shadow:0 8px 32px rgba(0,0,0,.2);',
    'width:min(520px,95vw);max-height:90vh;overflow-y:auto;color:var(--text,#2d3748);}',
    '.ical-modal-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:16px 20px 12px;border-bottom:1px solid var(--border,#e2e8f0);}',
    '.ical-modal-header h2{font-size:1rem;font-weight:700;margin:0;}',
    '.ical-modal-close{background:none;border:none;color:var(--text-muted,#718096);',
    'font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:4px;}',
    '.ical-modal-close:hover{background:var(--surface-alt,#f7fafc);}',
    '.ical-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}',
    '.ical-form-row{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;}',
    '.ical-form-row>label:first-child{min-width:140px;font-size:.85rem;font-weight:600;',
    'padding-top:6px;color:var(--text-muted,#718096);flex-shrink:0;}',
    '.ical-form-row select,.ical-form-row input[type="text"],.ical-form-row input[type="date"]{',
    'flex:1;min-width:120px;padding:6px 10px;border:1px solid var(--border,#e2e8f0);',
    'border-radius:6px;background:var(--surface-alt,#f7fafc);color:var(--text,#2d3748);',
    'font-size:.85rem;}',
    '.ical-checks{display:flex;flex-direction:column;gap:6px;flex:1;}',
    '.ical-checks label{display:flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;}',
    '.ical-modal-footer{display:flex;justify-content:flex-end;gap:10px;',
    'padding:12px 20px 16px;border-top:1px solid var(--border,#e2e8f0);}',
    '.ical-btn-cancel{padding:7px 16px;border:1px solid var(--border,#e2e8f0);border-radius:6px;',
    'background:var(--surface-alt,#f7fafc);color:var(--text,#2d3748);font-size:.85rem;cursor:pointer;}',
    '.ical-btn-cancel:hover{background:var(--border,#e2e8f0);}',
    '.ical-btn-download{padding:7px 18px;border:none;border-radius:6px;',
    'background:var(--accent,#2b6cb0);color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;}',
    '.ical-btn-download:hover{opacity:.88;}',
  ].join('');
  document.head.appendChild(style);
}

// Auto-inject styles on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectICalStyles);
  } else {
    _injectICalStyles();
  }
}
