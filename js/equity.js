/* ===== EQUITY.JS — Equity Tracker ===== */
/* Depends on SheetJS (xlsx) loaded via CDN */

'use strict';

// ═══ TEAM ROSTER ═══════════════════════════════════════════════════════════
const EQUITY_TEAM = [
  { id: 'diego',    name: 'Diego Rivero',     group: 'SL',   role: 'Store Leader' },
  { id: 'jordi',    name: 'Jordi Pajares',     group: 'SL',   role: 'Store Leader' },
  { id: 'jorge',    name: 'Jorge Gil',         group: 'SM',   role: 'Senior Manager' },
  { id: 'sheila',   name: 'Sheila Yubero',     group: 'SM',   role: 'Senior Manager' },
  { id: 'itziar',   name: 'Itziar Cacho',      group: 'SM',   role: 'Senior Manager' },
  { id: 'cris_c',   name: 'Cris Carcel',       group: 'SM',   role: 'Senior Manager' },
  { id: 'jesus',    name: 'Jesús Pazos',       group: 'MGR',  role: 'Manager' },
  { id: 'pedro',    name: 'Pedro Borlido',     group: 'MGR',  role: 'Manager' },
  { id: 'julie',    name: 'Julie Robin',       group: 'MGR',  role: 'Manager' },
  { id: 'javi_s',   name: 'Javi Sánchez',      group: 'MGR',  role: 'Manager' },
  { id: 'meri',     name: 'Meri Alvarez',      group: 'MGR',  role: 'Manager' },
  { id: 'toni',     name: 'Toni Medina',       group: 'MGR',  role: 'Manager' },
  { id: 'deborah',  name: 'Deborah Ibañez',    group: 'MGR',  role: 'Manager' },
  { id: 'ane',      name: 'Ane Pazos',         group: 'MGR',  role: 'Manager' },
  { id: 'ricardo',  name: 'Ricardo Sosa',      group: 'MGR',  role: 'Manager' },
  { id: 'javi_q',   name: 'Javi Quiros',       group: 'MGR',  role: 'Manager' },
  { id: 'cris_u',   name: 'Cris Usón',         group: 'MGR',  role: 'Manager' },
  { id: 'javi_can', name: 'Javi Canfranc',     group: 'MGR',  role: 'Manager' },
  { id: 'david',    name: 'David Carrillo',    group: 'MGR',  role: 'Manager' },
  { id: 'aurora',   name: 'Aurora Comesaña',   group: 'LEAD', role: 'Lead' },
  { id: 'ruben',    name: 'Rubén Martínez',    group: 'LEAD', role: 'Lead' },
  { id: 'eva_f',    name: 'Eva Famoso',        group: 'LEAD', role: 'Lead' },
  { id: 'eva_h',    name: 'Eva Hernandez',     group: 'LEAD', role: 'Lead' },
  { id: 'alberto',  name: 'Alberto Ortiz',     group: 'LEAD', role: 'Lead' },
  { id: 'clara',    name: 'Clara González',    group: 'LEAD', role: 'Lead' },
  { id: 'eli',      name: 'Eli Moreno',        group: 'LEAD', role: 'Lead' },
];

// ═══ SHIFT TYPES ═══════════════════════════════════════════════════════════
const SHIFT_TYPES = {
  'Early':    { category: 'early',    isWorking: true  },
  'Early S':  { category: 'early',    isWorking: true  },
  'Early C1': { category: 'early',    isWorking: true  },
  'Early C2': { category: 'early',    isWorking: true  },
  'Mid':      { category: 'mid',      isWorking: true  },
  'Mid S':    { category: 'mid',      isWorking: true  },
  'Late':     { category: 'late',     isWorking: true  },
  'Close':    { category: 'close',    isWorking: true  },
  'Close C1': { category: 'close',    isWorking: true  },
  'Close C2': { category: 'close',    isWorking: true  },
  'Open':     { category: 'open',     isWorking: true  },
  'Off':      { category: 'off',      isWorking: false },
  'Holidays': { category: 'holidays', isWorking: false },
  'BH':       { category: 'bh',       isWorking: true  },
  'TG':       { category: 'tg',       isWorking: true  },
  'Own':      { category: 'own',      isWorking: true  },
  'Coach':    { category: 'coach',    isWorking: true  },
  'Support':  { category: 'support',  isWorking: true  },
};

function shiftCat(s)     { return (SHIFT_TYPES[s] || {}).category || null; }
function isMorning(s)    { return ['early','open','bh','tg','own'].includes(shiftCat(s)); }
function isAfternoon(s)  { return ['late','close'].includes(shiftCat(s)); }
function isMid(s)        { return shiftCat(s) === 'mid'; }
function isWorking(s)    { const t = SHIFT_TYPES[s]; return t ? t.isWorking : (!!s && s !== 'Off' && s !== 'Holidays'); }
function isOff(s)        { return !s || s === 'Off' || s === 'Holidays'; }

// ═══ STATE ══════════════════════════════════════════════════════════════════
const state = {
  quarters: [],
  currentQId: null,
  weeks: [],
  activeTab: 'dashboard',
  tableSortCol: null,
  tableSortDir: 'asc',
  filterGroup: 'all',
  pendingWeekFiles: [],   // queue of {file, buffer, ext} awaiting week number
};

// ═══ STORAGE ════════════════════════════════════════════════════════════════
const LS_QUARTERS = 'equity_quarters';

function loadState() {
  try {
    const q = localStorage.getItem(LS_QUARTERS);
    state.quarters = q ? JSON.parse(q) : [];
    // Select last used quarter
    const lastQ = localStorage.getItem('equity_last_quarter');
    state.currentQId = lastQ && state.quarters.find(q => q.id === lastQ)
      ? lastQ
      : (state.quarters.length ? state.quarters[state.quarters.length - 1].id : null);
    if (state.currentQId) loadWeeksForCurrentQ();
  } catch (e) {
    state.quarters = [];
    state.currentQId = null;
    state.weeks = [];
  }
}

function saveQuarters() {
  localStorage.setItem(LS_QUARTERS, JSON.stringify(state.quarters));
}

function loadWeeksForCurrentQ() {
  if (!state.currentQId) { state.weeks = []; return; }
  try {
    const raw = localStorage.getItem('equity_data_' + state.currentQId);
    state.weeks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.weeks = [];
  }
}

