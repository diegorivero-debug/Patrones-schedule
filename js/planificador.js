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

// ─────────────────────────────────────────────────────────────────────────────
// TEAM DATA  (IDs match vacaciones.js)
// ─────────────────────────────────────────────────────────────────────────────
const TEAM_DATA = [
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
  { id:'cris_c',   name:'Cris Carcel',     role:'SM',           area:'Ops',           dept:'Ops',
    c:{ morningOnlyWeekdays:true, neverOffDays:[MON,TUE,WED] }},
  // Managers
  { id:'jesus',    name:'Jesús Pazos',     role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'pedro',    name:'Pedro Borlido',   role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'julie',    name:'Julie Robin',     role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'javi_s',   name:'Javi Sánchez',    role:'MGR',          area:'Shopping+Biz',  dept:'Shopping+Biz',
    c:{ aorFixedDays:[MON,FRI], avoidOffDays:[TUE,WED] }},
  { id:'meri',     name:'Meri Alvarez',    role:'MGR',          area:'People',        dept:'People',
    c:{ meriFixed:true }},
  { id:'toni',     name:'Toni Medina',     role:'MGR',          area:'People',        dept:'People',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'deborah',  name:'Deborah Ibañez',  role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'ane',      name:'Ane Pazos',       role:'MGR',          area:'Support',       dept:'Support',
    c:{ weekAB:true, avoidOffDays:[TUE,WED] }},
  { id:'ricardo',  name:'Ricardo Sosa',    role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'javi_q',   name:'Javi Quiros',     role:'MGR',          area:'Support',       dept:'Support',
    c:{ avoidOffDays:[TUE,WED] }},
  { id:'cris_u',   name:'Cris Usón',       role:'MGR',          area:'Ops',           dept:'Ops',
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
  { id:'alberto',  name:'Alberto Ortiz',   role:'LEAD_GENIUS',  area:'Lead Genius',   dept:'Lead Genius'   },
  // Lead Shopping
  { id:'clara',    name:'Clara González',  role:'LEAD_SHOPPING',area:'Lead Shopping', dept:'Lead Shopping',
    c:{ neverOffThursday:true }},
  { id:'eli',      name:'Eli Moreno',      role:'LEAD_SHOPPING',area:'Lead Shopping', dept:'Lead Shopping',
    c:{ morningOnly:true, altWeekend:true }},
];

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
                           'Close','Close C1','Close C2','OFF','V','V25','TGD','F','Parental',
                           'Paternidad','Lactancia','UNPAID'];

