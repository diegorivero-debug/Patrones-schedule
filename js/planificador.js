/* ===== PLANIFICADOR.JS — Motor de generación de horarios 13 semanas ===== */
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const WEEKS = 13;
const DAYS_PER_WEEK = 6; // Mon=0 … Sat=5
const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S'];
const DAY_NAMES  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const MON=0, TUE=1, WED=2, THU=3, FRI=4, SAT=5;
const DAY_CODE_TO_IDX = { MON, TUE, WED, THU, FRI, SAT };

// ─────────────────────────────────────────────────────────────────────────────
// TEAM DATA  (IDs match vacaciones.js)
// Read from TEAM_REGISTRY if available (loaded by team-registry.js), otherwise
// fall back to the static list below.
// ─────────────────────────────────────────────────────────────────────────────
const TEAM_DATA = (function () {
  if (window.TEAM_REGISTRY && window.TEAM_REGISTRY.getPeople) {
    // When team-registry.js is loaded, identity data comes from the shared
    // registry.  Constraints (.c) are NOT in the registry; they are merged
    // in below by mergeConfigConstraints() from CONFIG.planificador.
    return window.TEAM_REGISTRY.getPeople().map(function (p) {
      return { id: p.id, name: p.name, role: p.role, area: p.area, dept: p.dept };
    });
  }
  // Fallback (team-registry.js not loaded): static list with hardcoded constraints.
  // mergeConfigConstraints() will still override .c values from CONFIG if present.
  return [
  // Store Leaders — don't generate shifts (excluded from coverage count)
  { id:'diego',    name:'Diego Rivero',    role:'SL',           area:'Store',         dept:'Store'         },
  { id:'jordi',    name:'Jordi Pajares',   role:'SL',           area:'Store',         dept:'Store'         },
  // Senior Managers
  { id:'jorge',    name:'Jorge Gil',       role:'SM',           area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ fixedMorningDays:[MON,WED], neverOffDays:[MON,TUE,WED] }},
  { id:'sheila',   name:'Sheila Yubero',   role:'SM',           area:'People',        dept:'People',
    c:{ neverOffDays:[MON,TUE,WED] }},
  { id:'itziar',   name:'Itziar Cacho',    role:'SM',           area:'Support',       dept:'Support',
    c:{ neverOffDays:[MON,TUE,WED] }},
  { id:'cris_c',   name:'Cristina Carcel',  role:'SM',           area:'Ops',           dept:'Ops',
    c:{ morningOnlyWeekdays:true, neverOffDays:[MON,TUE,WED] }},
  // Managers
  { id:'jesus',    name:'Jesús Pazos',     role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'pedro',    name:'Pedro Borlido',   role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'julie',    name:'Julie Robin',     role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'javi_s',   name:'Javi Sanchez',     role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ aorFixedDays:[MON,FRI], avoidOffDays:[TUE,WED] }},
  { id:'meri',     name:'Meri Alvarez',    role:'MGR',          area:'People',        dept:'People',
    c:{ meriFixed:true }},
  { id:'toni',     name:'Toni Medina',     role:'MGR',          area:'People',        dept:'People',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'deborah',  name:'Deborah Ibañez',  role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'ane',      name:'Ana Maria Pazos',  role:'MGR',          area:'Support',       dept:'Support',
    c:{ weekAB:true, avoidOffDays:[TUE,WED] }},
  { id:'ricardo',  name:'Ricardo Sosa',    role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'javi_q',   name:'Javier Quiros',    role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'cris_u',   name:'Cristina Uson',    role:'MGR',          area:'Ops',           dept:'Ops',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'javi_can', name:'Javi Canfranc',   role:'MGR',          area:'Ops',           dept:'Ops',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'david',    name:'David Carrillo',  role:'MGR',          area:'Ops',           dept:'Ops',
    c:{ avoidOffDays:[TUE,WED] }},
  // Ops Leads
  { id:'aurora',   name:'Aurora Comesaña', role:'OPS_LEAD',     area:'Ops Lead',      dept:'Ops Lead',
    c:{ crossedWith:'ruben' }},
  { id:'ruben',    name:'Rubén Martínez',  role:'OPS_LEAD',     area:'Ops Lead',      dept:'Ops Lead',
    c:{ crossedWith:'aurora' }},
  // Lead Genius
  { id:'eva_f',    name:'Eva Famoso',      role:'LEAD_GENIUS',  area:'Lead Genius',   dept:'Lead Genius'   },
  { id:'eva_h',    name:'Eva Hernandez',   role:'LEAD_GENIUS',  area:'Lead Genius',   dept:'Lead Genius',  hours:32,
    c:{ morningOnly:true, altWeekend:true, hours32:true }},
  { id:'alberto',  name:'Alberto Ortiz',   role:'LEAD_SHOPPING',area:'Shopping',      dept:'Shopping'      },
  // Lead Shopping
  { id:'clara',    name:'Clara González',  role:'LEAD_SHOPPING',area:'Lead Shopping', dept:'Lead Shopping',
    c:{ neverOffThursday:true }},
  { id:'eli',      name:'Eli Moreno',      role:'LEAD_SHOPPING',area:'Lead Shopping', dept:'Lead Shopping',
    c:{ morningOnly:true, altWeekend:true }},
  ];
}());

// Merge CONFIG overrides into TEAM_DATA constraints
(function mergeConfigConstraints() {
  function normalizeDayList(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function (d) {
      if (typeof d === 'number') return d;
      if (typeof d === 'string' && DAY_CODE_TO_IDX[d] !== undefined) return DAY_CODE_TO_IDX[d];
      return d;
    }).filter(function (d) { return typeof d === 'number'; });
  }

  var C = window.CONFIG;
  if (!C || !C.planificador || !C.planificador.restriccionesPersonales) return;
  var overrides = C.planificador.restriccionesPersonales;
  var dayListFields = ['fixedMorningDays', 'neverOffDays', 'avoidOffDays', 'aorFixedDays', 'ownDays', 'ownNeverOn'];
  TEAM_DATA.forEach(function(p) {
    if (overrides[p.id]) {
      if (!p.c) p.c = {};
      Object.keys(overrides[p.id]).forEach(function(k) {
        var v = overrides[p.id][k];
        if (dayListFields.indexOf(k) !== -1) v = normalizeDayList(v);
        p.c[k] = v;
      });
    }
  });
})();

const TEAM_BY_ID = TEAM_DATA.reduce(function (acc, p) {
  acc[p.id] = p;
  return acc;
}, {});

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const SHIFT_DEFS = {
  'Open':     { block:'morning',   bg:'#dbeafe', text:'#1e40af', label:'Open 7-16'           },
  'Early':    { block:'morning',   bg:'#e0f2fe', text:'#0c4a6e', label:'Early 8-17'          },
  'Early S':  { block:'morning',   bg:'#bfdbfe', text:'#1d4ed8', label:'Early S 8-17'        },
  'Early C1': { block:'morning',   bg:'#c7d2fe', text:'#3730a3', label:'Early C1 8-17'       },
  'Early C2': { block:'morning',   bg:'#a5b4fc', text:'#3730a3', label:'Early C2 8-17'       },
  'Mid':      { block:'afternoon', bg:'#fef9c3', text:'#713f12', label:'Mid 11-20'           },
  'Mid S':    { block:'afternoon', bg:'#fef3c7', text:'#92400e', label:'Mid S 11-20'         },
  'Late':     { block:'afternoon', bg:'#ffedd5', text:'#9a3412', label:'Late 12-21'          },
  // Close labels are season-dependent; these are the summer defaults (13-22 / 12:30-21:30 winter)
  'Close':    { block:'afternoon', bg:'#fee2e2', text:'#991b1b', labelSummer:'Close 13-22',    labelWinter:'Close 12:30-21:30' },
  'Close C1': { block:'afternoon', bg:'#fecaca', text:'#991b1b', labelSummer:'Close C1 13-22', labelWinter:'Close C1 12:30-21:30' },
  'Close C2': { block:'afternoon', bg:'#fca5a5', text:'#7f1d1d', labelSummer:'Close C2 13-22', labelWinter:'Close C2 12:30-21:30' },
  'Own':      { block:'own',       bg:'#ede9fe', text:'#5b21b6', label:'Own'                 },
  'LDOPS':    { block:'ldops',     bg:'#dbeafe', text:'#1e3a8a', label:'LDOPS'               },
  'OFF':      { block:'off',       bg:'#f3f4f6', text:'#6b7280', label:'Libre'               },
  'V':        { block:'vacation',  bg:'#bbf7d0', text:'#166534', label:'Vacaciones'          },
  'V25':      { block:'vacation',  bg:'#fbcfe8', text:'#9d174d', label:'Vac. ant.'           },
  'TGD':      { block:'vacation',  bg:'#a7f3d0', text:'#065f46', label:'TGD'                 },
  'F':        { block:'vacation',  bg:'#fecaca', text:'#991b1b', label:'Festivo'             },
  'Parental': { block:'vacation',  bg:'#fed7aa', text:'#9a3412', label:'Parental'            },
  'Paternidad':{ block:'vacation', bg:'#fde68a', text:'#78350f', label:'Paternidad'          },
  'Lactancia':{ block:'vacation',  bg:'#fcd34d', text:'#78350f', label:'Lactancia'           },
  'UNPAID':   { block:'vacation',  bg:'#d1d5db', text:'#374151', label:'Sin sueldo'          },
};

// Returns the season-adjusted display label for a shift
function getShiftLabel(shift, season) {
  const def = SHIFT_DEFS[shift];
  if (!def) return shift;
  if (season === 'invierno') {
    if (def.labelWinter) return def.labelWinter;
  } else {
    if (def.labelSummer) return def.labelSummer;
  }
  return def.label || shift;
}

const ALL_SHIFT_OPTIONS = ['Open','Early','Early S','Early C1','Early C2','Mid','Mid S','Late',
                           'Close','Close C1','Close C2','Own','LDOPS','OFF','V','V25','TGD','F','Parental',
                           'Paternidad','Lactancia','UNPAID'];