function saveWeeks() {
  if (!state.currentQId) return;
  localStorage.setItem('equity_data_' + state.currentQId, JSON.stringify(state.weeks));
}

// ═══ QUARTER MANAGEMENT ═════════════════════════════════════════════════════
function getCurrentFYInfo() {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  // FY: Aug(7)-Oct(9)=Q1, Nov(10)-Jan(0)=Q2, Feb(1)-Apr(3)=Q3, May(4)-Jul(6)=Q4
  let fy = now.getFullYear();
  let qn;
  if (m >= 7 && m <= 9)  { qn = 1; fy = fy + 1; }      // Aug-Oct → Q1 of next FY
  else if (m >= 10)      { qn = 2; fy = fy + 1; }      // Nov-Dec → Q2 of next FY
  else if (m === 0)      { qn = 2; }                    // Jan → Q2 of current FY
  else if (m >= 1 && m <= 3) { qn = 3; }               // Feb-Apr → Q3
  else                   { qn = 4; }                    // May-Jul → Q4
  return { q: qn, fy: fy % 100 };
}

function suggestQuarterLabel() {
  const { q, fy } = getCurrentFYInfo();
  return `Q${q} FY${fy}`;
}

function createQuarter(label) {
  const id = label.replace(/\s+/g, '').toUpperCase();
  if (state.quarters.find(q => q.id === id)) {
    showToast('Ya existe un trimestre con ese nombre', 'error');
    return null;
  }
  const quarter = { id, label, createdAt: new Date().toISOString() };
  state.quarters.push(quarter);
  saveQuarters();
  return quarter;
}

function selectQuarter(qId) {
  state.currentQId = qId;
  localStorage.setItem('equity_last_quarter', qId);
  loadWeeksForCurrentQ();
}

function deleteQuarter(qId) {
  state.quarters = state.quarters.filter(q => q.id !== qId);
  saveQuarters();
  localStorage.removeItem('equity_data_' + qId);
  if (state.currentQId === qId) {
    state.currentQId = state.quarters.length ? state.quarters[state.quarters.length - 1].id : null;
    if (state.currentQId) localStorage.setItem('equity_last_quarter', state.currentQId);
    else localStorage.removeItem('equity_last_quarter');
    loadWeeksForCurrentQ();
  }
}

// ═══ WEEK MANAGEMENT ════════════════════════════════════════════════════════
function addWeek(weekData) {
  // Replace if same weekNum already exists
  state.weeks = state.weeks.filter(w => w.weekNum !== weekData.weekNum);
  state.weeks.push(weekData);
  state.weeks.sort((a, b) => a.weekNum - b.weekNum);
  saveWeeks();
}

function removeWeek(weekNum) {
  state.weeks = state.weeks.filter(w => w.weekNum !== weekNum);
  saveWeeks();
}

function clearAllWeeks() {
  state.weeks = [];
  saveWeeks();
}

// ═══ FILE PARSING ════════════════════════════════════════════════════════════
const DAY_PATTERNS = [
  { key: 'Mon', re: /^(mon|lun|monday|lunes)/i },
  { key: 'Tue', re: /^(tue|mar|tuesday|martes)/i },
  { key: 'Wed', re: /^(wed|mi[eé]|wednesday|mi[eé]rcoles)/i },
  { key: 'Thu', re: /^(thu|jue|thursday|jueves)/i },
  { key: 'Fri', re: /^(fri|vie|friday|viernes)/i },
  { key: 'Sat', re: /^(sat|s[aá]b|saturday|s[aá]bado)/i },
  { key: 'Sun', re: /^(sun|dom|sunday|domingo)/i },
];

function normalizeShift(raw) {
  if (!raw || raw === '') return '';
  const s = raw.trim();
  if (SHIFT_TYPES[s]) return s;
  const lower = s.toLowerCase();
  for (const key of Object.keys(SHIFT_TYPES)) {
    if (key.toLowerCase() === lower) return key;
  }
  if (/^early/i.test(s)) {
    if (/c2/i.test(s)) return 'Early C2';
    if (/c1/i.test(s)) return 'Early C1';
    if (/\bs\b/i.test(s)) return 'Early S';
    return 'Early';
  }
  if (/^mid/i.test(s)) { if (/\bs\b/i.test(s)) return 'Mid S'; return 'Mid'; }
  if (/^close/i.test(s) || /^cierre/i.test(s)) {
    if (/c2/i.test(s)) return 'Close C2';
    if (/c1/i.test(s)) return 'Close C1';
    return 'Close';
  }
  if (/^late/i.test(s) || /^tarde/i.test(s)) return 'Late';
  if (/^open/i.test(s) || /^apertura/i.test(s)) return 'Open';
  if (/^off/i.test(s) || /^libre/i.test(s)) return 'Off';
  if (/^holid/i.test(s) || /^vac/i.test(s) || /^festiv/i.test(s)) return 'Holidays';
  if (/^bh$/i.test(s)) return 'BH';
  if (/^tg$/i.test(s)) return 'TG';
  if (/^own$/i.test(s)) return 'Own';
  if (/^coach/i.test(s)) return 'Coach';
  if (/^support/i.test(s)) return 'Support';
  return s;
}

function parseScheduleSheet(rows) {
  if (!rows || rows.length < 2) return null;
  const DAY_RE_FALLBACK = /^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)/i;

  let headerRowIdx = -1;
  let headerRow = null;

  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i].map(v => String(v).trim());
    const lower = r.map(v => v.toLowerCase());
    if (lower.includes('name') || lower.includes('nombre') ||
        lower.some(c => c === 'role' || c === 'rol')) {
      headerRowIdx = i; headerRow = r; break;
    }
  }
  if (headerRowIdx === -1) {
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const lower = rows[i].map(v => String(v).trim().toLowerCase());
      if (lower.filter(c => DAY_RE_FALLBACK.test(c)).length >= 4) {
        headerRowIdx = i;
        headerRow = rows[i].map(v => String(v).trim());
        break;
      }
    }
  }
  if (headerRowIdx === -1) { headerRowIdx = 0; headerRow = rows[0].map(v => String(v).trim()); }

  const colMap = {};
  const dayColIndices = [];
  const dayColKeys = [];

  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c].toLowerCase().trim();
    if (!h) continue;
    if (h === 'name' || h === 'nombre') colMap.name = c;
    else if (h === 'role' || h === 'rol') colMap.role = c;
    else if (h === 'dept' || h === 'dpto') colMap.dept = c;
    else {
      const dm = DAY_PATTERNS.find(d => d.re.test(h));
      if (dm) { dayColIndices.push(c); dayColKeys.push(dm.key); }
    }
  }

  const dayKeys = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const usedDayCols = dayColIndices.slice(0, 7);
  const usedDayKeys = dayColKeys.slice(0, 7).map((k, i) => dayKeys[i] || k);

  const skipRe = /^(scheduled total|total am|total pm|coverage|%|total|resumen)/i;
  const persons = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(v => String(v).trim() === '')) continue;
    const nameVal = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : String(row[0] || '').trim();
    if (!nameVal || skipRe.test(nameVal) || /^\d+$/.test(nameVal) || nameVal.length < 2) continue;
    const roleVal = colMap.role !== undefined ? String(row[colMap.role] || '').trim() : '';
    const deptVal = colMap.dept !== undefined ? String(row[colMap.dept] || '').trim() : '';
    const days = {};
    for (let d = 0; d < usedDayCols.length; d++) {
      const key = usedDayKeys[d];
      days[key] = normalizeShift(String(row[usedDayCols[d]] || '').trim());
    }
    persons.push({ name: nameVal, role: roleVal, dept: deptVal, days });
  }

  return persons;
}