function shiftBlock(s)   { return (s && SHIFT_DEFS[s]) ? SHIFT_DEFS[s].block : 'off'; }
function isMorning(s)    { return shiftBlock(s) === 'morning'; }
function isAfternoon(s)  { return shiftBlock(s) === 'afternoon'; }
function isOff(s)        { const b = shiftBlock(s); return b === 'off' || b === 'vacation'; }
function isWorking(s)    { return !isOff(s) && s !== null && s !== undefined; }
function isVacation(s)   { return shiftBlock(s) === 'vacation'; }

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
// SCHEDULE GENERATOR CLASS
// ─────────────────────────────────────────────────────────────────────────────
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

    // Load vacation data from localStorage
    this.vacData = this._loadVacations();

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
    const year = parseDate(this.qStart).getFullYear();
    const raw  = localStorage.getItem(`vacaciones_${year}`);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed.data || {};
    } catch(e) { return {}; }
  }

  // Apply vacation/absence entries to the schedule cells
  _applyVacations() {
    const weekDates = computeWeekDates(this.qStart);
    for (const [personId, weekMap] of Object.entries(this.vacData)) {
      if (!this.sched[personId]) continue;
      weekDates.forEach((wdStart, wi) => {
        // ISO week number of this Q week's Monday
        const weekNum = isoWeek(wdStart);
        const absence = weekMap[weekNum];
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

  // ── SM rotation (Mon+Tue: ALL morning; Wed-Sat: 2 morning + 2 afternoon) ───
  _assignSMRotation() {
    const smIds = ['jorge','sheila','itziar','cris_c'];
    const rotatable = ['jorge','sheila','itziar']; // cris_c always morning Mon-Fri

    // Rotation cycles for Thu/Fri: exactly 1 person from {jorge,sheila,itziar} joins
    // cris_c in the morning, so we get 2 morning + 2 afternoon (spec: 2 SM mañana + 2 SM tarde).
    // Each of the 3 rotatable SMs gets a morning turn on a 3-week cycle.
    const thuFriMorningRotation = ['jorge', 'sheila', 'itziar'];
    // Sat rotation cycles (all 4 participate): pairs that do morning
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

      // Mon + Tue: ALL 4 SM → morning
      for (const id of smIds) {
        if (onVac(id)) continue;
        const morningShift = this._smMorningShift(id);
        this.set(id, w, MON, morningShift);
        this.set(id, w, TUE, morningShift);
      }

      // Wed: Jorge (fixedMorning) + Cris (morning-only-weekdays) → morning
      //      Sheila + Itziar → afternoon
      if (!onVac('jorge'))    this.set('jorge',   w, WED, this._smMorningShift('jorge'));
      if (!onVac('cris_c'))   this.set('cris_c',  w, WED, this._smMorningShift('cris_c'));
      if (!onVac('sheila'))   this.set('sheila',  w, WED, this._smAfternoonShift('sheila'));
      if (!onVac('itziar'))   this.set('itziar',  w, WED, this._smAfternoonShift('itziar'));

      // Thu + Fri: Cris always morning (1 SM) + exactly 1 of {jorge,sheila,itziar} morning
      // → 2 SM morning + 2 SM afternoon, matching the spec (2 mañana + 2 tarde Mié-Sáb).
      // Jorge's Mon+Wed fixed-morning constraint does NOT apply to Thu/Fri, so jorge rotates freely.
      const thuFriIdx = (w + this._smRotSeed) % thuFriMorningRotation.length;
      const thuFriMorning = new Set(['cris_c', thuFriMorningRotation[thuFriIdx]]);
      for (const id of smIds) {
        if (onVac(id)) continue;
        const shift = thuFriMorning.has(id)
          ? this._smMorningShift(id)
          : this._smAfternoonShift(id);
        this.set(id, w, THU, shift);
        this.set(id, w, FRI, shift);
      }

      // Sat: rotate pairs (cris_c participates freely on Sat — morningOnly applies Mon-Fri only)
      // Uses a 6-cycle rotation among all possible pairs of the 4 SMs to maximise Saturday
      // coverage variation. The formula (w*2 + seed*3) % 6 spreads across all 6 pairs
      // more evenly than a simple modulo 6 would when iterated over 13 weeks.
      const satIdx = (w * 2 + this._smRotSeed * 3) % satCycles.length;
      const satMorning = new Set(satCycles[satIdx]);
      for (const id of smIds) {
        if (onVac(id)) continue;
        // Cris Carcel constraint: morningOnlyWeekdays (Mon-Fri), Sat free
        const shift = satMorning.has(id)
          ? this._smMorningShift(id)
          : this._smAfternoonShift(id);
        this.set(id, w, SAT, shift);
      }
    }
  }

  _smMorningShift(id) {
    if (id === 'jorge')  return 'Early'; // Jorge: 8-17
    if (id === 'cris_c') return 'Early S'; // Cris Carcel: morning
    return 'Early';
  }
  _smAfternoonShift(id) { return 'Mid'; }

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
        const shift = block === 'morning' ? 'Early S' : 'Mid';
        // Assign Mon-Fri
        for (let d = MON; d <= FRI; d++) {
          this.set(p.id, w, d, shift);
        }
        // Sat: assigned later in _assignWeekendWorkdays
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

        const workSat = pattern[w];

        if (!workSat) {
          // Don't work Saturday → mark Sat as OFF (if not already set)
          if (!this.get(p.id, w, SAT) || this.get(p.id, w, SAT) === null) {
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
    // Pick the best weekday to take off, respecting constraints
    const c = p.c || {};
    const neverOff = c.neverOffDays || [];
    const avoidOff = c.avoidOffDays || [];

    // Never off on Thursday for Clara
    if (p.id === 'clara') neverOff.push(THU);

    // Prefer candidate days not in neverOff/avoidOff
    const candidates = [MON, THU, FRI].filter(d => !neverOff.includes(d));
    if (candidates.length === 0) {
      // Fall back to any weekday not in neverOff
      const fallback = [MON,TUE,WED,THU,FRI].filter(d => !neverOff.includes(d));
      const seedIdx = (w + TEAM_DATA.findIndex(t => t.id === p.id)) % fallback.length;
      return fallback[seedIdx] ?? FRI;
    }

    // Prefer days not in avoidOff
    const preferred = candidates.filter(d => !avoidOff.includes(d));
    const pool = preferred.length > 0 ? preferred : candidates;
    const idx = (w + TEAM_DATA.findIndex(t => t.id === p.id)) % pool.length;
    return pool[idx];
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
    this._assignSMRotation();
    this._assignManagerShifts();
    this._assignOpsLeads();
    this._assignLeadGenius();
    this._assignLeadShopping();
    this._assignDaysOff();
    this._fillRemaining();
    return this.sched;
  }
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
      const minRequired = d === SAT ? 12 : 14;
      let working = 0;
      for (const p of TEAM_DATA) {
        if (p.role === 'SL') continue;
        if (isWorking(sched[p.id]?.[w * DAYS_PER_WEEK + d])) working++;
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
      if (isWorking(s) && !isVacation(s)) {
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
      const shifts = ids.map(id => sched[id]?.[w * DAYS_PER_WEEK + MON])
        .filter(s => isWorking(s) && !isVacation(s));
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
      if (!isWorking(s) || isMorning(s)) prefPassed++;
    }
  }
  // Eva H: always morning when working
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const s = sched['eva_h']?.[i];
    if (isWorking(s) && !isVacation(s)) {
      prefChecks++;
      if (isMorning(s)) prefPassed++;
    }
  }
  // Eli: always morning when working
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const s = sched['eli']?.[i];
    if (isWorking(s) && !isVacation(s)) {
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
function validateSchedule(sched, qStartStr) {
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
      const minPeople = d === SAT ? 12 : 14;
      let working = 0, morningCount = 0, afternoonCount = 0;
      for (const p of TEAM_DATA) {
        if (p.role === 'SL') continue;
        const s = sched[p.id]?.[w * DAYS_PER_WEEK + d];
        if (isWorking(s) && !isVacation(s)) {
          working++;
          if (isMorning(s)) morningCount++;
          if (isAfternoon(s)) afternoonCount++;
        }
      }
      if (working < minPeople) {
        violations.push({ week: wLabel, level: 'error',
          msg: `${DAY_NAMES[d]} S${w+1}: solo ${working} personas (mínimo ${minPeople})` });
      }
    }

    // Rule: Cris Carcel Mon-Fri must be morning
    for (let d = MON; d <= FRI; d++) {
      const s = sched['cris_c']?.[w * DAYS_PER_WEEK + d];
      if (isWorking(s) && !isVacation(s) && !isMorning(s)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Cris Carcel: tarde el ${DAY_NAMES[d]} S${w+1} (solo mañana L-V)` });
      }
    }

    // Rule: Eva Hernandez always morning when working
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const s = sched['eva_h']?.[w * DAYS_PER_WEEK + d];
      if (isWorking(s) && !isVacation(s) && !isMorning(s)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Eva Hernandez: tarde el ${DAY_NAMES[d]} S${w+1} (siempre mañana)` });
      }
    }

    // Rule: Eli Moreno always morning when working
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const s = sched['eli']?.[w * DAYS_PER_WEEK + d];
      if (isWorking(s) && !isVacation(s) && !isMorning(s)) {
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

    // Rule: All 4 SM must work Mon+Tue (morning)
    const smIds = ['jorge','sheila','itziar','cris_c'];
    for (const id of smIds) {
      for (const d of [MON, TUE]) {
        const s = sched[id]?.[w * DAYS_PER_WEEK + d];
        if (s === 'OFF') {
          const name = TEAM_DATA.find(p => p.id === id)?.name || id;
          violations.push({ week: wLabel, level: 'warning',
            msg: `${name}: libre el ${DAY_NAMES[d]} S${w+1} (SM deben trabajar L+M de mañana)` });
        }
      }
    }

    // Rule: Ops Leads always crossed (one morning, one afternoon)
    const auroraSh = sched['aurora']?.[w * DAYS_PER_WEEK + MON];
    const rubenSh  = sched['ruben']?.[w * DAYS_PER_WEEK + MON];
    if (isWorking(auroraSh) && isWorking(rubenSh) && !isVacation(auroraSh) && !isVacation(rubenSh)) {
      if (isMorning(auroraSh) === isMorning(rubenSh)) {
        violations.push({ week: wLabel, level: 'error',
          msg: `Aurora y Rubén: mismo turno en S${w+1} (deben estar cruzados)` });
      }
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
  }

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────────────────────
let state = {
  qStartDate:      '2026-03-30',
  season:          'verano',
  variants:        [],   // [{ sched, score, details }]
  selectedVariant: -1,
  activeSchedule:  null, // editable copy
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
      qStartDate:      state.qStartDate,
      season:          state.season,
      selectedVariant: state.selectedVariant,
      activeSchedule:  state.activeSchedule,
    }));
  } catch(e) { /* ignore */ }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.qStartDate)     state.qStartDate     = parsed.qStartDate;
    if (parsed.season)         state.season          = parsed.season;
    if (parsed.activeSchedule) state.activeSchedule  = parsed.activeSchedule;
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
        const gen   = new ScheduleGenerator({ qStartDate: state.qStartDate, season: state.season }, seed);
        const sched = gen.generate();
        const score = scoreSchedule(sched, state.qStartDate);
        variants.push({ sched, score, seed });
      }
      // Sort by score descending
      variants.sort((a,b) => b.score.total - a.score.total);
      state.variants = variants;
      state.selectedVariant = 0;
      state.activeSchedule  = deepCopy(variants[0].sched);
      state.violations = validateSchedule(state.activeSchedule, state.qStartDate);
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
  state.selectedVariant = idx;
  state.activeSchedule  = deepCopy(state.variants[idx].sched);
  state.violations = validateSchedule(state.activeSchedule, state.qStartDate);
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
  state.violations = validateSchedule(state.activeSchedule, state.qStartDate);
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
    const end = addDays(wd, 5);
    const label = `S${wi+1} (${formatDate(wd)}-${formatDate(end)})`;
    for (let d = 0; d < DAYS_PER_WEEK; d++) hdr1.push(d === 0 ? label : '');
  });
  rows.push(hdr1);

  // Header row 2: Day labels
  const hdr2 = ['', ''];
  for (let w = 0; w < WEEKS; w++) {
    DAY_LABELS.forEach(dl => hdr2.push(dl));
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
  let lastRole = '';
  for (const p of TEAM_DATA) {
    if (p.role !== lastRole) {
      rows.push([sections[p.role] || p.role, '', ...new Array(TOTAL_DAYS).fill('')]);
      lastRole = p.role;
    }
    const row = [p.name, p.role];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      row.push(state.activeSchedule[p.id]?.[i] || '');
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
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      hdr1.push(d === 0 ? `S${wi+1} ${formatDate(wd)}` : DAY_LABELS[d]);
    }
  });
  aoa.push(hdr1);

  for (const p of TEAM_DATA) {
    const row = [p.name, p.role];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      row.push(state.activeSchedule[p.id]?.[i] || '');
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
      // Sunday is not tracked by the planificador — everyone is Off
      days['Sun'] = 'Off';

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
    btn.textContent = `S${wi+1}`;
    btn.title = formatDate(wd);
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
    const th = document.createElement('th');
    th.className = 'week-header';
    th.colSpan = DAYS_PER_WEEK;
    th.id = `week-col-${wi}`;
    const endDate = addDays(wd, 5);
    th.textContent = `S${wi+1} ${formatDate(wd)}–${formatDate(endDate)}`;
    // Check if QBR week
    const qbrInWeek = Array.from({length:6},(_,d)=>isQBRDay(state.qStartDate,wi,d)).some(Boolean);
    if (qbrInWeek) { th.classList.add('qbr-week'); th.title = 'Semana QBR'; }
    tr1.appendChild(th);
  });
  thead.appendChild(tr1);

  // Row 2: Day headers
  const tr2 = document.createElement('tr');
  for (let w = 0; w < WEEKS; w++) {
    DAY_LABELS.forEach((dl, d) => {
      const th = document.createElement('th');
      th.className = 'day-header' + (d === SAT ? ' sat' : '');
      th.textContent = dl;
      tr2.appendChild(th);
    });
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
      restTd.colSpan = TOTAL_DAYS;
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
  localStorage.setItem('planificador_theme', isDark ? 'light' : 'dark');
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
    state.violations = validateSchedule(state.activeSchedule, state.qStartDate);
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
  const savedTheme = localStorage.getItem('planificador_theme') || 'light';
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
    state.violations = validateSchedule(state.activeSchedule, state.qStartDate);
  }

  renderAll();
});