function shiftBlock(s)   { return (s && SHIFT_DEFS[s]) ? SHIFT_DEFS[s].block : 'off'; }
function isMorning(s)    { return shiftBlock(s) === 'morning'; }
function isAfternoon(s)  { return shiftBlock(s) === 'afternoon'; }
function isOff(s)        { const b = shiftBlock(s); return b === 'off' || b === 'vacation'; }
function isWorking(s)    { return !isOff(s) && s !== null && s !== undefined; }
function isVacation(s)   { return shiftBlock(s) === 'vacation'; }
function countsForCoverage(id, s) {
  if (!isWorking(s) || isVacation(s)) return false;
  const p = TEAM_BY_ID[id];
  if (!p) return false;
  if (s === 'LDOPS') return false;
  if (s === 'Own' && p.c && p.c.ownCountsForCoverage === false) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// ─────────────────────────────────────────────────────────────────────────────
function makeRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function formatDate(date) {
  const d = String(date.getDate()).padStart(2,'0');
  const m = String(date.getMonth()+1).padStart(2,'0');
  return `${d}/${m}`;
}
function isoWeek(date) {
  // Returns ISO week number (1-52/53) for a given date
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Compute week start dates for the Q (13 Mondays)
function computeWeekDates(qStartStr) {
  const start = parseDate(qStartStr);
  return Array.from({length: WEEKS}, (_, i) => addDays(start, i * 7));
}

// QBR date: Wed 1 Jul 2026
const QBR_DATE = new Date(2026, 6, 1);
function isQBRDay(qStartStr, weekIdx, dayIdx) {
  const wd = addDays(parseDate(qStartStr), weekIdx * 7 + dayIdx);
  return wd.getFullYear() === QBR_DATE.getFullYear() &&
         wd.getMonth()    === QBR_DATE.getMonth()    &&
         wd.getDate()     === QBR_DATE.getDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR HELPERS (uses calendar-2026.js when loaded)
// ─────────────────────────────────────────────────────────────────────────────

// Returns the ISO date string (YYYY-MM-DD) of the Sunday for a given week
// (Monday-anchored week: weekMon + 6 days = Sunday).
function getSundayISODate(weekMonDate) {
  const sun = addDays(weekMonDate, 6);
  const y   = sun.getFullYear();
  const m   = String(sun.getMonth() + 1).padStart(2, '0');
  const d   = String(sun.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns true if the Sunday of the given week (0-based) is an open Sunday
// according to CALENDAR_2026. Falls back to false if the calendar is not loaded.
function isOpenSundayWeek(weekIdx, qStartStr) {
  if (typeof CALENDAR_2026 === 'undefined') return false;
  const weekDates  = computeWeekDates(qStartStr);
  const isoDate    = getSundayISODate(weekDates[weekIdx]);
  return CALENDAR_2026.sundaysOpen.indexOf(isoDate) !== -1;
}

// Returns the opening hours object for a given week's Sunday (or null if closed)
function getSundayOpeningHours(weekIdx, qStartStr) {
  if (typeof CALENDAR_2026 === 'undefined') return null;
  const weekDates = computeWeekDates(qStartStr);
  const isoDate   = getSundayISODate(weekDates[weekIdx]);
  return CALENDAR_2026.getOpeningHours(isoDate);
}

// Shift to assign to staff working on an open Sunday.
// Summer Sunday (12-20): 'Mid S' (11-20); Regular Sunday (11-21): 'Mid S' (11-20) or 'Late' (12-21)
const SUNDAY_SHIFT_MORNING = 'Mid S';   // first wave: 09:00/10:00 entry → 11:00-20:00 range
const SUNDAY_SHIFT_LATE    = 'Late';    // second wave: 12:00-21:00


class ScheduleGenerator {
  constructor(config, seed) {
    this.config  = config;
    this.seed    = seed;
    this.rng     = makeRNG(seed + 1000);
    this.qStart  = config.qStartDate;
    this.season  = config.season; // 'verano' | 'invierno'

    // schedule: { personId: [TOTAL_DAYS strings|null] }
    this.sched = {};
    for (const p of TEAM_DATA) {
      this.sched[p.id] = new Array(TOTAL_DAYS).fill(null);
    }

    // Sunday schedule: { personId: [WEEKS strings|null] }
    // null = not working this Sunday; shift string = working that Sunday.
    this.sundaySched = {};
    for (const p of TEAM_DATA) {
      this.sundaySched[p.id] = new Array(WEEKS).fill(null);
    }

    // Load vacation data from localStorage
    this.vacData = this._loadVacations();

    // Load approved requests from equipo.html
    this.approvedRequests = this._loadApprovedRequests();

    // Rotation state (influenced by seed for variant diversity)
    // SM Wed-Sat rotation: which SM pair goes morning this week
    // Pairs among {sheila, itziar} rotating with Cris always morning Mon-Fri
    // Jorge always morning Mon+Wed

    // For each week: who among {jorge, sheila, itziar} goes morning Wed-Sat
    // (cris_c always morning Mon-Fri; can be either Sat)
    // Encode as index into rotation cycle
    this._smRotSeed = seed % 3;

    // Manager morning/afternoon per week (0=morning, 1=afternoon)
    // Will be computed during generation
    this._mgrWeekBlock = {}; // personId -> array[13] of 'morning'|'afternoon'

    // Ops Lead: Aurora morning on even weeks+seed?
    this._auroraMorningW1 = (seed % 2 === 0);

    // Lead Genius Eva F / Alberto rotation
    this._evafMorningW1 = (seed % 2 === 0);

    // Clara morning/afternoon
    this._claraMorningW1 = (seed % 2 === 0);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  idx(w, d) { return w * DAYS_PER_WEEK + d; }
  get(id, w, d) { return this.sched[id][this.idx(w, d)]; }

  // Set only if not already a vacation/absence (unless force=true)
  set(id, w, d, val, force=false) {
    const cur = this.get(id, w, d);
    if (!force && isVacation(cur)) return;
    this.sched[id][this.idx(w, d)] = val;
  }

  // ── Load vacations ──────────────────────────────────────────────────────────
  _loadVacations() {
    // vacaciones_${year}: { data: {personId: {weekNum: absenceType}}, periods: [] }
    // Load data for the start year and also the following year in case the
    // 13-week quarter spans a year boundary (e.g. Q4: Nov → Feb).
    function loadYear(year) {
      const raw = localStorage.getItem(`vacaciones_${year}`);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed.data || {};
      } catch(e) { return {}; }
    }

    const startYear = parseDate(this.qStart).getFullYear();
    const endDate   = addDays(parseDate(this.qStart), (WEEKS - 1) * 7 + 5); // last day of Q
    const endYear   = endDate.getFullYear();

    const data = loadYear(startYear);

    if (endYear !== startYear) {
      // Merge next-year data (next year wins on conflict, though conflicts shouldn't happen)
      const nextData = loadYear(endYear);
      for (const [personId, weekMap] of Object.entries(nextData)) {
        if (!data[personId]) {
          data[personId] = weekMap;
        } else {
          Object.assign(data[personId], weekMap);
        }
      }
    }

    return data;
  }

  // ── Load approved requests from equipo.html ─────────────────────────────────
  _loadApprovedRequests() {
    // Primary: read from the flat 'schedule_requests' key (written by equipo.html syncRequests)
    const rawFlat = localStorage.getItem('schedule_requests');
    if (rawFlat) {
      try {
        const all = JSON.parse(rawFlat);
        if (Array.isArray(all)) return all.filter(r => r.status === 'approved');
      } catch(e) {}
    }
    // Fallback: extract from full team model
    const rawTeam = localStorage.getItem('schedule_team');
    if (!rawTeam) return [];
    try {
      const team = JSON.parse(rawTeam);
      const allMembers = [...(team.leads || []), ...(team.managers || [])];
      const result = [];
      for (const m of allMembers) {
        for (const req of (m.requests || [])) {
          if (req.status === 'approved') {
            result.push(Object.assign({}, req, { memberId: m.id }));
          }
        }
      }
      return result;
    } catch(e) { return []; }
  }

  // ── Apply approved requests to the schedule ──────────────────────────────────
  // Called right after _applyVacations() so vacations take priority.
  // Supported request types:
  //   - day-off        : force a specific day to OFF
  //   - morning-day    : force a specific day to morning shift
  //   - morning-week   : force all weekdays of the specified week to morning
  _applyApprovedRequests() {
    const weekDates = computeWeekDates(this.qStart);
    const DAY_NAME_TO_IDX = {
      'Lunes': MON, 'Martes': TUE, 'Miércoles': WED, 'Miercoles': WED,
      'Jueves': THU, 'Viernes': FRI, 'Sábado': SAT, 'Sabado': SAT,
    };

    for (const req of this.approvedRequests) {
      const personId = req.memberId;
      if (!personId || !this.sched[personId]) continue;

      // Parse ISO week string "2026-W16" → Monday date
      let reqMonday = null;
      if (req.week && /^\d{4}-W\d{1,2}$/.test(req.week)) {
        const [yearStr, wStr] = req.week.split('-W');
        const yr = parseInt(yearStr, 10);
        const wk = parseInt(wStr, 10);
    // ISO 8601: week 1 is the week containing Jan 4; Monday offset calculated from Jan 4.
        const jan4 = new Date(yr, 0, 4);
        const day = (jan4.getDay() + 6) % 7; // days since Monday (0=Mon)
        const monday = new Date(jan4);
        monday.setDate(jan4.getDate() - day + (wk - 1) * 7);
        reqMonday = monday;
      }
      if (!reqMonday) continue;

      // Find which Q-week this corresponds to
      const weekIdx = weekDates.findIndex(wd => {
        return wd.getFullYear() === reqMonday.getFullYear() &&
               wd.getMonth() === reqMonday.getMonth() &&
               wd.getDate() === reqMonday.getDate();
      });
      if (weekIdx < 0) continue; // not in this Q

      const type = req.type;

      if (type === 'morning-week') {
        // Force all weekdays (Mon-Fri) to morning shift
        for (let d = MON; d <= FRI; d++) {
          if (!isVacation(this.get(personId, weekIdx, d))) {
            const p = TEAM_BY_ID[personId];
            const shift = (p && p.c && p.c.morningOnly) ? 'Early' : 'Early S';
            this.set(personId, weekIdx, d, shift, true);
          }
        }
      } else if (type === 'morning-day' || type === 'day-off') {
        const dayIdx = DAY_NAME_TO_IDX[req.day];
        if (dayIdx === undefined || dayIdx > SAT) continue;
        if (isVacation(this.get(personId, weekIdx, dayIdx))) continue;

        if (type === 'day-off') {
          this.set(personId, weekIdx, dayIdx, 'OFF', true);
        } else { // morning-day
          const p = TEAM_BY_ID[personId];
          const shift = (p && p.c && p.c.morningOnly) ? 'Early' : 'Early S';
          this.set(personId, weekIdx, dayIdx, shift, true);
        }
      }
    }
  }

  // Apply vacation/absence entries to the schedule cells
  _applyVacations() {
    const weekDates = computeWeekDates(this.qStart);
    for (const [personId, weekMap] of Object.entries(this.vacData)) {
      if (!this.sched[personId]) continue;
      weekDates.forEach((wdStart, wi) => {
        // ISO week number of this Q week's Monday
        const weekNum = isoWeek(wdStart);
        const absenceRaw = weekMap[weekNum];
        const absence = typeof absenceRaw === 'string' ? absenceRaw : (absenceRaw?.type || null);
        if (absence && SHIFT_DEFS[absence]) {
          // Mark all 6 days of that week as the absence type
          // (The vacaciones module stores one entry per week meaning the person is absent)
          // We mark Mon-Sat as the absence code
          for (let d = 0; d < DAYS_PER_WEEK; d++) {
            this.sched[personId][this.idx(wi, d)] = absence;
          }
        }
      });
    }
  }

  // ── SM rotation ──────────────────────────────────────────────────────────────
  // Two alternating week types (anchored to seed so each variant is different):
  //   • MORNING WEEK  : all 4 SMs do morning every working day (Mon–Sat)
  //   • MIXED WEEK    : Mon+Tue all morning; Wed–Sat split morning/afternoon
  //     Wed : Jorge + Cris → morning; Sheila + Itziar → afternoon (Late)
  //     Thu/Fri: Cris always morning + 1 rotating from {Jorge, Sheila, Itziar}
  //              → 2 morning + 2 afternoon (Late)
  //     Sat : morning/afternoon pair rotation across all 4 SMs
  //
  // Afternoon-shift rules (Late = 12-21; Mid = 11-20):
  //   • cris_c : never Late → always Mid
  //   • sheila/itziar on Wed : Late
  //   • jorge/sheila/itziar on Thu/Fri/Sat : Late
  _assignSMRotation() {
    const smIds = ['jorge','sheila','itziar','cris_c'];

    // Thu/Fri morning rotation cycles through {jorge, sheila, itziar} (3-week cycle)
    const thuFriMorningRotation = ['jorge', 'sheila', 'itziar'];
    // Sat morning-pair rotation (all 4 SMs participate; 6-cycle)
    const satCycles = [
      ['jorge','sheila'],
      ['sheila','itziar'],
      ['jorge','itziar'],
      ['jorge','cris_c'],
      ['sheila','cris_c'],
      ['itziar','cris_c'],
    ];

    for (let w = 0; w < WEEKS; w++) {
      // Check which SMs are on vacation this week
      const onVac = (id) => {
        let vacDays = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isVacation(this.get(id, w, d))) vacDays++;
        }
        return vacDays >= 3; // majority of week = on vacation
      };

      // Alternating week type: even offset = morning week, odd = mixed week
      const isMorningWeek = (w + this._smRotSeed) % 2 === 0;

      // Mon + Tue: ALL 4 SMs → morning (both week types)
      for (const id of smIds) {
        if (onVac(id)) continue;
        this.set(id, w, MON, this._smMorningShift(id));
        this.set(id, w, TUE, this._smMorningShift(id));
      }

      if (isMorningWeek) {
        // ── MORNING WEEK: all SMs do morning Wed–Sat as well ──────────────
        for (const id of smIds) {
          if (onVac(id)) continue;
          this.set(id, w, WED, this._smMorningShift(id));
          this.set(id, w, THU, this._smMorningShift(id));
          this.set(id, w, FRI, this._smMorningShift(id));
          this.set(id, w, SAT, this._smMorningShift(id));
        }
      } else {
        // ── MIXED WEEK: Mon+Tue morning; Wed–Sat split ────────────────────
        // Wed: Jorge + Cris → morning; Sheila + Itziar → afternoon (Late)
        if (!onVac('jorge'))  this.set('jorge',  w, WED, this._smMorningShift('jorge'));
        if (!onVac('cris_c')) this.set('cris_c', w, WED, this._smMorningShift('cris_c'));
        if (!onVac('sheila')) this.set('sheila', w, WED, this._smAfternoonShift('sheila', WED));
        if (!onVac('itziar')) this.set('itziar', w, WED, this._smAfternoonShift('itziar', WED));

        // Thu + Fri: Cris always morning + 1 rotating → 2 morning + 2 afternoon (Late)
        const thuFriIdx = (w + this._smRotSeed) % thuFriMorningRotation.length;
        const thuFriMorning = new Set(['cris_c', thuFriMorningRotation[thuFriIdx]]);
        for (const id of smIds) {
          if (onVac(id)) continue;
          const shift = thuFriMorning.has(id)
            ? this._smMorningShift(id)
            : this._smAfternoonShift(id, THU);
          this.set(id, w, THU, shift);
          this.set(id, w, FRI, shift);
        }

        // Sat: rotate morning pairs across all 4 SMs (6-cycle)
        const satIdx = (w * 2 + this._smRotSeed * 3) % satCycles.length;
        const satMorning = new Set(satCycles[satIdx]);
        for (const id of smIds) {
          if (onVac(id)) continue;
          const shift = satMorning.has(id)
            ? this._smMorningShift(id)
            : this._smAfternoonShift(id, SAT);
          this.set(id, w, SAT, shift);
        }
      }
    }
  }

  _smMorningShift(id) {
    if (id === 'jorge')  return 'Early';   // Jorge: 8-17
    if (id === 'cris_c') return 'Early S'; // Cris Carcel: morning
    return 'Early';
  }
  // cris_c never does Late (only Mid); Sheila/Itziar can do Late on Wed;
  // Jorge/Sheila/Itziar can do Late on Thu, Fri, Sat.
  _smAfternoonShift(id, day) {
    if (id === 'cris_c') return 'Mid';
    if (day === WED || day === THU || day === FRI || day === SAT) return 'Late';
    return 'Mid';
  }

  // ── Manager shifts (same shift all week; 50/50 balance across Q) ────────────
  _assignManagerShifts() {
    const managers = TEAM_DATA.filter(p => p.role === 'MGR');

    // Determine morning/afternoon for each manager for each week
    // Balance: each manager should have ~6-7 morning weeks and ~6-7 afternoon weeks
    // Department mix: avoid all managers from same dept on same shift each day

    // Group managers by dept
    const deptGroups = {};
    for (const p of managers) {
      if (!deptGroups[p.dept]) deptGroups[p.dept] = [];
      deptGroups[p.dept].push(p.id);
    }

    // Pre-assign Meri Alvarez (special case): always 'mixed'
    // Mon/Tue = afternoon (Mid), Wed-Fri = morning (Early S)
    // Handle separately in cell assignment

    // Pre-assign Ane Pazos (Week A = morning, Week B = afternoon)
    // W1 = Week A (W1 of Q = week 0), alternating

    // For others: use balanced rotation with dept mix constraint
    // Strategy: alternate morning/afternoon by week, offset by seed for each person
    for (const p of managers) {
      if (p.id === 'meri' || p.id === 'ane') continue; // handled separately
      let morningCount = 0;
      const weekBlocks = [];
      for (let w = 0; w < WEEKS; w++) {
        // Check if on vacation
        let vacWeek = false;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isVacation(this.get(p.id, w, d))) { vacWeek = true; break; }
        }
        if (vacWeek) { weekBlocks.push('vacation'); continue; }

        // Determine block: alternate with some seed variation
        const baseOffset = TEAM_DATA.findIndex(t => t.id === p.id);
        const isMorn = ((w + baseOffset + this.seed) % 2 === 0);
        weekBlocks.push(isMorn ? 'morning' : 'afternoon');
        if (isMorn) morningCount++;
      }
      this._mgrWeekBlock[p.id] = weekBlocks;
    }

    // Rebalance: ensure each manager has roughly WEEKS/2 morning weeks
    for (const p of managers) {
      if (p.id === 'meri' || p.id === 'ane') continue;
      const blocks = this._mgrWeekBlock[p.id];
      const morningWeeks = blocks.filter(b => b === 'morning').length;
      const target = Math.round(WEEKS / 2);
      if (morningWeeks > target + 1) {
        // Convert some morning to afternoon
        let toConvert = morningWeeks - target;
        for (let w = WEEKS - 1; w >= 0 && toConvert > 0; w--) {
          if (blocks[w] === 'morning') { blocks[w] = 'afternoon'; toConvert--; }
        }
      } else if (morningWeeks < target - 1) {
        let toConvert = target - morningWeeks;
        for (let w = 0; w < WEEKS && toConvert > 0; w++) {
          if (blocks[w] === 'afternoon') { blocks[w] = 'morning'; toConvert--; }
        }
      }
    }

    // Check dept mix and adjust if all same dept on same block
    for (let w = 0; w < WEEKS; w++) {
      for (const [dept, ids] of Object.entries(deptGroups)) {
        const activeIds = ids.filter(id => {
          const b = this._mgrWeekBlock[id];
          return b && b[w] !== 'vacation';
        });
        if (activeIds.length <= 1) continue;
        const allMorning = activeIds.every(id => this._mgrWeekBlock[id][w] === 'morning');
        const allAfternoon = activeIds.every(id => this._mgrWeekBlock[id][w] === 'afternoon');
        if (allMorning || allAfternoon) {
          // Flip the last person in the group
          const lastId = activeIds[activeIds.length - 1];
          if (this._mgrWeekBlock[lastId][w] === 'morning') {
            this._mgrWeekBlock[lastId][w] = 'afternoon';
          } else {
            this._mgrWeekBlock[lastId][w] = 'morning';
          }
        }
      }
    }

    // Now assign actual shifts to schedule cells
    for (const p of managers) {
      for (let w = 0; w < WEEKS; w++) {
        // Special: Meri Alvarez
        if (p.id === 'meri') {
          this._assignMeriAlvarez(w);
          continue;
        }
        // Special: Ane Pazos (Week A = odd index=0,2,4... Week B = even index=1,3,5...)
        // W1 of Q = Week A (index 0): morning Mon-Fri, Sat OFF
        if (p.id === 'ane') {
          this._assignAnePazos(w);
          continue;
        }

        if (isVacation(this.get(p.id, w, MON))) continue; // vacation week

        const block = this._mgrWeekBlock[p.id]?.[w] || 'morning';
        let shift;
        if (block === 'morning') {
          shift = 'Early S';
        } else {
          // Distribute afternoon shifts: mix Close C1/C2, Late, Mid for variety.
          // Using a 4-way rotation so at least 2 of every 4 afternoon managers
          // get a Coach close shift (C1/C2), meeting the "min 2 Coach" rule.
          const pIdx = managers.findIndex(m => m.id === p.id);
          const afIndex = (pIdx + w + this.seed) % 4;
          if (afIndex === 0) shift = 'Close C1';
          else if (afIndex === 1) shift = 'Close C2';
          else if (afIndex === 2) shift = 'Late';
          else shift = 'Mid';
        }
        // Assign Mon-Fri
        for (let d = MON; d <= FRI; d++) {
          this.set(p.id, w, d, shift);
        }
        // Sat: assigned later in _assignWeekendWorkdays
      }
    }
  }

  // ── Balance daily (per-week) morning/afternoon distribution ─────────────────
  // Called after _assignManagerShifts to fix weeks where too many managers
  // ended up on the same block (morning or afternoon).
  // Target per active week: ≥ MIN_CLOSING_MANAGERS with a Close shift,
  // and roughly 50% morning / 50% afternoon among all managers.
  _balanceDailyCoverage() {
    const MIN_CLOSING_MANAGERS = 2; // need at least 2 managers on Close shifts
    const managers = TEAM_DATA.filter(
      p => p.role === 'MGR' && p.id !== 'meri' && p.id !== 'ane'
    );

    for (let w = 0; w < WEEKS; w++) {
      // Active managers this week (not on vacation)
      const active = managers.filter(
        p => !isVacation(this.get(p.id, w, MON))
      );
      if (active.length === 0) continue;

      // Count by block using MON as the representative day
      const morning  = active.filter(p => isMorning(this.get(p.id, w, MON)));
      const afternoon = active.filter(p => isAfternoon(this.get(p.id, w, MON)));
      const closing  = active.filter(p => {
        const s = this.get(p.id, w, MON);
        return s === 'Close' || s === 'Close C1' || s === 'Close C2';
      });

      // Step 1: ensure minimum closing-shift managers
      if (closing.length < MIN_CLOSING_MANAGERS) {
        const needed = MIN_CLOSING_MANAGERS - closing.length;
        // First try from afternoon non-Close people, then from morning
        const aftNonClose = afternoon.filter(p => {
          const s = this.get(p.id, w, MON);
          return s !== 'Close' && s !== 'Close C1' && s !== 'Close C2';
        });
        const pool = [...aftNonClose, ...morning];
        const toPromote = pool.slice(0, needed);
        let coachIdx = closing.length; // start from existing close coach count
        for (const p of toPromote) {
          const closeShift = (coachIdx % 2 === 0) ? 'Close C1' : 'Close C2';
          for (let d = MON; d <= FRI; d++) {
            if (!isVacation(this.get(p.id, w, d))) {
              this.set(p.id, w, d, closeShift);
            }
          }
          if (this._mgrWeekBlock[p.id]) this._mgrWeekBlock[p.id][w] = 'afternoon';
          coachIdx++;
        }
      }

      // Step 2: recount and balance overall morning/afternoon ratio (~50/50)
      const activeCurrent = managers.filter(
        p => !isVacation(this.get(p.id, w, MON))
      );
      const mornNow = activeCurrent.filter(p => isMorning(this.get(p.id, w, MON)));
      const aftNow  = activeCurrent.filter(p => isAfternoon(this.get(p.id, w, MON)));
      const target  = Math.round(activeCurrent.length / 2);

      if (mornNow.length > target + 1) {
        // Too many morning → flip some to afternoon
        const excess = mornNow.length - target;
        const candidates = mornNow.slice(-excess); // take from the end of the list
        let idx = 0;
        for (const p of candidates) {
          const pIdx = managers.findIndex(m => m.id === p.id);
          // Assign Close C1/C2/Late/Mid in round-robin
          const afIdx = (pIdx + w + this.seed + idx) % 4;
          const shift = afIdx === 0 ? 'Close C1'
                      : afIdx === 1 ? 'Close C2'
                      : afIdx === 2 ? 'Late'
                      : 'Mid';
          for (let d = MON; d <= FRI; d++) {
            if (!isVacation(this.get(p.id, w, d))) {
              this.set(p.id, w, d, shift);
            }
          }
          if (this._mgrWeekBlock[p.id]) this._mgrWeekBlock[p.id][w] = 'afternoon';
          idx++;
        }
      } else if (aftNow.length > target + 1) {
        // Too many afternoon → flip some to morning
        const excess = aftNow.length - target;
        const candidates = aftNow.slice(-excess);
        for (const p of candidates) {
          for (let d = MON; d <= FRI; d++) {
            if (!isVacation(this.get(p.id, w, d))) {
              this.set(p.id, w, d, 'Early S');
            }
          }
          if (this._mgrWeekBlock[p.id]) this._mgrWeekBlock[p.id][w] = 'morning';
        }
      }
    }
  }

  _assignMeriAlvarez(w) {
    // Mon 10-22, Tue 10-19 → afternoon. Wed-Fri 7-16 → morning
    if (isVacation(this.get('meri', w, MON))) return;
    this.set('meri', w, MON, 'Mid');    // 10-22 ≈ afternoon
    this.set('meri', w, TUE, 'Mid');    // 10-19 ≈ afternoon
    this.set('meri', w, WED, 'Open');   // 7-16 ≈ morning
    this.set('meri', w, THU, 'Open');
    this.set('meri', w, FRI, 'Open');
    // No _mgrWeekBlock for meri, mark as mixed
    if (!this._mgrWeekBlock['meri']) this._mgrWeekBlock['meri'] = [];
    this._mgrWeekBlock['meri'][w] = 'mixed';
  }

  _assignAnePazos(w) {
    if (isVacation(this.get('ane', w, MON))) return;
    const isWeekA = (w % 2 === 0); // W1 (index 0) = Week A
    if (!this._mgrWeekBlock['ane']) this._mgrWeekBlock['ane'] = [];
    if (isWeekA) {
      // Week A: Mon-Fri morning, Sat OFF
      for (let d = MON; d <= FRI; d++) this.set('ane', w, d, 'Early S');
      this.set('ane', w, SAT, 'OFF', true);
      this._mgrWeekBlock['ane'][w] = 'morning';
    } else {
      // Week B: flexible → use seed to determine
      const block = (w + this.seed) % 2 === 0 ? 'morning' : 'afternoon';
      const shift = block === 'morning' ? 'Early S' : 'Mid';
      for (let d = MON; d <= FRI; d++) this.set('ane', w, d, shift);
      this._mgrWeekBlock['ane'][w] = block;
    }
  }

  // ── Ops Leads (Aurora + Rubén always crossed) ──────────────────────────────
  _assignOpsLeads() {
    for (let w = 0; w < WEEKS; w++) {
      const auroraVac = isVacation(this.get('aurora', w, MON));
      const rubenVac  = isVacation(this.get('ruben',  w, MON));

      let auroraMorning;
      if (auroraVac && !rubenVac) {
        auroraMorning = false; // Ruben goes morning
      } else if (rubenVac && !auroraVac) {
        auroraMorning = true;  // Aurora goes morning
      } else if (auroraVac && rubenVac) {
        continue; // both on vacation
      } else {
        // Alternate by week, with seed offset
        auroraMorning = ((w + (this._auroraMorningW1 ? 0 : 1)) % 2 === 0);
      }

      const auroraShift = auroraMorning ? 'Open' : 'Close';
      const rubenShift  = auroraMorning ? 'Close' : 'Open';

      for (let d = MON; d <= SAT; d++) {
        if (!isVacation(this.get('aurora', w, d))) this.set('aurora', w, d, auroraShift);
        if (!isVacation(this.get('ruben',  w, d))) this.set('ruben',  w, d, rubenShift);
      }
    }
  }

  // ── Lead Genius (Eva H always morning; Eva F + Alberto rotate) ─────────────
  _assignLeadGenius() {
    for (let w = 0; w < WEEKS; w++) {
      // Eva Hernandez: always morning (unbreakable)
      if (!isVacation(this.get('eva_h', w, MON))) {
        for (let d = MON; d <= SAT; d++) {
          if (!isVacation(this.get('eva_h', w, d))) {
            this.set('eva_h', w, d, 'Early');
          }
        }
      }

      // Eva Famoso + Alberto: rotate morning/afternoon
      const evafMorning = ((w + (this._evafMorningW1 ? 0 : 1)) % 2 === 0);
      if (!isVacation(this.get('eva_f', w, MON))) {
        const shift = evafMorning ? 'Early' : 'Mid';
        for (let d = MON; d <= SAT; d++) {
          if (!isVacation(this.get('eva_f', w, d))) this.set('eva_f', w, d, shift);
        }
      }
      if (!isVacation(this.get('alberto', w, MON))) {
        const shift = (!evafMorning) ? 'Early' : 'Mid'; // crossed with Eva F
        for (let d = MON; d <= SAT; d++) {
          if (!isVacation(this.get('alberto', w, d))) this.set('alberto', w, d, shift);
        }
      }
    }
  }

  // ── Lead Shopping (Eli always morning; Clara rotates, no off Thu) ──────────
  _assignLeadShopping() {
    for (let w = 0; w < WEEKS; w++) {
      // Eli Moreno: always morning
      if (!isVacation(this.get('eli', w, MON))) {
        for (let d = MON; d <= SAT; d++) {
          if (!isVacation(this.get('eli', w, d))) this.set('eli', w, d, 'Early S');
        }
      }

      // Clara González: rotate morning/afternoon; never OFF on Thursday
      if (!isVacation(this.get('clara', w, MON))) {
        const claraMorn = ((w + (this._claraMorningW1 ? 0 : 1)) % 2 === 0);
        const shift = claraMorn ? 'Early S' : 'Mid';
        for (let d = MON; d <= SAT; d++) {
          if (!isVacation(this.get('clara', w, d))) this.set('clara', w, d, shift);
        }
      }
    }
  }

  // ── Assign weekend work days and days off ─────────────────────────────────
  _assignDaysOff() {
    // For each person, for each week:
    // - If not on vacation this week
    // - Determine if they work Saturday this week (finde sí/no, alternating, equity)
    // - Mark 1 day as OFF (+ Sat if not working, or a weekday if working Sat)
    // - Respect "never off" and "avoid off" constraints

    const workSatPattern = {}; // personId -> array[13] bool

    // SMs and Managers: alternating Sat work, equity ~6-7
    const smMgrIds = TEAM_DATA.filter(p => p.role === 'SM' || p.role === 'MGR').map(p => p.id);
    for (const id of smMgrIds) {
      const personIdx = TEAM_DATA.findIndex(p => p.id === id);
      workSatPattern[id] = Array.from({length: WEEKS}, (_, w) => {
        if (isVacation(this.get(id, w, SAT))) return false;
        // Alternate with offset from personIdx + seed
        return ((w + personIdx + this.seed) % 2 === 0);
      });
    }

    // Leads: some have altWeekend constraint (Eva H, Eli), others follow pattern
    const leadIds = TEAM_DATA.filter(p =>
      ['OPS_LEAD','LEAD_GENIUS','LEAD_SHOPPING'].includes(p.role)).map(p => p.id);
    for (const id of leadIds) {
      const p = TEAM_DATA.find(t => t.id === id);
      const personIdx = TEAM_DATA.findIndex(t => t.id === id);
      workSatPattern[id] = Array.from({length: WEEKS}, (_, w) => {
        if (isVacation(this.get(id, w, SAT))) return false;
        if (p.c?.altWeekend) {
          // Strict alternating: W1=off for Eva H and Eli
          return (w % 2 === 1); // W1(0)=off, W2(1)=work
        }
        return ((w + personIdx + this.seed) % 2 === 0);
      });
    }

    // Ane Pazos override: Week A (even index) = always OFF Sat
    if (workSatPattern['ane']) {
      for (let w = 0; w < WEEKS; w++) {
        if (w % 2 === 0) workSatPattern['ane'][w] = false; // Week A = OFF Sat
      }
    }

    // Apply weekend work / days off
    for (const p of TEAM_DATA) {
      if (p.role === 'SL') continue; // Skip Store Leaders
      const pattern = workSatPattern[p.id];
      if (!pattern) continue;

      for (let w = 0; w < WEEKS; w++) {
        // Check if vacation week
        let vacDays = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isVacation(this.get(p.id, w, d))) vacDays++;
        }
        if (vacDays >= 4) continue; // mostly on vacation

        // ── Sunday workers: enforce 2 CONSECUTIVE days off from Mon-Sat ───────
        // "cuando se abre un domingo, los días libres de managers y leads SIEMPRE
        //  deben ir juntos" (grouped / consecutive days off rule).
        const worksSunday = this.sundaySched[p.id]?.[w] != null;
        if (worksSunday) {
          const pair = this._pickConsecutiveDaysOff(p, w);
          this.set(p.id, w, pair[0], 'OFF', true);
          this.set(p.id, w, pair[1], 'OFF', true);
          // Update Sat pattern: they work Sat only if Sat is NOT in the off pair
          const satOff = pair.includes(SAT);
          pattern[w] = !satOff;
          if (satOff) {
            this.set(p.id, w, SAT, 'OFF', true);
          }
          // Fill remaining Mon-Fri weekday cells with shift
          this._fillWeekdayShift(p, w);
          if (!satOff && !isWorking(this.get(p.id, w, SAT))) {
            this.set(p.id, w, SAT, this._getSatShift(p.id, w));
          }
          continue; // skip the standard days-off logic below
        }

        let workSat = pattern[w];

        // Before giving Saturday off, verify minimum Saturday coverage won't be breached.
        // Use workSatPattern as the authoritative source for who will work Saturday —
        // this avoids overcounting people whose pre-assigned Saturday shifts will be
        // removed later in _fillRemaining().
        if (!workSat && !isVacation(this.get(p.id, w, SAT))) {
          const satMin = getMinStaffByDay(SAT);
          let satWorkers = 0;
          for (const t of TEAM_DATA) {
            if (t.role === 'SL' || t.id === p.id) continue;
            const tSat = this.get(t.id, w, SAT);
            if (workSatPattern[t.id] != null) {
              // workSatPattern is the canonical intent; use it to predict final Saturday state
              if (workSatPattern[t.id][w] && !isVacation(tSat)) satWorkers++;
            } else if (countsForCoverage(t.id, tSat)) {
              satWorkers++;
            }
          }
          // If adding this person's OFF would leave Saturday below the minimum, override
          if (satWorkers < satMin) {
            workSat = true; // force this person to work Saturday
            pattern[w] = true;
          }
        }

        if (!workSat) {
          // Don't work Saturday → mark Sat as OFF, overriding any pre-assigned shift.
          // Pre-assigned shifts (from _assignSMRotation, _assignOpsLeads, etc.) must be
          // cleared so _fillRemaining() and coverage counts see the correct final state.
          if (!isVacation(this.get(p.id, w, SAT))) {
            this.set(p.id, w, SAT, 'OFF', true);
          }
          // Work Mon-Fri (5 days) — no weekday off needed
          // Fill any remaining null weekdays with shift
          this._fillWeekdayShift(p, w);
        } else {
          // Work Saturday → need 1 weekday off
          const weekdayOff = this._pickWeekdayOff(p, w);
          this.set(p.id, w, weekdayOff, 'OFF', true);
          // Fill remaining null weekdays with shift
          this._fillWeekdayShift(p, w);
          // Ensure Sat has a shift
          if (!isWorking(this.get(p.id, w, SAT))) {
            const satShift = this._getSatShift(p.id, w);
            this.set(p.id, w, SAT, satShift);
          }
        }
      }
    }
  }

  // ── Reglas Own (SM + People Manager) ────────────────────────────────────────
  _applyOwnDaysRules() {
    for (const p of TEAM_DATA) {
      if (p.role === 'SL') continue;
      const c = p.c || {};

      // Own fijo por día (SM: L/M)
      const ownDays = Array.isArray(c.ownDays) ? c.ownDays : [];
      if (ownDays.length > 0) {
        for (let w = 0; w < WEEKS; w++) {
          ownDays.forEach((d) => {
            const cur = this.get(p.id, w, d);
            if (!isVacation(cur)) this.set(p.id, w, d, 'Own', true);
          });
        }
      }

      // Own variable por semana (People Manager)
      const ownPerWeek = Number(c.ownPerWeek || 0);
      if (ownPerWeek <= 0) continue;
      const ownNeverOn = new Set(Array.isArray(c.ownNeverOn) ? c.ownNeverOn : []);
      const personIdx = TEAM_DATA.findIndex(t => t.id === p.id);

      for (let w = 0; w < WEEKS; w++) {
        const candidates = [];
        for (let d = MON; d <= FRI; d++) {
          if (ownNeverOn.has(d)) continue;
          const cur = this.get(p.id, w, d);
          if (isVacation(cur) || cur === 'OFF') continue;
          candidates.push(d);
        }
        if (candidates.length === 0) continue;
        const ownCount = Math.min(ownPerWeek, candidates.length);
        let start = (w + personIdx + this.seed) % candidates.length;
        for (let i = 0; i < ownCount; i++) {
          const d = candidates[(start + i) % candidates.length];
          this.set(p.id, w, d, 'Own', true);
        }
      }
    }
  }

  // ── Reglas LDOPS Ops Lead (3 días; si no, 2) ────────────────────────────────
  _applyOpsLeadLdopsRules() {
    const maxOverlap = (window.CONFIG && window.CONFIG.planificador &&
      window.CONFIG.planificador.opsLeadMaxSimultaneousLDOPS != null)
      ? window.CONFIG.planificador.opsLeadMaxSimultaneousLDOPS
      : 1;
    const aurora = TEAM_BY_ID['aurora'];
    const ruben  = TEAM_BY_ID['ruben'];
    if (!aurora || !ruben) return;

    function combinations(arr, k) {
      if (k <= 0) return [[]];
      if (k > arr.length) return [];
      const out = [];
      function rec(start, curr) {
        if (curr.length === k) { out.push(curr.slice()); return; }
        for (let i = start; i < arr.length; i++) {
          curr.push(arr[i]);
          rec(i + 1, curr);
          curr.pop();
        }
      }
      rec(0, []);
      return out;
    }

    for (let w = 0; w < WEEKS; w++) {
      const aCfg = aurora.c || {};
      const rCfg = ruben.c || {};
      const targetA = Number(aCfg.ldopsPerWeek || 0);
      const targetR = Number(rCfg.ldopsPerWeek || 0);
      const minA = Number(aCfg.ldopsMinPerWeek || targetA || 0);
      const minR = Number(rCfg.ldopsMinPerWeek || targetR || 0);
      const targetBoth = Math.min(targetA || 0, targetR || 0);
      const minBoth = Math.min(minA || 0, minR || 0);
      if (targetBoth <= 0) continue;

      const baseCoverage = new Array(DAYS_PER_WEEK).fill(0);
      for (let d = MON; d <= SAT; d++) {
        for (const t of TEAM_DATA) {
          if (t.role === 'SL') continue;
          const s = this.get(t.id, w, d);
          if (countsForCoverage(t.id, s)) baseCoverage[d]++;
        }
      }

      const aWorkDays = [];
      const rWorkDays = [];
      for (let d = MON; d <= SAT; d++) {
        const aShift = this.get('aurora', w, d);
        const rShift = this.get('ruben',  w, d);
        if (isWorking(aShift) && !isVacation(aShift) && aShift !== 'OFF') aWorkDays.push(d);
        if (isWorking(rShift) && !isVacation(rShift) && rShift !== 'OFF') rWorkDays.push(d);
      }

      let chosen = null;
      const desiredBoth = Array.from(new Set([targetBoth, minBoth])).filter(v => v > 0);

      for (const wantBoth of desiredBoth) {
        if (chosen) break;
        const wantA = wantBoth;
        const wantR = wantBoth;
        const kA = Math.min(wantA, aWorkDays.length);
        const aCombos = combinations(aWorkDays, kA);
        const kR = Math.min(wantR, rWorkDays.length);
        const rCombos = combinations(rWorkDays, kR);
        for (const aDays of aCombos) {
          if (chosen) break;
          const aSet = new Set(aDays);
          for (const rDays of rCombos) {
            const overlap = rDays.filter(d => aSet.has(d)).length;
            if (overlap > maxOverlap) continue;

            let ok = true;
            const rSet = new Set(rDays);
            for (let d = MON; d <= SAT; d++) {
              let cnt = baseCoverage[d];
              if (aSet.has(d) && countsForCoverage('aurora', this.get('aurora', w, d))) cnt--;
              if (rSet.has(d) && countsForCoverage('ruben',  this.get('ruben',  w, d))) cnt--;
              if (cnt < getMinStaffByDay(d)) { ok = false; break; }
            }
            if (!ok) continue;
            chosen = { aDays: aSet, rDays: rSet };
            break;
          }
        }
      }

      if (!chosen) continue;
      for (let d = MON; d <= SAT; d++) {
        if (chosen.aDays.has(d) && !isVacation(this.get('aurora', w, d))) this.set('aurora', w, d, 'LDOPS', true);
        if (chosen.rDays.has(d) && !isVacation(this.get('ruben',  w, d))) this.set('ruben',  w, d, 'LDOPS', true);
      }
    }
  }

  _fillWeekdayShift(p, w) {
    // Fill any null weekday cells (Mon-Fri) with the appropriate shift
    const block = this._mgrWeekBlock[p.id]?.[w];
    for (let d = MON; d <= FRI; d++) {
      const cur = this.get(p.id, w, d);
      if (cur !== null && cur !== undefined) continue;
      // Determine shift based on role and block
      this.set(p.id, w, d, this._getDefaultShift(p.id, w, block));
    }
  }

  _getDefaultShift(id, w, block) {
    const p = TEAM_DATA.find(t => t.id === id);
    if (!p) return 'Early S';

    if (p.role === 'OPS_LEAD') {
      // Should already be set, but default to Open
      const cur = this.get(id, w, MON);
      return cur || 'Open';
    }
    if (p.c?.morningOnly) return 'Early';
    if (block === 'afternoon') return 'Mid';
    if (block === 'mixed') {
      // For Meri: handled separately
      return 'Open';
    }
    return 'Early S'; // default morning
  }

  _getSatShift(id, w) {
    const p = TEAM_DATA.find(t => t.id === id);
    if (p?.role === 'OPS_LEAD') return this.get(id, w, MON) || 'Open';
    if (p?.c?.morningOnly) return 'Early';
    const block = this._mgrWeekBlock[id]?.[w];
    if (block === 'afternoon') return 'Mid';
    return 'Early S';
  }

  _pickWeekdayOff(p, w) {
    // Pick the best weekday to take off, respecting constraints and coverage minimums.
    const c = p.c || {};
    const neverOff = [...(c.neverOffDays || [])];
    const avoidOff = c.avoidOffDays || [];

    // Never off on Thursday for Clara
    if (p.id === 'clara') neverOff.push(THU);

    // Helper: count how many non-SL people work on day d in week w (excluding this person)
    const countWorking = (dayIdx) => {
      let count = 0;
      for (const t of TEAM_DATA) {
        if (t.role === 'SL' || t.id === p.id) continue;
        const s = this.get(t.id, w, dayIdx);
        if (countsForCoverage(t.id, s)) count++;
      }
      return count;
    };

    // Prefer candidate days not in neverOff/avoidOff and not already occupied by an Own day
    const candidates = [MON, THU, FRI].filter(d =>
      !neverOff.includes(d) && this.get(p.id, w, d) !== 'Own'
    );
    const pool0 = candidates.length > 0
      ? candidates
      : [MON,TUE,WED,THU,FRI].filter(d => !neverOff.includes(d) && this.get(p.id, w, d) !== 'Own');

    if (pool0.length === 0) {
      // Absolute fallback — respect nothing (shouldn't happen)
      const seedIdx = (w + TEAM_DATA.findIndex(t => t.id === p.id)) % 5;
      return [MON, TUE, WED, THU, FRI][seedIdx];
    }

    // Prefer days not in avoidOff
    const preferred = pool0.filter(d => !avoidOff.includes(d));
    const pool1 = preferred.length > 0 ? preferred : pool0;

    // Among preferred days, prefer those where coverage won't drop below minimum
    // (i.e., there will still be getMinStaffByDay(d) - 1 others working)
    const safeDays = pool1.filter(d => countWorking(d) >= getMinStaffByDay(d));
    const pool2 = safeDays.length > 0 ? safeDays : pool1;

    const idx = (w + TEAM_DATA.findIndex(t => t.id === p.id)) % pool2.length;
    return pool2[idx];
  }

  // ── Fill any remaining null cells ─────────────────────────────────────────
  _fillRemaining() {
    for (const p of TEAM_DATA) {
      if (p.role === 'SL') {
        // Store Leaders: leave as empty (manual)
        for (let i = 0; i < TOTAL_DAYS; i++) {
          if (this.sched[p.id][i] === null) this.sched[p.id][i] = '';
        }
        continue;
      }
      for (let w = 0; w < WEEKS; w++) {
        let workingDays = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isWorking(this.get(p.id, w, d))) workingDays++;
        }

        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (this.sched[p.id][this.idx(w, d)] !== null) continue;
          // Fill null with appropriate shift or OFF
          if (workingDays >= 5) {
            // Already at max work days
            this.sched[p.id][this.idx(w, d)] = 'OFF';
          } else {
            const block = this._mgrWeekBlock[p.id]?.[w];
            this.sched[p.id][this.idx(w, d)] = this._getDefaultShift(p.id, w, block);
            workingDays++;
          }
        }

        // Enforce max 5 working days
        let cnt = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isWorking(this.get(p.id, w, d))) cnt++;
        }
        if (cnt > 5) {
          // Mark extra days as OFF (prefer Sat, then Mon for SMs/Managers with weekend constraints)
          const toOff = cnt - 5;
          const offOrder = [SAT, MON, FRI, THU, WED, TUE];
          let offed = 0;
          for (const d of offOrder) {
            if (offed >= toOff) break;
            if (isWorking(this.get(p.id, w, d)) && !isVacation(this.get(p.id, w, d))) {
              const neverOff = [...(p.c?.neverOffDays || [])];
              if (p.c?.neverOffThursday) neverOff.push(THU);
              if (!neverOff.includes(d)) {
                this.sched[p.id][this.idx(w, d)] = 'OFF';
                offed++;
              }
            }
          }
        }

        // Ensure minimum 2 days off (including Sat if not working)
        cnt = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          if (isWorking(this.get(p.id, w, d))) cnt++;
        }
        if (cnt > 5) {
          // Force one more off
          for (let d = SAT; d >= MON; d--) {
            if (isWorking(this.get(p.id, w, d)) && !isVacation(this.get(p.id, w, d))) {
              const neverOff = [...(p.c?.neverOffDays || [])];
              if (p.c?.neverOffThursday) neverOff.push(THU);
              if (!neverOff.includes(d)) {
                this.sched[p.id][this.idx(w, d)] = 'OFF';
                break;
              }
            }
          }
        }
      }
    }
  }

  // ── Main generate ──────────────────────────────────────────────────────────
  generate() {
    this._applyVacations();
    this._applyApprovedRequests();
    this._assignSMRotation();
    this._assignManagerShifts();
    this._balanceDailyCoverage();  // ensure morning/afternoon balance + min closing staff
    this._assignOpsLeads();
    this._assignLeadGenius();
    this._assignLeadShopping();
    this._assignSundayShifts();   // must be called after all role shifts, before days-off
    this._applyOwnDaysRules();    // must run before _assignDaysOff so weekday coverage counts are accurate
    this._assignDaysOff();
    this._applyOpsLeadLdopsRules();
    this._fillRemaining();
    return this.sched;
  }

  // ── Assign Sunday shifts for open-Sunday weeks ─────────────────────────────
  // For each open-Sunday week (from CALENDAR_2026), assigns a rotating subset of
  // Managers and Leads to work Sunday. Results stored in this.sundaySched.
  // Sunday workers are then given 2 CONSECUTIVE days off from Mon-Sat in
  // _assignDaysOff() (the key "días libres juntos" rule).
  _assignSundayShifts() {
    if (typeof CALENDAR_2026 === 'undefined') return; // calendar not loaded

    const eligibleRoles = ['SM','MGR','OPS_LEAD','LEAD_GENIUS','LEAD_SHOPPING'];
    const eligible = TEAM_DATA.filter(p => eligibleRoles.includes(p.role));
    const leads    = eligible.filter(p => ['OPS_LEAD','LEAD_GENIUS','LEAD_SHOPPING'].includes(p.role));
    const mgrs     = eligible.filter(p => ['SM','MGR'].includes(p.role));

    for (let w = 0; w < WEEKS; w++) {
      if (!isOpenSundayWeek(w, this.qStart)) continue;

      const onVac = (id) => isVacation(this.get(id, w, MON)) || isVacation(this.get(id, w, SAT));

      // Available staff: not on vacation this week
      const availLeads = leads.filter(p => !onVac(p.id));
      const availMgrs  = mgrs.filter(p => !onVac(p.id));

      // Rotate: pick ~half of each group, targeting 3 Leads + 7 Managers.
      // Use (personIndex + week + seed) % 2 to stagger who works which Sundays.
      const sunLeads = availLeads.filter((p, i) => ((i + w + this.seed) % 2 === 0)).slice(0, 3);
      const sunMgrs  = availMgrs.filter((p, i)  => ((i + w + this.seed) % 2 === 0)).slice(0, 7);

      // Ensure minimum staffing: if too few, add from the other half
      if (sunLeads.length < 2 && availLeads.length > 0) {
        for (const p of availLeads) {
          if (!sunLeads.includes(p)) sunLeads.push(p);
          if (sunLeads.length >= 3) break;
        }
      }
      if (sunMgrs.length < 5 && availMgrs.length > 0) {
        for (const p of availMgrs) {
          if (!sunMgrs.includes(p)) sunMgrs.push(p);
          if (sunMgrs.length >= 7) break;
        }
      }

      const isSummerSun = (typeof CALENDAR_2026 !== 'undefined') && CALENDAR_2026.isSummerSunday(
        getSundayISODate(computeWeekDates(this.qStart)[w])
      );

      for (const p of [...sunLeads, ...sunMgrs]) {
        // Assign morning or late Sunday shift based on rotation
        const pIdx = eligible.findIndex(t => t.id === p.id);
        const shift = ((pIdx + w + this.seed) % 2 === 0) ? SUNDAY_SHIFT_MORNING : SUNDAY_SHIFT_LATE;
        // Summer Sunday opens at 12:00 → use Late for everyone to simplify
        this.sundaySched[p.id][w] = isSummerSun ? SUNDAY_SHIFT_LATE : shift;
      }
    }
  }

  // ── Pick 2 consecutive days off from Mon-Sat (for Sunday workers) ───────────
  _pickConsecutiveDaysOff(p, w) {
    const c = p.c || {};
    const neverOff = [...(c.neverOffDays || [])];
    if (p.id === 'clara') neverOff.push(THU);

    // All consecutive pairs within Mon-Sat
    const allPairs = [[MON,TUE],[TUE,WED],[WED,THU],[THU,FRI],[FRI,SAT]];

    // Filter out pairs containing neverOff days
    const valid = allPairs.filter(([a, b]) => !neverOff.includes(a) && !neverOff.includes(b));
    if (valid.length === 0) return [MON, TUE]; // absolute fallback

    // Prefer pairs not containing avoidOff days
    const avoidOff = c.avoidOffDays || [];
    const preferred = valid.filter(([a, b]) => !avoidOff.includes(a) && !avoidOff.includes(b));
    const pool = preferred.length > 0 ? preferred : valid;

    // Prefer pairs where both days have enough coverage from others
    const countWorking = (dayIdx) => {
      let count = 0;
      for (const t of TEAM_DATA) {
        if (t.role === 'SL' || t.id === p.id) continue;
        const s = this.get(t.id, w, dayIdx);
        if (countsForCoverage(t.id, s)) count++;
      }
      return count;
    };
    const safePairs = pool.filter(([a, b]) =>
      countWorking(a) >= getMinStaffByDay(a) && countWorking(b) >= getMinStaffByDay(b)
    );
    const finalPool = safePairs.length > 0 ? safePairs : pool;

    const idx = (w + TEAM_DATA.findIndex(t => t.id === p.id) + this.seed) % finalPool.length;
    return finalPool[idx];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFFING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the minimum number of staff required for a given day index.
 * Reads from CONFIG.patrones.staffingMinimos when available, with hardcoded
 * fallback values to keep the planner functional if CONFIG is not loaded.
 *
 * dayIdx: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat
 */
function getMinStaffByDay(dayIdx) {
  const mins = (typeof CONFIG !== 'undefined' && CONFIG.patrones && CONFIG.patrones.staffingMinimos)
    ? CONFIG.patrones.staffingMinimos
    : { normal: 14, martes: 14, miercoles: 14, sabado: 12 };
  if (dayIdx === SAT) return mins.sabado   != null ? mins.sabado   : 12;
  if (dayIdx === TUE) return mins.martes   != null ? mins.martes   : 14;
  if (dayIdx === WED) return mins.miercoles != null ? mins.miercoles : 14;
  return mins.normal != null ? mins.normal : 14; // MON, THU, FRI
}

/**
 * Returns the minimum floor coverage required during meeting hours on Tue/Wed.
 * martes:   2 Mgr Support + 1 Lead stay on floor during 14:00-16:00 comercial meeting
 * miercoles: 1 Manager + 3 Leads stay on floor during 14:00-16:00 leadership meeting
 */
function getReunionFloorMin(dayIdx) {
  const rfm = (typeof CONFIG !== 'undefined' && CONFIG.patrones && CONFIG.patrones.reunionFloorMin)
    ? CONFIG.patrones.reunionFloorMin
    : { martes: 3, miercoles: 4 };
  if (dayIdx === TUE) return rfm.martes   != null ? rfm.martes   : 3;
  if (dayIdx === WED) return rfm.miercoles != null ? rfm.miercoles : 4;
  return 0;
}

/**
 * Returns the minimum number of staff required in the morning block.
 */
function getMorningMin() {
  if (typeof CONFIG !== 'undefined' && CONFIG.patrones && CONFIG.patrones.morningMin != null) {
    return CONFIG.patrones.morningMin;
  }
  return 7;
}

/**
 * Returns the minimum number of staff required in the afternoon block.
 */
function getAfternoonMin() {
  if (typeof CONFIG !== 'undefined' && CONFIG.patrones && CONFIG.patrones.afternoonMin != null) {
    return CONFIG.patrones.afternoonMin;
  }
  return 7;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────
function scoreSchedule(sched, qStartStr) {
  let coverageScore = 0;
  let equityScore   = 0;
  let deptMixScore  = 0;
  let prefScore     = 0;
  let daysOffScore  = 0;

  const weekDates = computeWeekDates(qStartStr);

  // 1. Coverage (40%): count working people per day
  let totalDayChecks = 0, coveragePassed = 0;
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const minRequired = getMinStaffByDay(d);
      let working = 0;
      for (const p of TEAM_DATA) {
        if (p.role === 'SL') continue;
        const s = sched[p.id]?.[w * DAYS_PER_WEEK + d];
        if (countsForCoverage(p.id, s)) working++;
      }
      totalDayChecks++;
      if (working >= minRequired) coveragePassed++;
    }
  }
  coverageScore = totalDayChecks > 0 ? (coveragePassed / totalDayChecks) * 40 : 0;

  // 2. Rotation equity (25%): measure how balanced morning/afternoon is for SMs and Managers
  // Exclude people with hard constraints that prevent a 50/50 morning/afternoon split:
  // - 'meri': Meri Alvarez has fixed per-day shifts (Mon/Tue afternoon, Wed-Fri morning)
  // - 'ane': Ane Pazos alternates whole-week morning (Week A) vs flexible (Week B)
  // - 'cris_c': Cris Carcel is always morning Mon-Fri (unbreakable constraint)
  // - 'jorge': Jorge Gil is fixed morning on Mon and Wed (2 days/week always morning)
  // - 'eva_h': Eva Hernandez always morning (unbreakable constraint)
  // - 'eli': Eli Moreno always morning (unbreakable constraint)
  // These exclusions prevent their fixed constraints from distorting the equity measurement.
  const equityExcluded = new Set(['meri','ane','cris_c','jorge','eva_h','eli']);
  const smMgrIds = TEAM_DATA.filter(p =>
    (p.role === 'SM' || p.role === 'MGR' || p.role === 'LEAD_GENIUS' || p.role === 'LEAD_SHOPPING' || p.role === 'OPS_LEAD')
    && !equityExcluded.has(p.id));
  const ratios = [];
  for (const p of smMgrIds) {
    let morningDays = 0, totalWorkDays = 0;
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const s = sched[p.id]?.[i];
      if (countsForCoverage(p.id, s)) {
        totalWorkDays++;
        if (isMorning(s)) morningDays++;
      }
    }
    if (totalWorkDays > 0) ratios.push(morningDays / totalWorkDays);
  }
  if (ratios.length > 0) {
    const mean = ratios.reduce((a,b) => a+b, 0) / ratios.length;
    const variance = ratios.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / ratios.length;
    const stddev = Math.sqrt(variance);
    equityScore = Math.max(0, (1 - stddev * 4)) * 25;
  }

  // 3. Department mix (15%): penalize weeks where all of a dept are on same shift
  const deptGroups = {};
  for (const p of TEAM_DATA.filter(t => t.role === 'MGR')) {
    if (!deptGroups[p.dept]) deptGroups[p.dept] = [];
    deptGroups[p.dept].push(p.id);
  }
  let deptChecks = 0, deptPassed = 0;
  for (let w = 0; w < WEEKS; w++) {
    for (const [dept, ids] of Object.entries(deptGroups)) {
      if (ids.length < 2) continue;
      const shifts = ids
        .map(id => ({ id, shift: sched[id]?.[w * DAYS_PER_WEEK + MON] }))
        .filter(item => countsForCoverage(item.id, item.shift))
        .map(item => item.shift);
      if (shifts.length < 2) continue;
      deptChecks++;
      const allMorning = shifts.every(isMorning);
      const allAfternoon = shifts.every(isAfternoon);
      if (!allMorning && !allAfternoon) deptPassed++;
    }
  }
  deptMixScore = deptChecks > 0 ? (deptPassed / deptChecks) * 15 : 15;

  // 4. Preference compliance (10%): check key constraints
  let prefChecks = 0, prefPassed = 0;
  // Cris Carcel: Mon-Fri always morning
  for (let w = 0; w < WEEKS; w++) {
    for (let d = MON; d <= FRI; d++) {
      const s = sched['cris_c']?.[w * DAYS_PER_WEEK + d];
      prefChecks++;
      if (!countsForCoverage('cris_c', s) || isMorning(s)) prefPassed++;
    }
  }
  // Eva H: always morning when working
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const s = sched['eva_h']?.[i];
    if (countsForCoverage('eva_h', s)) {
      prefChecks++;
      if (isMorning(s)) prefPassed++;
    }
  }
  // Eli: always morning when working
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const s = sched['eli']?.[i];
    if (countsForCoverage('eli', s)) {
      prefChecks++;
      if (isMorning(s)) prefPassed++;
    }
  }
  prefScore = prefChecks > 0 ? (prefPassed / prefChecks) * 10 : 10;

  // 5. Days off distribution (10%): SMs avoid Mon-Wed off; Managers avoid Tue-Wed off
  let daysOffChecks = 0, daysOffPassed = 0;
  for (const p of TEAM_DATA) {
    if (p.role !== 'SM' && p.role !== 'MGR') continue;
    const avoidDays = p.role === 'SM' ? [MON,TUE,WED] : [TUE,WED];
    for (let w = 0; w < WEEKS; w++) {
      for (const d of avoidDays) {
        const s = sched[p.id]?.[w * DAYS_PER_WEEK + d];
        daysOffChecks++;
        if (s !== 'OFF') daysOffPassed++;
      }
    }
  }
  daysOffScore = daysOffChecks > 0 ? (daysOffPassed / daysOffChecks) * 10 : 10;

  const total = Math.round(coverageScore + equityScore + deptMixScore + prefScore + daysOffScore);
  return {
    total: Math.min(100, total),
    coverage: Math.round(coverageScore),
    equity:   Math.round(equityScore),
    deptMix:  Math.round(deptMixScore),
    pref:     Math.round(prefScore),
    daysOff:  Math.round(daysOffScore),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function validateSchedule(sched, qStartStr, sundaySched) {
  const violations = [];

  for (let w = 0; w < WEEKS; w++) {
    const wLabel = `S${w+1}`;

    // Rule: Max 5 working days per week per person
    for (const p of TEAM_DATA) {
      if (p.role === 'SL') continue;
      let workDays = 0;
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        if (isWorking(sched[p.id]?.[w * DAYS_PER_WEEK + d])) workDays++;
      }
      if (workDays > 5) {
        violations.push({ week: wLabel, level: 'error',
          msg: `${p.name}: trabaja ${workDays} días esta semana (máx 5)` });
      }
    }

    // Rule: Coverage minimums per day
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const minPeople = getMinStaffByDay(d);
      const morningMin = getMorningMin();
      const afternoonMin = getAfternoonMin();
      let working = 0, morningCount = 0, afternoonCount = 0;
      for (const p of TEAM_DATA) {
        if (p.role === 'SL') continue;
        const s = sched[p.id]?.[w * DAYS_PER_WEEK + d];
        if (countsForCoverage(p.id, s)) {
          working++;
          if (isMorning(s)) morningCount++;
          if (isAfternoon(s)) afternoonCount++;
        }
      }
      if (working < minPeople) {
        violations.push({ week: wLabel, level: 'error',
          msg: `${DAY_NAMES[d]} S${w+1}: solo ${working} personas (mínimo ${minPeople})` });
      }
      // Sub-checks only for weekdays where morning/afternoon split matters
      if (d !== SAT) {
        if (morningCount < morningMin) {
          violations.push({ week: wLabel, level: 'warning',
            msg: `${DAY_NAMES[d]} S${w+1}: solo ${morningCount} personas de mañana (mínimo ${morningMin})` });
        }
        if (afternoonCount < afternoonMin) {
          violations.push({ week: wLabel, level: 'warning',
            msg: `${DAY_NAMES[d]} S${w+1}: solo ${afternoonCount} personas de tarde (mínimo ${afternoonMin})` });
        }
      }
      // Rule: Martes — during 14:00-16:00 meeting, minimum floor coverage
      if (d === TUE) {
        const tuesdayFloorMin = getReunionFloorMin(TUE);
        // Minimum attendees needed to hold a valid meeting (at least 4 people in the meeting room).
        // With floorMin on floor + meetingMin in the room, warn if total working is below both.
        const meetingMinAttendees = 4;
        if (working > 0 && working < tuesdayFloorMin + meetingMinAttendees) {
          violations.push({ week: wLabel, level: 'warning',
            msg: `Martes S${w+1}: posible cobertura insuficiente durante reunión comercial (${working} total, mín ${tuesdayFloorMin} en floor)` });
        }
      }
      // Rule: Miércoles — during 14:00-16:00 meeting, minimum floor coverage
      if (d === WED) {
        const wednesdayFloorMin = getReunionFloorMin(WED);
        // Same principle: need floor coverage + minimum meeting attendance.
        const meetingMinAttendees = 4;
        if (working > 0 && working < wednesdayFloorMin + meetingMinAttendees) {
          violations.push({ week: wLabel, level: 'warning',
            msg: `Miércoles S${w+1}: posible cobertura insuficiente durante leadership meeting (${working} total, mín ${wednesdayFloorMin} en floor)` });
        }
      }
    }

    // Rule: Cris Carcel Mon-Fri must be morning
    for (let d = MON; d <= FRI; d++) {
      const s = sched['cris_c']?.[w * DAYS_PER_WEEK + d];
      if (countsForCoverage('cris_c', s) && !isMorning(s)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Cris Carcel: tarde el ${DAY_NAMES[d]} S${w+1} (solo mañana L-V)` });
      }
    }

    // Rule: Eva Hernandez always morning when working
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const s = sched['eva_h']?.[w * DAYS_PER_WEEK + d];
      if (countsForCoverage('eva_h', s) && !isMorning(s)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Eva Hernandez: tarde el ${DAY_NAMES[d]} S${w+1} (siempre mañana)` });
      }
    }

    // Rule: Eli Moreno always morning when working
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const s = sched['eli']?.[w * DAYS_PER_WEEK + d];
      if (countsForCoverage('eli', s) && !isMorning(s)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Eli Moreno: tarde el ${DAY_NAMES[d]} S${w+1} (siempre mañana)` });
      }
    }

    // Rule: Clara González never OFF on Thursday
    const claraThur = sched['clara']?.[w * DAYS_PER_WEEK + THU];
    if (claraThur === 'OFF') {
      violations.push({ week: wLabel, level: 'error',
        msg: `Clara González: libre el Jueves S${w+1} (nunca puede librar jueves)` });
    }

    // Rule: All 4 SM must have Own on Mon+Tue (never OFF)
    const smIds = ['jorge','sheila','itziar','cris_c'];
    for (const id of smIds) {
      for (const d of [MON, TUE]) {
        const s = sched[id]?.[w * DAYS_PER_WEEK + d];
        if (!isVacation(s) && s !== 'Own') {
          const name = TEAM_DATA.find(p => p.id === id)?.name || id;
          violations.push({ week: wLabel, level: 'warning',
            msg: `${name}: ${DAY_NAMES[d]} S${w+1} debería ser Own` });
        }
      }
    }

    // Rule: Ops Leads LDOPS 3/2 por semana, máximo 1 coincidencia
    const ldopsDays = [];
    for (let d = MON; d <= SAT; d++) {
      const a = sched['aurora']?.[w * DAYS_PER_WEEK + d];
      const r = sched['ruben']?.[w * DAYS_PER_WEEK + d];
      if (a === 'LDOPS' && r === 'LDOPS') ldopsDays.push(d);
    }
    if (ldopsDays.length > 1) {
      violations.push({ week: wLabel, level: 'warning',
        msg: `Aurora y Rubén coinciden en LDOPS ${ldopsDays.length} días en S${w+1} (máx 1)` });
    }
    const auroraLdops = Array.from({ length: DAYS_PER_WEEK }, (_, d) => d)
      .filter(d => sched['aurora']?.[w * DAYS_PER_WEEK + d] === 'LDOPS').length;
    const rubenLdops = Array.from({ length: DAYS_PER_WEEK }, (_, d) => d)
      .filter(d => sched['ruben']?.[w * DAYS_PER_WEEK + d] === 'LDOPS').length;
    if (auroraLdops < 2 || rubenLdops < 2) {
      violations.push({ week: wLabel, level: 'warning',
        msg: `Ops Leads con LDOPS bajo en S${w+1} (Aurora ${auroraLdops}, Rubén ${rubenLdops}; mínimo 2)` });
    }

    // Rule: Ane Pazos Week A = always morning Mon-Fri
    if (w % 2 === 0) { // Week A
      for (let d = MON; d <= FRI; d++) {
        const s = sched['ane']?.[w * DAYS_PER_WEEK + d];
        if (isWorking(s) && !isVacation(s) && !isMorning(s)) {
          violations.push({ week: wLabel, level: 'warning',
            msg: `Ane Pazos: tarde en S${w+1} ${DAY_NAMES[d]} (Semana A = mañana)` });
        }
      }
    }

    // Rule: Grouped days off for Sunday workers
    // When the store opens on Sunday, every Manager/Lead working that Sunday
    // MUST have their 2 days off from Mon-Sat consecutive.
    if (sundaySched && isOpenSundayWeek(w, qStartStr)) {
      for (const p of TEAM_DATA) {
        if (!['SM','MGR','OPS_LEAD','LEAD_GENIUS','LEAD_SHOPPING'].includes(p.role)) continue;
        if (!sundaySched[p.id]?.[w]) continue; // not working Sunday this week
        // Find their OFF days within Mon-Sat
        const offDays = [];
        for (let d = MON; d <= SAT; d++) {
          const s = sched[p.id]?.[w * DAYS_PER_WEEK + d];
          if (!isWorking(s) && !isVacation(s) && s != null) offDays.push(d);
        }
        // They should have exactly 2 off days
        if (offDays.length !== 2) {
          violations.push({ week: wLabel, level: 'error',
            msg: `${p.name}: trabaja el domingo de S${w+1} pero tiene ${offDays.length} día(s) libre en L-S (deben ser exactamente 2 consecutivos)` });
          continue;
        }
        // The 2 off days must be consecutive
        if (offDays[1] - offDays[0] !== 1) {
          const dNames = offDays.map(d => DAY_NAMES[d]).join(' + ');
          violations.push({ week: wLabel, level: 'error',
            msg: `${p.name}: trabaja el domingo S${w+1} — días libres (${dNames}) no son consecutivos (regla: libranzas juntas)` });
        }
      }
    }
  }

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────────────────────
let state = {
  qStartDate:      '2026-03-30',
  season:          'verano',
  variants:        [],   // [{ sched, sundaySched, score, details }]
  selectedVariant: -1,
  activeSchedule:  null, // editable copy
  activeSundaySched: null, // { personId: [WEEKS strings|null] }
  violations:      [],
  editMode:        false,
  generating:      false,
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = 'planificador_13w_v1';

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      qStartDate:        state.qStartDate,
      season:            state.season,
      selectedVariant:   state.selectedVariant,
      activeSchedule:    state.activeSchedule,
      activeSundaySched: state.activeSundaySched,
    }));
  } catch(e) { /* ignore */ }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.qStartDate)     state.qStartDate       = parsed.qStartDate;
    if (parsed.season)         state.season            = parsed.season;
    if (parsed.activeSchedule) state.activeSchedule    = parsed.activeSchedule;
    if (parsed.activeSundaySched) state.activeSundaySched = parsed.activeSundaySched;
    if (typeof parsed.selectedVariant === 'number') state.selectedVariant = parsed.selectedVariant;
  } catch(e) { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION
// ─────────────────────────────────────────────────────────────────────────────
function generateVariants() {
  state.generating = true;
  renderGenerateBtn();

  // Use setTimeout to allow UI to update before heavy work
  setTimeout(() => {
    try {
      const variants = [];
      // Generate 3 variants using seeds 0, 1, 2. Each seed produces a different rotation
      // configuration: SM Wed-Sat rotation phase, manager morning/afternoon starting week,
      // Ops Lead starting direction, and Lead rotation phase. The variants are differentiated
      // by which people work morning vs afternoon on any given week (where rotation is free),
      // resulting in meaningfully different schedules for the user to compare and choose from.
      for (let seed = 0; seed < 3; seed++) {
        const gen        = new ScheduleGenerator({ qStartDate: state.qStartDate, season: state.season }, seed);
        const sched      = gen.generate();
        const sundaySched = gen.sundaySched;
        const score      = scoreSchedule(sched, state.qStartDate);
        variants.push({ sched, sundaySched, score, seed });
      }
      // Sort by score descending
      variants.sort((a,b) => b.score.total - a.score.total);
      state.variants = variants;
      state.selectedVariant = 0;
      state.activeSchedule    = deepCopy(variants[0].sched);
      state.activeSundaySched = deepCopy(variants[0].sundaySched);
      state.violations = validateSchedule(state.activeSchedule, state.qStartDate, state.activeSundaySched);
      saveState();
    } catch(e) {
      console.error('Error generando horario:', e);
      showToast('❌ Error al generar: ' + e.message, 'error');
    }
    state.generating = false;
    renderAll();
    // renderAll() rebuilds the schedule section but does NOT recreate the #btn-generate button
    // (it's in the config card which is outside renderAll's scope), so we must call this separately.
    renderGenerateBtn();
  }, 50);
}

function selectVariant(idx) {
  if (idx < 0 || idx >= state.variants.length) return;
  state.selectedVariant   = idx;
  state.activeSchedule    = deepCopy(state.variants[idx].sched);
  state.activeSundaySched = deepCopy(state.variants[idx].sundaySched);
  state.violations = validateSchedule(state.activeSchedule, state.qStartDate, state.activeSundaySched);
  saveState();
  renderVariantsPanel();
  renderScheduleTable();
  renderValidation();
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────────────────────────────────────
let openDropdown = null;

function cellClick(e, personId, weekIdx, dayIdx) {
  if (!state.editMode || !state.activeSchedule) return;
  e.stopPropagation();
  closeDropdown();

  const cell = e.currentTarget;
  const rect = cell.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'shift-dropdown';
  dropdown.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  dropdown.style.top  = (rect.bottom + 2) + 'px';

  const curVal = state.activeSchedule[personId]?.[weekIdx * DAYS_PER_WEEK + dayIdx] || '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'shift-dropdown-header';
  hdr.textContent = TEAM_DATA.find(p => p.id === personId)?.name || personId;
  dropdown.appendChild(hdr);

  for (const opt of ALL_SHIFT_OPTIONS) {
    const def = SHIFT_DEFS[opt];
    const item = document.createElement('div');
    item.className = 'shift-dropdown-item' + (opt === curVal ? ' active' : '');
    const dot = document.createElement('span');
    dot.className = 'shift-dropdown-dot';
    dot.style.background = def?.bg || '#ccc';
    item.appendChild(dot);
    item.appendChild(document.createTextNode(opt + (def ? ` — ${getShiftLabel(opt, state.season)}` : '')));
    item.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      applyEdit(personId, weekIdx, dayIdx, opt);
      closeDropdown();
    });
    dropdown.appendChild(item);
  }

  document.body.appendChild(dropdown);
  openDropdown = dropdown;
}

function closeDropdown() {
  if (openDropdown) { openDropdown.remove(); openDropdown = null; }
}

function applyEdit(personId, weekIdx, dayIdx, shift) {
  if (!state.activeSchedule[personId]) return;
  state.activeSchedule[personId][weekIdx * DAYS_PER_WEEK + dayIdx] = shift;
  state.violations = validateSchedule(state.activeSchedule, state.qStartDate, state.activeSundaySched);
  saveState();
  // Re-render just the cell
  const cellId = `cell-${personId}-${weekIdx}-${dayIdx}`;
  const cellEl = document.getElementById(cellId);
  if (cellEl) updateCell(cellEl, personId, weekIdx, dayIdx);
  renderValidation();
  // Update score display
  if (state.activeSchedule) {
    const newScore = scoreSchedule(state.activeSchedule, state.qStartDate);
    const scoreEl = document.getElementById('active-score');
    if (scoreEl) scoreEl.textContent = `Score activo: ${newScore.total}/100`;
  }
}

function updateCell(cellEl, personId, weekIdx, dayIdx) {
  const shift = state.activeSchedule[personId]?.[weekIdx * DAYS_PER_WEEK + dayIdx] || '';
  const def = SHIFT_DEFS[shift];
  cellEl.textContent = shift || '—';
  cellEl.style.background  = def?.bg   || '#fff';
  cellEl.style.color       = def?.text || '#999';
  // Violations are surfaced at panel/list level via renderValidation();
  // individual cells do not have per-cell violation coordinates.
  cellEl.classList.remove('violation');
  // QBR day highlight
  cellEl.classList.toggle('qbr-day', isQBRDay(state.qStartDate, weekIdx, dayIdx));
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportCSV() {
  if (!state.activeSchedule) { showToast('Genera un horario primero', 'error'); return; }
  const weekDates = computeWeekDates(state.qStartDate);

  const rows = [];
  // Header row 1: Week labels
  const hdr1 = ['Persona', 'Rol'];
  weekDates.forEach((wd, wi) => {
    const hasSun = isOpenSundayWeek(wi, state.qStartDate);
    const end = addDays(wd, hasSun ? 6 : 5);
    const label = `S${wi+1} (${formatDate(wd)}-${formatDate(end)})${hasSun ? ' 🏪' : ''}`;
    for (let d = 0; d < DAYS_PER_WEEK; d++) hdr1.push(d === 0 ? label : '');
    if (hasSun) hdr1.push('');
  });
  rows.push(hdr1);

  // Header row 2: Day labels
  const hdr2 = ['', ''];
  for (let w = 0; w < WEEKS; w++) {
    DAY_LABELS.forEach(dl => hdr2.push(dl));
    if (isOpenSundayWeek(w, state.qStartDate)) hdr2.push('D');
  }
  rows.push(hdr2);

  // Data rows
  const sections = {
    'SL': 'Store Leaders',
    'SM': 'Senior Managers',
    'MGR': 'Managers',
    'OPS_LEAD': 'Ops Leads',
    'LEAD_GENIUS': 'Lead Genius',
    'LEAD_SHOPPING': 'Lead Shopping',
  };
  const totalExportCols = TOTAL_DAYS + weekDates.reduce((acc, _, wi) => acc + (isOpenSundayWeek(wi, state.qStartDate) ? 1 : 0), 0);
  let lastRole = '';
  for (const p of TEAM_DATA) {
    if (p.role !== lastRole) {
      rows.push([sections[p.role] || p.role, '', ...new Array(totalExportCols).fill('')]);
      lastRole = p.role;
    }
    const row = [p.name, p.role];
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        row.push(state.activeSchedule[p.id]?.[w * DAYS_PER_WEEK + d] || '');
      }
      if (isOpenSundayWeek(w, state.qStartDate)) {
        row.push(state.activeSundaySched?.[p.id]?.[w] || '');
      }
    }
    rows.push(row);
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `horario_13s_${state.qStartDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exportado correctamente', 'success');
}

function exportExcel() {
  if (!state.activeSchedule) { showToast('Genera un horario primero', 'error'); return; }
  if (typeof XLSX === 'undefined') { showToast('⚠️ SheetJS no disponible. Usa exportar CSV.', 'error'); return; }

  const weekDates = computeWeekDates(state.qStartDate);
  const aoa = [];

  // Header
  const hdr1 = ['Persona', 'Rol'];
  weekDates.forEach((wd, wi) => {
    const hasSun = isOpenSundayWeek(wi, state.qStartDate);
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      hdr1.push(d === 0 ? `S${wi+1} ${formatDate(wd)}` : DAY_LABELS[d]);
    }
    if (hasSun) hdr1.push('D🏪');
  });
  aoa.push(hdr1);

  for (const p of TEAM_DATA) {
    const row = [p.name, p.role];
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        row.push(state.activeSchedule[p.id]?.[w * DAYS_PER_WEEK + d] || '');
      }
      if (isOpenSundayWeek(w, state.qStartDate)) {
        row.push(state.activeSundaySched?.[p.id]?.[w] || '');
      }
    }
    aoa.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Horario 13S');
  XLSX.writeFile(wb, `horario_13s_${state.qStartDate}.xlsx`);
  showToast('✅ Excel exportado correctamente', 'success');
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────
function renderAll() {
  renderConfigInfo();
  renderVariantsPanel();
  renderScheduleSection();
  renderValidation();
}