function parseFile(buffer, ext) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS no cargado');
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  const allPersons = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const parsed = parseScheduleSheet(rawData);
    if (parsed && parsed.length > 0) {
      parsed.forEach(p => {
        if (!allPersons.find(ap => normalizeName(ap.name) === normalizeName(p.name))) {
          allPersons.push(p);
        }
      });
    }
  }
  return allPersons;
}

// ═══ NAME MATCHING ══════════════════════════════════════════════════════════
function normalizeName(n) {
  return (n || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function findTeamMember(nameFromFile) {
  const norm = normalizeName(nameFromFile);
  return EQUITY_TEAM.find(p => {
    const pn = normalizeName(p.name);
    if (pn === norm) return true;
    const parts = pn.split(' ');
    return parts.some(part => part.length > 2 && norm.includes(part));
  }) || null;
}

// ═══ EQUITY COMPUTATION ═════════════════════════════════════════════════════
function computeWeekType(days) {
  let morning = 0, afternoon = 0, mid = 0, total = 0;
  for (const key of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) {
    const s = days[key];
    if (!s || isOff(s)) continue;
    total++;
    if (isMorning(s)) morning++;
    else if (isAfternoon(s)) afternoon++;
    else if (isMid(s)) mid++;
  }
  if (total === 0) return 'off';
  if (morning >= afternoon && morning >= mid) return morning / total >= 0.5 ? 'morning' : 'mixed';
  if (afternoon >= morning && afternoon >= mid) return afternoon / total >= 0.5 ? 'afternoon' : 'mixed';
  if (mid >= morning && mid >= afternoon) return mid / total >= 0.5 ? 'mid' : 'mixed';
  return 'mixed';
}

function computeScore(stats, weeksTotal) {
  if (weeksTotal === 0) return 100;
  let score = 100;

  // Morning/afternoon imbalance for managers and SMs
  if (stats.group !== 'LEAD' && weeksTotal > 0) {
    const mPct = (stats.weeksMorning / weeksTotal) * 100;
    const aPct = (stats.weeksAfternoon / weeksTotal) * 100;
    const imbalance = Math.abs(mPct - 50);
    if (imbalance > 30) score -= 30;
    else if (imbalance > 20) score -= 20;
    else if (imbalance > 10) score -= 10;
  }

  // Weekend imbalance
  const wTotal = stats.weekendsWorked + stats.weekendsOff;
  if (wTotal > 0) {
    const wPct = (stats.weekendsWorked / wTotal) * 100;
    const wimb = Math.abs(wPct - 50);
    if (wimb > 25) score -= 20;
    else if (wimb > 15) score -= 10;
    else if (wimb > 10) score -= 5;
  }

  // Consecutive streak penalty
  const maxStreak = Math.max(stats.consecutiveMorning, stats.consecutiveAfternoon);
  if (maxStreak > 4) score -= (maxStreak - 4) * 10;
  else if (maxStreak > 2) score -= (maxStreak - 2) * 5;

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function computeEquity() {
  const result = new Map();
  const weeks = state.weeks;
  const weeksTotal = weeks.length;

  for (const member of EQUITY_TEAM) {
    if (member.group === 'SL') continue;

    const stats = {
      id: member.id,
      name: member.name,
      role: member.role,
      group: member.group,
      weeksMorning: 0,
      weeksAfternoon: 0,
      weeksMid: 0,
      weeksMixed: 0,
      weeksOff: 0,
      weekendsWorked: 0,
      weekendsOff: 0,
      coachDays: 0,
      supportDays: 0,
      opens: 0,
      closes: 0,
      consecutiveMorning: 0,
      consecutiveAfternoon: 0,
      weekTypes: [],  // 'morning'|'afternoon'|'mid'|'mixed'|'off' per week
      score: 100,
    };

    let curMornStreak = 0, maxMornStreak = 0;
    let curAftStreak  = 0, maxAftStreak  = 0;

    for (const week of weeks) {
      const personData = week.persons
        ? week.persons.find(p => findTeamMember(p.name) && findTeamMember(p.name).id === member.id)
        : null;

      if (!personData) {
        stats.weekTypes.push(null);
        curMornStreak = 0;
        curAftStreak = 0;
        continue;
      }

      const d = personData.days || {};
      const wtype = computeWeekType(d);
      stats.weekTypes.push(wtype);

      if (wtype === 'morning')   { stats.weeksMorning++;   curMornStreak++; curAftStreak = 0; }
      else if (wtype === 'afternoon') { stats.weeksAfternoon++; curAftStreak++; curMornStreak = 0; }
      else if (wtype === 'mid')  { stats.weeksMid++;       curMornStreak = 0; curAftStreak = 0; }
      else if (wtype === 'off')  { stats.weeksOff++;       curMornStreak = 0; curAftStreak = 0; }
      else                       { stats.weeksMixed++;     curMornStreak = 0; curAftStreak = 0; }

      maxMornStreak = Math.max(maxMornStreak, curMornStreak);
      maxAftStreak  = Math.max(maxAftStreak,  curAftStreak);

      // Weekend stats
      const satWorked = d.Sat && isWorking(d.Sat);
      const sunWorked = d.Sun && isWorking(d.Sun);
      if (satWorked || sunWorked) stats.weekendsWorked++;
      if (!satWorked && !sunWorked) stats.weekendsOff++;

      // Day-level counters
      for (const dayKey of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) {
        const s = d[dayKey];
        if (!s) continue;
        if (s === 'Coach')   stats.coachDays++;
        if (s === 'Support') stats.supportDays++;
        if (s === 'Open' || shiftCat(s) === 'open') stats.opens++;
        if (shiftCat(s) === 'close') stats.closes++;
      }
    }

    stats.consecutiveMorning = maxMornStreak;
    stats.consecutiveAfternoon = maxAftStreak;
    stats.score = computeScore(stats, weeksTotal);
    result.set(member.id, stats);
  }

  return result;
}

// ═══ ALERTS ══════════════════════════════════════════════════════════════════
function generateAlerts(equityMap, weeksTotal) {
  const alerts = [];
  if (weeksTotal === 0) return alerts;

  for (const [id, stats] of equityMap) {
    const name = stats.name;

    // Morning/afternoon imbalance (non-LEAD)
    if (stats.group !== 'LEAD' && weeksTotal >= 3) {
      const mPct = (stats.weeksMorning / weeksTotal) * 100;
      const aPct = (stats.weeksAfternoon / weeksTotal) * 100;
      const imb = Math.abs(mPct - 50);
      const dir = mPct > 50 ? 'más mañanas' : 'más tardes';
      if (imb > 25) {
        alerts.push({ severity: 'critical', personId: id, message: `${name}: desequilibrio mañana/tarde crítico (${Math.round(mPct)}% mañana, ${Math.round(aPct)}% tarde — ${dir})` });
      } else if (imb > 15) {
        alerts.push({ severity: 'important', personId: id, message: `${name}: desequilibrio mañana/tarde importante (${Math.round(mPct)}% mañana — ${dir})` });
      } else if (imb > 10) {
        alerts.push({ severity: 'suggestion', personId: id, message: `${name}: leve desequilibrio mañana/tarde (${Math.round(mPct)}% mañana)` });
      }
    }

    // Weekend imbalance
    const wTotal = stats.weekendsWorked + stats.weekendsOff;
    if (wTotal >= 3) {
      const wPct = (stats.weekendsWorked / wTotal) * 100;
      const wimb = Math.abs(wPct - 50);
      if (wimb > 25) {
        alerts.push({ severity: 'critical', personId: id, message: `${name}: desequilibrio fines de semana crítico (${Math.round(wPct)}% trabajados)` });
      } else if (wimb > 15) {
        alerts.push({ severity: 'important', personId: id, message: `${name}: fines de semana desequilibrados (${Math.round(wPct)}% trabajados)` });
      } else if (wimb > 10) {
        alerts.push({ severity: 'suggestion', personId: id, message: `${name}: revisar distribución de fines de semana (${Math.round(wPct)}% trabajados)` });
      }
    }

    // Consecutive streak
    const maxStreak = Math.max(stats.consecutiveMorning, stats.consecutiveAfternoon);
    const streakType = stats.consecutiveMorning > stats.consecutiveAfternoon ? 'mañana' : 'tarde';
    if (maxStreak >= 5) {
      alerts.push({ severity: 'critical', personId: id, message: `${name}: ${maxStreak} semanas consecutivas de ${streakType} — rotación urgente` });
    } else if (maxStreak >= 4) {
      alerts.push({ severity: 'important', personId: id, message: `${name}: ${maxStreak} semanas consecutivas de ${streakType}` });
    } else if (maxStreak >= 3) {
      alerts.push({ severity: 'suggestion', personId: id, message: `${name}: ${maxStreak} semanas consecutivas de ${streakType} — considerar rotación` });
    }

    // Coach/support imbalance for managers
    if (stats.group === 'MGR' && weeksTotal >= 3) {
      const csTotal = stats.coachDays + stats.supportDays;
      if (csTotal > 0) {
        const cPct = (stats.coachDays / csTotal) * 100;
        const csImb = Math.abs(cPct - 50);
        if (csImb > 30) {
          alerts.push({ severity: 'critical', personId: id, message: `${name}: desequilibrio Coach/Support crítico (${stats.coachDays}C / ${stats.supportDays}S)` });
        } else if (csImb > 20) {
          alerts.push({ severity: 'important', personId: id, message: `${name}: desequilibrio Coach/Support (${stats.coachDays}C / ${stats.supportDays}S)` });
        }
      }
    }

    // Eva H and Eli Moreno — should always be morning
    if ((id === 'eva_h' || id === 'eli') && stats.weeksAfternoon > 0) {
      alerts.push({ severity: 'critical', personId: id, message: `${name}: petición aprobada — siempre mañana, pero tiene ${stats.weeksAfternoon} semana(s) de tarde asignadas` });
    }
  }

  // Check Aurora/Rubén opposite shifts
  const aurora = equityMap.get('aurora');
  const ruben  = equityMap.get('ruben');
  if (aurora && ruben && weeksTotal >= 2) {
    let sameWeeks = 0;
    for (let i = 0; i < aurora.weekTypes.length; i++) {
      const at = aurora.weekTypes[i];
      const rt = ruben.weekTypes[i];
      if (at && rt && at !== 'off' && rt !== 'off' && at === rt) sameWeeks++;
    }
    if (sameWeeks > 0) {
      alerts.push({ severity: 'important', personId: 'aurora', message: `Aurora y Rubén (Ops Leads): ${sameWeeks} semana(s) con el mismo tipo de turno — deberían turnarse mañana/tarde` });
    }
  }

  // Sort: critical → important → suggestion
  const order = { critical: 0, important: 1, suggestion: 2 };
  alerts.sort((a, b) => (order[a.severity] || 0) - (order[b.severity] || 0));
  return alerts;
}

// ═══ THEME ═══════════════════════════════════════════════════════════════════
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('equity_theme', newTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = newTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

function applyTheme() {
  const saved = localStorage.getItem('equity_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

// ═══ RENDER — MAIN ═══════════════════════════════════════════════════════════
function render() {
  renderQuarterBar();
  renderTabPanels();
  const hasWeeks = state.weeks.length > 0;
  const actionBar = document.getElementById('action-bar');
  if (actionBar) actionBar.style.display = state.currentQId && hasWeeks ? 'flex' : 'none';
}

function renderTabPanels() {
  // Show/hide tab panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-' + state.activeTab);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.tab-btn[data-tab="${state.activeTab}"]`);
  if (btn) btn.classList.add('active');

  if (!state.currentQId) {
    renderEmptyAll();
    return;
  }

  const equityMap = computeEquity();
  const weeksTotal = state.weeks.length;
  const alerts = generateAlerts(equityMap, weeksTotal);

  // Update alerts badge
  const badge = document.getElementById('alerts-badge');
  if (badge) {
    const critCount = alerts.filter(a => a.severity === 'critical').length;
    if (critCount > 0) { badge.textContent = critCount; badge.style.display = 'inline'; }
    else badge.style.display = 'none';
  }

  renderWeeksList();

  if (state.activeTab === 'dashboard') {
    renderDashboard(equityMap, weeksTotal);
  } else if (state.activeTab === 'table') {
    renderTable(equityMap, weeksTotal);
  } else if (state.activeTab === 'timeline') {
    renderTimeline(equityMap);
  } else if (state.activeTab === 'alerts') {
    renderAlerts(alerts);
  }
}

function renderEmptyAll() {
  const emptyHTML = `<div class="empty-state"><span class="empty-icon">⚖️</span><h3>Sin trimestre seleccionado</h3><p>Crea o selecciona un trimestre en la barra superior para empezar.</p></div>`;
  ['eq-grid','eq-table-container','timeline-container','alerts-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = emptyHTML;
  });
}

// ═══ RENDER — QUARTER BAR ════════════════════════════════════════════════════
function renderQuarterBar() {
  const bar = document.getElementById('quarter-bar');
  if (!bar) return;

  let html = `<label>Trimestre:</label>`;

  if (state.quarters.length === 0) {
    html += `<span class="quarter-bar-empty">Sin trimestres. Crea uno:</span>`;
  } else {
    html += `<select class="quarter-select" onchange="onQuarterChange(this.value)">`;
    for (const q of state.quarters) {
      const sel = q.id === state.currentQId ? 'selected' : '';
      html += `<option value="${esc(q.id)}" ${sel}>${esc(q.label)}</option>`;
    }
    html += `</select>`;
    if (state.currentQId) {
      const count = state.weeks.length;
      html += `<span class="quarter-weeks-badge">${count} sem.</span>`;
      html += `<button class="btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="onDeleteQuarter('${esc(state.currentQId)}')">🗑 Eliminar</button>`;
    }
  }

  const suggest = suggestQuarterLabel();
  html += `
    <div class="quarter-create-form" id="q-create-form" style="margin-left:auto;">
      <input type="text" id="q-label-input" placeholder="${esc(suggest)}" value="${esc(suggest)}" maxlength="20">
      <button class="btn-primary" style="padding:6px 14px;font-size:.83rem;" onclick="onCreateQuarter()">+ Nuevo Trimestre</button>
    </div>`;

  bar.innerHTML = html;
}

function onQuarterChange(qId) {
  selectQuarter(qId);
  render();
}

function onCreateQuarter() {
  const input = document.getElementById('q-label-input');
  const label = (input ? input.value.trim() : '') || suggestQuarterLabel();
  if (!label) return;
  const q = createQuarter(label);
  if (q) {
    selectQuarter(q.id);
    render();
    showToast(`✅ Trimestre "${label}" creado`, 'ok');
  }
}

function onDeleteQuarter(qId) {
  const q = state.quarters.find(q => q.id === qId);
  if (!q) return;
  if (!confirm(`¿Eliminar trimestre "${q.label}" y todos sus datos?`)) return;
  deleteQuarter(qId);
  render();
  showToast('Trimestre eliminado', '');
}

// ═══ RENDER — WEEKS LIST ════════════════════════════════════════════════════
function renderWeeksList() {
  const container = document.getElementById('weeks-list-container');
  if (!container) return;

  let html = '<div class="weeks-list">';
  if (state.weeks.length === 0) {
    html += '<span style="font-size:.82rem;color:var(--text-muted);">Sin semanas importadas</span>';
  } else {
    for (const w of state.weeks) {
      html += `<span class="week-chip">Sem. ${w.weekNum}<button class="week-chip-remove" onclick="onRemoveWeek(${w.weekNum})" title="Eliminar semana ${w.weekNum}">×</button></span>`;
    }
    html += `<button class="btn-danger" style="padding:3px 10px;font-size:.78rem;" onclick="onClearWeeks()">🗑 Limpiar todo</button>`;
  }
  html += '</div><div class="loading-bar" id="loading-bar"></div>';
  container.innerHTML = html;
}

function onRemoveWeek(weekNum) {
  removeWeek(weekNum);
  render();
  showToast(`Semana ${weekNum} eliminada`, '');
}

function onClearWeeks() {
  if (!confirm('¿Eliminar todas las semanas importadas?')) return;
  clearAllWeeks();
  render();
  showToast('Todas las semanas eliminadas', '');
}

// ═══ RENDER — DASHBOARD ══════════════════════════════════════════════════════
function renderDashboard(equityMap, weeksTotal) {
  const grid = document.getElementById('eq-grid');
  if (!grid) return;

  if (weeksTotal === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">📂</span><h3>Sin datos aún</h3><p>Importa archivos de semanas cerradas usando la zona de carga de arriba.</p></div>`;
    return;
  }

  // Apply group filter
  const filtered = [...equityMap.values()].filter(s => {
    if (state.filterGroup === 'all') return true;
    return s.group === state.filterGroup;
  });

  // Sort: SM → MGR → LEAD, then by name
  const groupOrder = { SM: 0, MGR: 1, LEAD: 2 };
  filtered.sort((a, b) => (groupOrder[a.group] || 99) - (groupOrder[b.group] || 99) || a.name.localeCompare(b.name));

  grid.innerHTML = filtered.map(stats => renderPersonCard(stats, weeksTotal)).join('');
}

function renderPersonCard(stats, weeksTotal) {
  const scoreColor = getScoreColor(stats.score);
  const hasWeeks = weeksTotal > 0;
  const mPct = hasWeeks ? Math.round((stats.weeksMorning / weeksTotal) * 100) : 0;
  const aPct = hasWeeks ? Math.round((stats.weeksAfternoon / weeksTotal) * 100) : 0;
  const wTotal = stats.weekendsWorked + stats.weekendsOff;
  const wPct = wTotal > 0 ? Math.round((stats.weekendsWorked / wTotal) * 100) : 0;

  // Bar color for morning/afternoon balance
  const imbalance = Math.abs(mPct - 50);
  const barColor = imbalance > 25 ? 'red' : imbalance > 15 ? 'yellow' : 'green';

  // Weekend bar color
  const wImb = Math.abs(wPct - 50);
  const wBarColor = wImb > 25 ? 'red' : wImb > 15 ? 'yellow' : 'green';

  let cardHTML = `
    <div class="eq-card">
      <div class="eq-card-header">
        <div>
          <div class="eq-card-name">${esc(stats.name)}</div>
          <span class="role-badge ${stats.group}">${stats.group}</span>
        </div>
        <div class="eq-score ${scoreColor}">${stats.score}</div>
      </div>`;

  // Morning/afternoon (non-LEAD)
  if (stats.group !== 'LEAD') {
    cardHTML += `
      <div class="eq-metric">
        <div class="eq-metric-label">Mañana vs Tarde</div>
        <div class="eq-bar-row">
          <div class="eq-split-bar" style="flex:1">
            <div class="eq-split-morning" style="width:${mPct}%"></div>
            <div class="eq-split-afternoon"></div>
          </div>
          <span class="eq-bar-val">${stats.weeksMorning}M / ${stats.weeksAfternoon}T</span>
        </div>
      </div>`;
  }

  // Weekend
  cardHTML += `
    <div class="eq-metric">
      <div class="eq-metric-label">Fines de semana trabajados</div>
      <div class="eq-bar-row">
        <div class="eq-bar-bg">
          <div class="eq-bar-fill ${wBarColor}" style="width:${wPct}%"></div>
          <div class="eq-bar-center"></div>
        </div>
        <span class="eq-bar-val">${wPct}%</span>
      </div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-top:3px;">${stats.weekendsWorked} trabajados / ${stats.weekendsOff} libres</div>
    </div>`;

  // Coach/Support for managers
  if (stats.group === 'MGR') {
    const csTotal = stats.coachDays + stats.supportDays;
    const cPct = csTotal > 0 ? Math.round((stats.coachDays / csTotal) * 100) : 0;
    cardHTML += `
      <div class="eq-metric">
        <div class="eq-metric-label">Coach vs Support</div>
        <div class="eq-bar-row">
          <div class="eq-split-bar" style="flex:1">
            <div class="eq-split-morning" style="width:${cPct}%;background:#9ae6b4"></div>
            <div class="eq-split-afternoon" style="background:#fbd38d"></div>
          </div>
          <span class="eq-bar-val">${stats.coachDays}C / ${stats.supportDays}S</span>
        </div>
      </div>`;
  }

  // Counters
  cardHTML += `
    <div class="eq-counters">
      <div class="eq-counter"><span class="eq-counter-val">${stats.opens}</span><span class="eq-counter-label">Aperturas</span></div>
      <div class="eq-counter"><span class="eq-counter-val">${stats.closes}</span><span class="eq-counter-label">Cierres</span></div>
      <div class="eq-counter"><span class="eq-counter-val">${stats.consecutiveMorning}</span><span class="eq-counter-label">Racha M</span></div>
      <div class="eq-counter"><span class="eq-counter-val">${stats.consecutiveAfternoon}</span><span class="eq-counter-label">Racha T</span></div>
    </div>
  </div>`;

  return cardHTML;
}

// ═══ RENDER — TABLE ══════════════════════════════════════════════════════════
function renderTable(equityMap, weeksTotal) {
  const container = document.getElementById('eq-table-container');
  if (!container) return;

  if (weeksTotal === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><h3>Sin datos</h3><p>Importa semanas para ver la tabla resumen.</p></div>`;
    return;
  }

  const cols = [
    { key: 'name',           label: 'Nombre' },
    { key: 'group',          label: 'Rol' },
    { key: 'weeksMorning',   label: 'Sem.M' },
    { key: 'weeksAfternoon', label: 'Sem.T' },
    { key: 'pctMT',          label: '%M/T' },
    { key: 'weekendsWorked', label: 'Fin.W↑' },
    { key: 'pctFin',         label: '%Fin' },
    { key: 'coachDays',      label: 'Coach' },
    { key: 'supportDays',    label: 'Support' },
    { key: 'opens',          label: 'Open' },
    { key: 'closes',         label: 'Close' },
    { key: 'score',          label: 'Score' },
  ];

  let rows = [...equityMap.values()].map(s => ({
    ...s,
    pctMT: weeksTotal > 0 ? Math.round((s.weeksMorning / weeksTotal) * 100) : 0,
    pctFin: (s.weekendsWorked + s.weekendsOff) > 0 ? Math.round((s.weekendsWorked / (s.weekendsWorked + s.weekendsOff)) * 100) : 0,
  }));

  if (state.tableSortCol) {
    rows.sort((a, b) => {
      let va = a[state.tableSortCol], vb = b[state.tableSortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return state.tableSortDir === 'asc' ? -1 : 1;
      if (va > vb) return state.tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  let html = `<div class="eq-table-wrap"><table class="eq-table"><thead><tr>`;
  for (const col of cols) {
    let cls = '';
    if (state.tableSortCol === col.key) cls = state.tableSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
    html += `<th class="${cls}" onclick="sortTable('${col.key}')">${esc(col.label)}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const row of rows) {
    const sc = getScoreColor(row.score);
    const mImb = Math.abs(row.pctMT - 50);
    const wImb = Math.abs(row.pctFin - 50);
    html += `<tr>
      <td class="col-name">${esc(row.name)}</td>
      <td><span class="role-badge ${row.group}">${row.group}</span></td>
      <td>${row.weeksMorning}</td>
      <td>${row.weeksAfternoon}</td>
      <td class="${mImb > 25 ? 'cell-bad' : mImb > 15 ? 'cell-warn' : 'cell-good'}">${row.pctMT}%</td>
      <td>${row.weekendsWorked}</td>
      <td class="${wImb > 25 ? 'cell-bad' : wImb > 15 ? 'cell-warn' : 'cell-good'}">${row.pctFin}%</td>
      <td>${row.coachDays}</td>
      <td>${row.supportDays}</td>
      <td>${row.opens}</td>
      <td>${row.closes}</td>
      <td class="${sc === 'green' ? 'cell-good' : sc === 'red' ? 'cell-bad' : 'cell-warn'}" style="font-weight:700">${row.score}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ═══ RENDER — TIMELINE ═══════════════════════════════════════════════════════
function renderTimeline(equityMap) {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  const members = EQUITY_TEAM.filter(m => m.group !== 'SL');
  const importedNums = new Set(state.weeks.map(w => w.weekNum));
  const maxWeek = 13; // a quarter is 13 weeks

  // Build week labels from imported weeks or just 1-13
  const weekLabels = [];
  for (let i = 1; i <= maxWeek; i++) weekLabels.push(i);

  let html = `<div class="timeline-grid"><div class="timeline-header-row">`;
  html += `<div class="timeline-person-col">Persona</div>`;
  for (const wn of weekLabels) {
    const imported = importedNums.has(wn);
    html += `<div class="timeline-week-num" style="${imported ? 'color:var(--accent);' : ''}">${wn}</div>`;
  }
  html += `</div><div class="timeline-persons">`;

  for (const member of members) {
    const stats = equityMap.get(member.id);
    html += `<div class="timeline-person-row"><div class="timeline-person-name" title="${esc(member.name)}">${esc(member.name.split(' ')[0])}</div>`;

    for (const wn of weekLabels) {
      const week = state.weeks.find(w => w.weekNum === wn);
      if (!week) {
        html += `<div class="timeline-person-chip chip-missing" title="Sem. ${wn} no importada">–</div>`;
        continue;
      }
      const personData = week.persons
        ? week.persons.find(p => findTeamMember(p.name) && findTeamMember(p.name).id === member.id)
        : null;
      if (!personData) {
        html += `<div class="timeline-person-chip chip-off" title="Sin datos">?</div>`;
        continue;
      }
      const wtype = computeWeekType(personData.days || {});
      const chipClass = wtype === 'morning' ? 'chip-morning' : wtype === 'afternoon' ? 'chip-afternoon' : wtype === 'mid' ? 'chip-mid' : wtype === 'off' ? 'chip-off' : 'chip-mixed';
      const chipLabel = wtype === 'morning' ? 'M' : wtype === 'afternoon' ? 'T' : wtype === 'mid' ? 'Mid' : wtype === 'off' ? '–' : '~';
      html += `<div class="timeline-person-chip ${chipClass}" title="${esc(member.name)} — Sem.${wn}: ${wtype}">${chipLabel}</div>`;
    }
    html += `</div>`;
  }

  html += `</div></div>`;
  container.innerHTML = html;
}

// ═══ RENDER — ALERTS ════════════════════════════════════════════════════════
function renderAlerts(alerts) {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span><h3>Sin alertas</h3><p>No se detectaron desequilibrios con los datos actuales.</p></div>`;
    return;
  }

  const icon = { critical: '🔴', important: '🟠', suggestion: '🟡' };
  let html = `<div class="alerts-list">`;
  for (const a of alerts) {
    html += `<div class="alert-item ${a.severity}">${icon[a.severity] || ''} ${esc(a.message)}</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

// ═══ EVENT HANDLERS ══════════════════════════════════════════════════════════
function switchTab(tab) {
  state.activeTab = tab;
  render();
}

function filterByGroup(group) {
  state.filterGroup = group;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.group === group);
  });
  if (state.activeTab === 'dashboard') {
    const equityMap = computeEquity();
    renderDashboard(equityMap, state.weeks.length);
  }
}

function sortTable(col) {
  if (state.tableSortCol === col) {
    state.tableSortDir = state.tableSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.tableSortCol = col;
    state.tableSortDir = 'asc';
  }
  const equityMap = computeEquity();
  renderTable(equityMap, state.weeks.length);
}

// ═══ FILE IMPORT ═════════════════════════════════════════════════════════════
function setupUploadZone() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!state.currentQId) { showToast('Crea un trimestre primero', 'error'); return; }
    handleFileList(e.dataTransfer.files);
  });

  input.addEventListener('change', () => {
    if (!state.currentQId) { showToast('Crea un trimestre primero', 'error'); return; }
    handleFileList(input.files);
    input.value = '';
  });
}

function handleFileList(files) {
  const allowed = ['.xlsx', '.xls', '.csv'];
  for (const file of files) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) { showToast(`Formato no soportado: ${file.name}`, 'error'); continue; }
    const reader = new FileReader();
    reader.onload = e => processFileBuffer(e.target.result, ext, file.name);
    reader.readAsArrayBuffer(file);
  }
}

function processFileBuffer(buffer, ext, fileName) {
  showLoading(true);
  try {
    const persons = parseFile(buffer, ext);
    if (!persons || persons.length === 0) {
      showLoading(false);
      showToast(`No se encontraron personas en ${fileName}`, 'error');
      return;
    }
    // Ask for week number
    const weekNumStr = prompt(`Archivo: ${fileName}\n¿A qué número de semana corresponde? (1-13 para trimestre, o el número ISO de semana)`);
    if (!weekNumStr) { showLoading(false); return; }
    const weekNum = parseInt(weekNumStr, 10);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
      showLoading(false);
      showToast('Número de semana inválido', 'error');
      return;
    }
    addWeek({ weekNum, fileName, importedAt: new Date().toISOString(), persons });
    showLoading(false);
    render();
    showToast(`✅ Semana ${weekNum} importada (${persons.length} personas)`, 'ok');
  } catch (err) {
    showLoading(false);
    showToast('Error al parsear: ' + err.message, 'error');
  }
}

function showLoading(show) {
  const bar = document.getElementById('loading-bar');
  if (bar) bar.style.display = show ? 'block' : 'none';
}

// ═══ EXPORT ══════════════════════════════════════════════════════════════════
function exportCSV() {
  const equityMap = computeEquity();
  const weeksTotal = state.weeks.length;
  const headers = ['Nombre','Rol','Sem.Mañana','Sem.Tarde','%Mañana','Fin.Trabajados','%Fin','Coach','Support','Opens','Closes','Score'];
  const rows = [...equityMap.values()].map(s => {
    const pctMT  = weeksTotal > 0 ? Math.round((s.weeksMorning / weeksTotal) * 100) : 0;
    const wTotal = s.weekendsWorked + s.weekendsOff;
    const pctFin = wTotal > 0 ? Math.round((s.weekendsWorked / wTotal) * 100) : 0;
    return [s.name, s.group, s.weeksMorning, s.weeksAfternoon, pctMT + '%', s.weekendsWorked, pctFin + '%', s.coachDays, s.supportDays, s.opens, s.closes, s.score].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const q = state.quarters.find(q => q.id === state.currentQId);
  downloadText(csv, `equity-${q ? q.label.replace(/\s/g,'_') : 'export'}.csv`, 'text/csv');
  showToast('CSV exportado', 'ok');
}

function exportHTML() {
  const equityMap = computeEquity();
  const weeksTotal = state.weeks.length;
  const q = state.quarters.find(q => q.id === state.currentQId);
  const qLabel = q ? q.label : 'Equity';
  const now = new Date().toLocaleDateString('es-ES');

  let rows = '';
  for (const s of equityMap.values()) {
    const pctMT  = weeksTotal > 0 ? Math.round((s.weeksMorning / weeksTotal) * 100) : 0;
    const wTotal = s.weekendsWorked + s.weekendsOff;
    const pctFin = wTotal > 0 ? Math.round((s.weekendsWorked / wTotal) * 100) : 0;
    const sc = getScoreColor(s.score);
    const scoreColor = sc === 'green' ? '#276749' : sc === 'yellow' ? '#d69e2e' : '#e53e3e';
    rows += `<tr>
      <td style="text-align:left;font-weight:600">${esc(s.name)}</td>
      <td>${s.group}</td>
      <td>${s.weeksMorning}</td>
      <td>${s.weeksAfternoon}</td>
      <td>${pctMT}%</td>
      <td>${s.weekendsWorked}</td>
      <td>${pctFin}%</td>
      <td>${s.coachDays}</td>
      <td>${s.supportDays}</td>
      <td>${s.opens}</td>
      <td>${s.closes}</td>
      <td style="font-weight:800;color:${scoreColor}">${s.score}</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Equity Tracker — ${esc(qLabel)}</title>
  <style>
    body{font-family:-apple-system,sans-serif;margin:0;padding:20px;background:#f0f2f5;color:#2d3748}
    h1{color:#1a1a2e;font-size:1.3rem;margin-bottom:4px}
    .meta{color:#718096;font-size:.82rem;margin-bottom:20px}
    table{border-collapse:collapse;width:100%;font-size:.83rem}
    th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:center}
    thead th{background:#2d3748;color:#fff;font-weight:700}
    tr:nth-child(even) td{background:#f7fafc}
  </style>
  </head><body>
  <h1>⚖️ Equity Tracker — ${esc(qLabel)}</h1>
  <div class="meta">Generado el ${now} · ${weeksTotal} semanas importadas</div>
  <table>
  <thead><tr><th>Nombre</th><th>Rol</th><th>Sem.M</th><th>Sem.T</th><th>%M/T</th><th>Fin↑</th><th>%Fin</th><th>Coach</th><th>Support</th><th>Opens</th><th>Closes</th><th>Score</th></tr></thead>
  <tbody>${rows}</tbody>
  </table>
  </body></html>`;

  downloadText(html, `equity-${qLabel.replace(/\s/g,'_')}.html`, 'text/html');
  showToast('Reporte HTML exportado', 'ok');
}

async function copyForMail() {
  const equityMap = computeEquity();
  const weeksTotal = state.weeks.length;
  const q = state.quarters.find(q => q.id === state.currentQId);
  const qLabel = q ? q.label : 'Equity';
  const now = new Date().toLocaleDateString('es-ES');

  let rows = '';
  for (const s of equityMap.values()) {
    const pctMT  = weeksTotal > 0 ? Math.round((s.weeksMorning / weeksTotal) * 100) : 0;
    const wTotal = s.weekendsWorked + s.weekendsOff;
    const pctFin = wTotal > 0 ? Math.round((s.weekendsWorked / wTotal) * 100) : 0;
    const sc = getScoreColor(s.score);
    const scoreColor = sc === 'green' ? '#276749' : sc === 'yellow' ? '#d69e2e' : '#e53e3e';
    rows += `<tr>
      <td style="text-align:left;font-weight:600;padding:6px 10px">${esc(s.name)}</td>
      <td style="padding:6px 8px">${s.group}</td>
      <td style="padding:6px 8px">${s.weeksMorning}</td>
      <td style="padding:6px 8px">${s.weeksAfternoon}</td>
      <td style="padding:6px 8px">${pctMT}%</td>
      <td style="padding:6px 8px">${s.weekendsWorked}</td>
      <td style="padding:6px 8px">${pctFin}%</td>
      <td style="padding:6px 8px">${s.opens}</td>
      <td style="padding:6px 8px">${s.closes}</td>
      <td style="padding:6px 8px;font-weight:800;color:${scoreColor}">${s.score}</td>
    </tr>`;
  }

  const htmlContent = `<div style="font-family:-apple-system,sans-serif;color:#2d3748">
    <h2 style="color:#1a1a2e;font-size:1.1rem;margin:0 0 4px">⚖️ Equity Tracker — ${esc(qLabel)}</h2>
    <p style="color:#718096;font-size:.8rem;margin:0 0 16px">Generado ${now} · ${weeksTotal} semanas</p>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:.82rem;border-color:#e2e8f0">
    <thead><tr style="background:#2d3748;color:#fff">
      <th style="padding:7px 10px;text-align:left">Nombre</th>
      <th style="padding:7px 8px">Rol</th><th style="padding:7px 8px">M</th><th style="padding:7px 8px">T</th>
      <th style="padding:7px 8px">%M</th><th style="padding:7px 8px">Fin↑</th><th style="padding:7px 8px">%Fin</th>
      <th style="padding:7px 8px">Opens</th><th style="padding:7px 8px">Closes</th><th style="padding:7px 8px">Score</th>
    </tr></thead>
    <tbody>${rows}</tbody></table></div>`;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
      showToast('Informe copiado al portapapeles', 'ok');
    } else {
      await navigator.clipboard.writeText(htmlContent);
      showToast('Copiado (texto) — portapapeles no soporta HTML', 'ok');
    }
  } catch (e) {
    showToast('No se pudo copiar: ' + e.message, 'error');
  }
}

function downloadText(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══ TOAST ═══════════════════════════════════════════════════════════════════
let _toastTimer = null;
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (type === 'ok' ? ' toast-ok' : type === 'error' ? ' toast-error' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ═══ UTILS ═══════════════════════════════════════════════════════════════════
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ═══ INIT ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  loadState();
  setupUploadZone();
  render();
});