function renderGenerateBtn() {
  const btn = document.getElementById('btn-generate');
  if (!btn) return;
  if (state.generating) {
    btn.innerHTML = '<span class="spinner"></span>Generando…';
    btn.disabled = true;
  } else {
    btn.innerHTML = '⚙️ Generar horario';
    btn.disabled = false;
  }
}

function renderConfigInfo() {
  const el = document.getElementById('config-info');
  if (!el) return;
  const weekDates = computeWeekDates(state.qStartDate);
  const lastWeek  = weekDates[WEEKS - 1];
  const endDate   = addDays(lastWeek, 5);
  const seasonLabel = state.season === 'verano' ? 'Verano ☀️ (Close 13-22)' : 'Invierno ❄️ (Close 12:30-21:30)';
  el.textContent = `${WEEKS} semanas · ${formatDate(parseDate(state.qStartDate))} – ${formatDate(endDate)} · ${seasonLabel}`;

  // Update the dynamic localStorage key hint
  const lsKeyHint = document.getElementById('vac-ls-key-hint');
  if (lsKeyHint) {
    const year = parseDate(state.qStartDate).getFullYear();
    lsKeyHint.textContent = `vacaciones_${year}`;
  }

  // Update the dynamic person count badge
  const personBadge = document.getElementById('person-count-badge');
  if (personBadge) {
    const nonSL = TEAM_DATA.filter(p => p.role !== 'SL').length;
    personBadge.textContent = `${WEEKS} semanas · ${nonSL} personas`;
  }
}

function renderVariantsPanel() {
  const container = document.getElementById('variants-container');
  if (!container) return;

  const badgeEl = document.getElementById('variants-badge');
  if (badgeEl) badgeEl.textContent = state.variants.length;

  if (state.variants.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">
      Pulsa "Generar horario" para crear variantes.</p>`;
    return;
  }

  container.innerHTML = '';
  state.variants.forEach((v, idx) => {
    const s = v.score;
    const card = document.createElement('div');
    card.className = 'variant-card' + (idx === state.selectedVariant ? ' selected' : '');
    card.onclick = () => selectVariant(idx);
    if (idx === 0) {
      const badge = document.createElement('div');
      badge.className = 'variant-badge';
      badge.textContent = '⭐ Mejor';
      card.appendChild(badge);
    }
    card.innerHTML += `
      <h3>Variante ${idx + 1}</h3>
      <div class="score-bar-wrap">
        <div class="score-bar-label">
          <span>Puntuación</span><span><strong>${s.total}</strong>/100</span>
        </div>
        <div class="score-bar"><div class="score-bar-fill" style="width:${s.total}%"></div></div>
      </div>
      <div class="variant-details">
        <div>📊 Cobertura: ${s.coverage}/40</div>
        <div>🔄 Equidad rotación: ${s.equity}/25</div>
        <div>🏢 Mix departamental: ${s.deptMix}/15</div>
        <div>✅ Preferencias: ${s.pref}/10</div>
        <div>📅 Libranzas: ${s.daysOff}/10</div>
      </div>
      <button class="btn btn-primary variant-select-btn" onclick="event.stopPropagation();selectVariant(${idx})">
        ${idx === state.selectedVariant ? '✅ Seleccionada' : '→ Seleccionar'}
      </button>`;
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT WEEK — build preload payload and redirect to auditor
// ─────────────────────────────────────────────────────────────────────────────

// Map planificador shift codes to the codes the auditor understands
function plannerShiftToAuditor(shift) {
  if (!shift) return '';
  // Vacation-type shifts all map to 'Holidays' in the auditor
  if (['V','V25','TGD','F','Parental','Paternidad','Lactancia','UNPAID'].includes(shift)) return 'Holidays';
  // OFF → Off (auditor uses title-case)
  if (shift === 'OFF') return 'Off';
  // Every other shift already matches the auditor's SHIFT_TYPES keys
  return shift;
}

// Build the auditor_preload payload for a given week index (0-based)
function buildWeekAuditData(weekIdx) {
  if (!state.activeSchedule) return null;

  const weekDates = computeWeekDates(state.qStartDate);
  const weekStart = weekDates[weekIdx]; // Date object (Monday)

  const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dayNamesFull = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const dayKeys = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Build weekDates array for the 7-day week (planificador tracks Mon-Sat; add Sun=Off)
  const auditWeekDates = dayKeys.map((key, i) => {
    const d = addDays(weekStart, i);
    const dayNum   = d.getDate();
    const monShort = MONTH_SHORT[d.getMonth()];
    return { key, label: `${dayNamesFull[i]} ${dayNum} ${monShort}` };
  });

  // Compute a human-readable quarter label
  const qYear  = parseDate(state.qStartDate).getFullYear();
  const qMonth = parseDate(state.qStartDate).getMonth() + 1; // 1-12
  const qNum   = qMonth <= 3 ? 1 : qMonth <= 6 ? 2 : qMonth <= 9 ? 3 : 4;
  const qLabel = `Q${qNum} FY${String(qYear).slice(-2)}`;

  // Build week label e.g. "Semana 1 — 30 mar 2026"
  const ws = weekStart;
  const weekLabel = `Semana ${weekIdx + 1} — ${ws.getDate()} ${MONTH_SHORT[ws.getMonth()]} ${ws.getFullYear()}`;

  // Build persons array — exclude Store Leaders (SL) to match auditor convention
  // Map abbreviated role names to full names that the auditor's regex-based role detection understands
  const ROLE_MAP = {
    'SM':           'Senior Manager',
    'MGR':          'Manager',
    'OPS_LEAD':     'Lead',
    'LEAD_GENIUS':  'Lead',
    'LEAD_SHOPPING':'Lead',
  };
  const persons = TEAM_DATA
    .filter(p => p.role !== 'SL')
    .map(p => {
      const days = {};
      const baseIdx = weekIdx * DAYS_PER_WEEK; // planificador has 6 days/week (Mon-Sat)
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const key = dayKeys[d];
        const rawShift = state.activeSchedule[p.id]?.[baseIdx + d] || '';
        days[key] = plannerShiftToAuditor(rawShift);
      }
      // Sunday: use sundaySched if available and this is an open-Sunday week
      const isSunOpen = isOpenSundayWeek(weekIdx, state.qStartDate);
      const sunRawShift = isSunOpen ? (state.activeSundaySched?.[p.id]?.[weekIdx] || '') : '';
      days['Sun'] = sunRawShift ? plannerShiftToAuditor(sunRawShift) : 'Off';

      // Hours plan: Eva H has 32h, everyone else defaults to 40h
      const plan = p.hours === 32 ? 32 : 40;

      return {
        name: p.name,
        role: ROLE_MAP[p.role] || p.role,
        dept: p.dept || p.area || '',
        fwa:  '',
        plan,
        sch:  0,
        days,
      };
    });

  return {
    source:     'planificador-13w',
    weekNumber: weekIdx + 1,
    weekLabel,
    quarter:    qLabel,
    timestamp:  new Date().toISOString(),
    weekDates:  auditWeekDates,
    persons,
  };
}

// Serialize the selected week to localStorage and navigate to the auditor
function auditWeek() {
  if (!state.activeSchedule) {
    showToast('Genera un horario primero', 'error');
    return;
  }
  const sel = document.getElementById('audit-week-select');
  const weekIdx = sel ? parseInt(sel.value, 10) : 0;
  const data = buildWeekAuditData(weekIdx);
  if (!data) {
    showToast('Error al preparar los datos para el auditor', 'error');
    return;
  }
  try {
    localStorage.setItem('auditor_preload', JSON.stringify(data));
  } catch(e) {
    showToast('Error al guardar datos: ' + e.message, 'error');
    return;
  }
  window.location.href = 'auditor.html';
}

function renderScheduleSection() {
  const section = document.getElementById('schedule-section');
  if (!section) return;

  if (!state.activeSchedule) {
    section.innerHTML = `<div class="placeholder-box">
      <div class="icon">📅</div>
      <h3>Sin horario generado</h3>
      <p>Configura los parámetros y pulsa "Generar horario" para comenzar.</p>
    </div>`;
    return;
  }

  // Build week options for the audit week selector
  const weekDates = computeWeekDates(state.qStartDate);
  const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  let weekOptions = '';
  weekDates.forEach((wd, wi) => {
    weekOptions += `<option value="${wi}">S${wi+1} — ${wd.getDate()} ${MONTH_SHORT[wd.getMonth()]} ${wd.getFullYear()}</option>`;
  });

  section.innerHTML = `
    <div class="sched-toolbar">
      <div class="sched-toolbar-left">
        <span id="active-score" style="font-size:.84rem;font-weight:700;color:var(--accent)"></span>
        <label style="display:flex;align-items:center;gap:6px;font-size:.83rem;cursor:pointer">
          <input type="checkbox" id="edit-mode-toggle" ${state.editMode?'checked':''}
            onchange="toggleEditMode(this.checked)">
          ✏️ Modo edición
        </label>
      </div>
      <div class="sched-toolbar-right">
        <select id="audit-week-select" class="btn btn-export" style="padding:5px 8px;font-size:.80rem;cursor:pointer"
          title="Selecciona la semana a auditar">
          ${weekOptions}
        </select>
        <button class="btn btn-audit" id="btn-audit-week" onclick="auditWeek()"
          title="Enviar esta semana al Auditor para validar contra todas las reglas">
          🔍 Auditar esta semana
        </button>
        <button class="btn btn-export" onclick="exportCSV()">⬇️ CSV</button>
        <button class="btn btn-export" onclick="exportExcel()">📊 Excel</button>
        <button class="btn btn-export" onclick="openPlanificadorIcalModal()" title="Exportar horario 13 semanas al calendario (.ics)">📅 .ics</button>
      </div>
    </div>
    <div class="week-nav" id="week-nav"></div>
    <div class="table-scroll-wrap">
      <div id="schedule-table-wrap"></div>
    </div>`;

  // Score display
  const scoreEl = document.getElementById('active-score');
  if (scoreEl && state.selectedVariant >= 0 && state.variants[state.selectedVariant]) {
    const sc = state.variants[state.selectedVariant].score;
    scoreEl.textContent = `Score: ${sc.total}/100 (cobertura:${sc.coverage} equidad:${sc.equity} mix:${sc.deptMix})`;
  }

  renderWeekNav();
  renderScheduleTable();
}

function renderWeekNav() {
  const nav = document.getElementById('week-nav');
  if (!nav) return;
  const weekDates = computeWeekDates(state.qStartDate);
  nav.innerHTML = '<span>Ir a semana:</span>';
  weekDates.forEach((wd, wi) => {
    const btn = document.createElement('button');
    btn.className = 'week-chip';
    const hasSun = isOpenSundayWeek(wi, state.qStartDate);
    btn.textContent = `S${wi+1}${hasSun ? ' 🏪' : ''}`;
    btn.title = formatDate(wd) + (hasSun ? ' (Domingo apertura)' : '');
    if (hasSun) btn.classList.add('week-chip-sunday');
    btn.onclick = () => {
      const colId = `week-col-${wi}`;
      const el = document.getElementById(colId);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'start' });
    };
    nav.appendChild(btn);
  });
}

function renderScheduleTable() {
  const wrap = document.getElementById('schedule-table-wrap');
  if (!wrap || !state.activeSchedule) return;

  const weekDates = computeWeekDates(state.qStartDate);

  // Build table HTML
  const table = document.createElement('table');
  table.className = 'sched-table';
  table.setAttribute('aria-label', 'Horario 13 semanas');

  // ── THEAD ──
  const thead = document.createElement('thead');

  // Row 1: Name header + week headers
  const tr1 = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.className = 'col-name header-row';
  th0.rowSpan = 2;
  th0.textContent = 'Persona';
  tr1.appendChild(th0);
  weekDates.forEach((wd, wi) => {
    const hasSun  = isOpenSundayWeek(wi, state.qStartDate);
    const colSpan = DAYS_PER_WEEK + 1; // domingo siempre visible
    const th = document.createElement('th');
    th.className = 'week-header' + (hasSun ? ' sunday-week' : '');
    th.colSpan = colSpan;
    th.id = `week-col-${wi}`;
    const endDate = addDays(wd, 6); // siempre hasta el domingo
    th.textContent = `S${wi+1} ${formatDate(wd)}–${formatDate(endDate)}${hasSun ? ' 🏪' : ' 🔒'}`;
    // Check if QBR week
    const qbrInWeek = Array.from({length:6},(_,d)=>isQBRDay(state.qStartDate,wi,d)).some(Boolean);
    if (qbrInWeek) { th.classList.add('qbr-week'); th.title = 'Semana QBR'; }
    if (hasSun) th.title = (th.title ? th.title + ' | ' : '') + 'Domingo apertura 🏪';
    else th.title = (th.title ? th.title + ' | ' : '') + 'Domingo cerrado 🔒';
    tr1.appendChild(th);
  });
  thead.appendChild(tr1);

  // Row 2: Day headers
  const tr2 = document.createElement('tr');
  for (let w = 0; w < WEEKS; w++) {
    const hasSun = isOpenSundayWeek(w, state.qStartDate);
    DAY_LABELS.forEach((dl, d) => {
      const th = document.createElement('th');
      th.className = 'day-header' + (d === SAT ? ' sat' : '');
      th.textContent = dl;
      tr2.appendChild(th);
    });
    // Always show Sunday column
    const thSun = document.createElement('th');
    if (hasSun) {
      thSun.className = 'day-header sunday-header';
      thSun.textContent = 'D';
      thSun.title = 'Domingo apertura 🏪';
    } else {
      thSun.className = 'day-header sunday-header sunday-closed-header';
      thSun.textContent = 'D';
      thSun.title = 'Domingo cerrado 🔒';
    }
    tr2.appendChild(thSun);
  }
  thead.appendChild(tr2);
  table.appendChild(thead);

  // ── TBODY ──
  const tbody = document.createElement('tbody');
  const roleOrder = ['SL','SM','MGR','OPS_LEAD','LEAD_GENIUS','LEAD_SHOPPING'];
  const roleSectionLabels = {
    'SL':           'Store Leaders',
    'SM':           'Senior Managers',
    'MGR':          'Managers',
    'OPS_LEAD':     'Ops Leads',
    'LEAD_GENIUS':  'Lead Genius',
    'LEAD_SHOPPING':'Lead Shopping',
  };
  const roleBadge = { SL:'sl', SM:'sm', MGR:'mgr', OPS_LEAD:'lead', LEAD_GENIUS:'lead', LEAD_SHOPPING:'lead' };

  // Total columns = TOTAL_DAYS + 1 Sunday column per week (always visible)
  const totalCols = TOTAL_DAYS + WEEKS;

  let lastRole = '';
  for (const p of TEAM_DATA) {
    // Section header row
    if (p.role !== lastRole) {
      const secTr = document.createElement('tr');
      secTr.className = 'section-row';
      const secTd = document.createElement('td');
      secTd.className = 'col-name';
      secTd.textContent = roleSectionLabels[p.role] || p.role;
      secTr.appendChild(secTd);
      const restTd = document.createElement('td');
      restTd.colSpan = totalCols;
      secTr.appendChild(restTd);
      tbody.appendChild(secTr);
      lastRole = p.role;
    }

    const tr = document.createElement('tr');

    // Name cell
    const nameTd = document.createElement('td');
    nameTd.className = 'col-name';
    nameTd.innerHTML = `<span class="person-name-cell">${p.name}</span>
      <span class="col-role-badge badge-${roleBadge[p.role]||'lead'}">${p.role}</span>`;
    tr.appendChild(nameTd);

    // Shift cells
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const cellIdx = w * DAYS_PER_WEEK + d;
        const shift = state.activeSchedule[p.id]?.[cellIdx] || '';
        const def = SHIFT_DEFS[shift];

        const td = document.createElement('td');
        td.className = 'shift-cell';
        td.id = `cell-${p.id}-${w}-${d}`;
        td.textContent = shift || (p.role === 'SL' ? '' : '—');
        td.style.background = def?.bg   || (shift ? '#fff' : '#fafafa');
        td.style.color      = def?.text || '#999';

        if (state.editMode && p.role !== 'SL') {
          td.classList.add('editable');
          td.addEventListener('click', (e) => cellClick(e, p.id, w, d));
        }

        if (isVacation(shift)) td.classList.add('shift-vacation');
        if (isQBRDay(state.qStartDate, w, d)) td.classList.add('qbr-day');

        tr.appendChild(td);
      }

      // Sunday column — always shown
      const hasSun = isOpenSundayWeek(w, state.qStartDate);
      const tdSun = document.createElement('td');
      if (hasSun) {
        const sunShift = state.activeSundaySched?.[p.id]?.[w] || '';
        const def = SHIFT_DEFS[sunShift];
        tdSun.className = 'shift-cell sunday-cell';
        tdSun.title = 'Domingo apertura 🏪';
        if (sunShift) {
          tdSun.textContent = sunShift;
          tdSun.style.background = def?.bg   || '#fff';
          tdSun.style.color      = def?.text || '#000';
        } else {
          tdSun.textContent = p.role === 'SL' ? '' : '—';
          tdSun.style.background = '#f5f3f0';
          tdSun.style.color = '#bbb';
        }
      } else {
        tdSun.className = 'shift-cell sunday-cell sunday-closed-cell';
        tdSun.textContent = '🔒';
        tdSun.title = 'Domingo cerrado 🔒';
      }
      tr.appendChild(tdSun);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);
}

function renderValidation() {
  const panel = document.getElementById('validation-panel');
  if (!panel) return;

  const v = state.violations;
  const errors   = v.filter(x => x.level === 'error');
  const warnings = v.filter(x => x.level === 'warning');

  let html = `<div class="section-title">🔍 Validación en tiempo real</div>`;
  html += `<div class="validation-summary">
    <div class="validation-count"><span class="dot dot-error"></span>${errors.length} errores</div>
    <div class="validation-count"><span class="dot dot-warning"></span>${warnings.length} avisos</div>
    ${v.length === 0 ? '<div class="validation-count"><span class="dot dot-ok"></span>Todo correcto ✅</div>' : ''}
  </div>`;

  if (v.length === 0) {
    html += `<p class="no-violations">✅ No se detectan violaciones de reglas</p>`;
  } else {
    html += `<div class="violation-list">`;
    for (const item of v.slice(0, 50)) {
      html += `<div class="violation-item violation-${item.level}">
        <span class="violation-week">[${item.week}]</span>
        <span>${item.msg}</span>
      </div>`;
    }
    if (v.length > 50) {
      html += `<div class="violation-item" style="color:var(--text-muted)">
        …y ${v.length - 50} más</div>`;
    }
    html += `</div>`;
  }

  panel.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE EDIT MODE
// ─────────────────────────────────────────────────────────────────────────────
function toggleEditMode(enabled) {
  state.editMode = enabled;
  // Re-render to add/remove editable class without full rebuild
  renderScheduleTable();
  showToast(enabled ? '✏️ Modo edición activado — haz clic en una celda' : '👁️ Modo lectura', '');
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '🌙 Oscuro' : '☀️ Claro';
  localStorage.setItem('app_theme', isDark ? 'light' : 'dark');
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────
function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

// ─────────────────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
function onQStartChange(val) {
  state.qStartDate = val;
  state.variants   = [];
  state.activeSchedule = null;
  state.selectedVariant = -1;
  saveState();
  renderAll();
}

function onSeasonChange(val) {
  state.season  = val;
  state.variants = [];
  state.activeSchedule = null;
  state.selectedVariant = -1;
  saveState();
  renderAll();
}

function onGenerate() {
  generateVariants();
}

function onReset() {
  if (!confirm('¿Seguro que quieres resetear el horario activo? Se perderán los cambios.')) return;
  if (state.selectedVariant >= 0 && state.variants[state.selectedVariant]) {
    state.activeSchedule = deepCopy(state.variants[state.selectedVariant].sched);
    state.activeSundaySched = deepCopy(state.variants[state.selectedVariant].sundaySched);
    state.violations = validateSchedule(state.activeSchedule, state.qStartDate, state.activeSundaySched);
    saveState();
    renderScheduleSection();
    renderValidation();
    showToast('🔄 Horario resetado a la variante seleccionada', '');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (openDropdown && !openDropdown.contains(e.target)) closeDropdown();
});

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const savedTheme = localStorage.getItem('app_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';

  // Load persisted state
  loadPersistedState();

  // Bind config controls
  const qStartInput = document.getElementById('q-start-date');
  if (qStartInput) {
    qStartInput.value = state.qStartDate;
    qStartInput.addEventListener('change', (e) => onQStartChange(e.target.value));
  }

  const seasonSel = document.getElementById('season-select');
  if (seasonSel) {
    seasonSel.value = state.season;
    seasonSel.addEventListener('change', (e) => onSeasonChange(e.target.value));
  }

  document.getElementById('btn-generate')?.addEventListener('click', onGenerate);
  document.getElementById('btn-reset-sched')?.addEventListener('click', onReset);

  // If we have a persisted active schedule, validate and render it
  if (state.activeSchedule) {
    state.violations = validateSchedule(state.activeSchedule, state.qStartDate, state.activeSundaySched);
  }

  renderAll();
});

// ─────────────────────────────────────────────────────────────────────────────
// iCAL EXPORT — Planificador 13 semanas
// ─────────────────────────────────────────────────────────────────────────────
function openPlanificadorIcalModal() {
  if (typeof openICalModal !== 'function') {
    alert('El módulo de exportación iCal no está cargado.');
    return;
  }
  if (!state.activeSchedule) {
    showToast('Genera un horario primero antes de exportar.', 'warn');
    return;
  }

  openICalModal({
    title:       '📅 Exportar 13 semanas (.ics)',
    personName:  null,
    show13w:     true,
    showPersons: true,
    onDownload: function(opts) {
      const sched  = state.activeSchedule;
      const season = state.season;
      const qStart = state.qStartDate;

      const { from, to } = getICalDateRange(opts.range, opts.dateFrom, opts.dateTo);

      // Determine which persons to export
      let persons;
      if (opts.persons === 'team') {
        persons = TEAM_DATA.filter(p => p.role !== 'SL');
      } else {
        // Default: all persons (single-person selection not yet supported in planificador)
        persons = TEAM_DATA.filter(p => p.role !== 'SL');
      }

      let allEvents = [];
      for (const p of persons) {
        const days = planificadorPersonToDays(p.id, sched, qStart, season, from, to);
        const evs = personScheduleToEvents({
          personId:   p.id,
          personName: p.name,
          role:       p.role,
          days:       days,
        }, {
          season:          season,
          includeDaysOff:  opts.includeDaysOff,
          includeLunch:    opts.includeLunch,
          includeMeetings: opts.includeMeetings,
          includeDD:       opts.includeDD,
          alarmMinutes:    opts.alarmMinutes,
        });
        allEvents = allEvents.concat(evs);
      }

      const ics = buildICS(allEvents, opts.calName);
      const filename = 'schedule-' + (opts.persons === 'team' ? 'equipo' : 'planificador') + '-' + todayISO() + '.ics';
      downloadICS(ics, filename);
    },
  });
}
