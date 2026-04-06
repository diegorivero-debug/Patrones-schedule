/* ===== AUDITOR.JS — Auditor de Horarios ===== */
/* Depends on SheetJS (xlsx) loaded via CDN      */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS RULES (duplicated from app.js — kept in sync manually)
// ═══════════════════════════════════════════════════════════════════════════
const BUSINESS_RULES = {
  store: {
    openTime: '09:30',
    closeVerano: '21:30',
    closeInvierno: '21:00',
    firstLeadEntry: '07:00',
    lastLeadExit: '22:00',
    firstMgrEntry: '08:00',
    lastMgrExit: '22:00',
  },
  shifts: { totalHours: 9, workHours: 8, lunchHours: 1, lunchSlots: 2 },
  weekday: {
    manager: { floorHours: 4, aorHours: 4, floorActivities: ['Coach','Support'] },
    lead:    { floorHours: 5, ldopsHours: 3, floorActivities: ['LDSup'] },
  },
  coverage: {
    normal:     { support: 4, coach: 2, totalFloor: 6 },
    lunchTrans: { support: 3, coach: 1, totalFloor: 4 },
    minMgrsOnFloor: 2,
    peakHours: [
      { start: '12:00', end: '14:00' },
      { start: '17:00', end: '21:00' },
    ],
  },
  lunch: { windowStart: '11:00', windowEnd: '17:00', durationSlots: 2, maxSimultaneous: 3 },
  dd: { time: '09:15', durationMin: 15 },
  meetings: {
    martes: {
      name: 'Reunión Comercial',
      start: '14:00', end: '16:00',
      exceptions: { mgrSupport: 2, leadFloor: 1 },
    },
    miercoles: {
      name: 'Leadership Meeting',
      start: '14:00', end: '16:00',
      exceptions: { mgrFloor: 1 },
      leadsCoverFloor: 2,
    },
  },
  opening: { minPeople: 2, idealRoles: 'Lead' },
  closing:  { minLeads: 2, minManagers: 1 },
  managerDailyRole: { coachPerWeek: [2,3], supportPerWeek: [2,3] },
};

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════
const SHIFT_TYPES = {
  // Mañana (early variants)
  'Early':    { category: 'early', label: 'Early',    css: 'shift-early',    isWorking: true,  isOff: false },
  'Early S':  { category: 'early', label: 'Early S',  css: 'shift-early',    isWorking: true,  isOff: false },
  'Early C1': { category: 'early', label: 'Early C1', css: 'shift-early',    isWorking: true,  isOff: false },
  'Early C2': { category: 'early', label: 'Early C2', css: 'shift-early',    isWorking: true,  isOff: false },
  // Mediodía
  'Mid':      { category: 'mid',   label: 'Mid',      css: 'shift-mid',      isWorking: true,  isOff: false },
  'Mid S':    { category: 'mid',   label: 'Mid S',    css: 'shift-mid',      isWorking: true,  isOff: false },
  // Tarde
  'Late':     { category: 'late',  label: 'Late',     css: 'shift-late',     isWorking: true,  isOff: false },
  // Cierre
  'Close':    { category: 'close', label: 'Close',    css: 'shift-close',    isWorking: true,  isOff: false },
  'Close C1': { category: 'close', label: 'Close C1', css: 'shift-close',    isWorking: true,  isOff: false },
  'Close C2': { category: 'close', label: 'Close C2', css: 'shift-close',    isWorking: true,  isOff: false },
  // Apertura
  'Open':     { category: 'open',  label: 'Open',     css: 'shift-open',     isWorking: true,  isOff: false },
  // Libre
  'Off':      { category: 'off',   label: 'Off',      css: 'shift-off',      isWorking: false, isOff: true  },
  // Vacaciones
  'Holidays': { category: 'holidays', label: 'Holidays', css: 'shift-holidays', isWorking: false, isOff: true },
  // Special
  'BH':       { category: 'bh',    label: 'BH',       css: 'shift-bh',       isWorking: true,  isOff: false },
  'TG':       { category: 'tg',    label: 'TG',       css: 'shift-tg',       isWorking: true,  isOff: false },
  'Own':      { category: 'own',   label: 'Own',      css: 'shift-own',      isWorking: true,  isOff: false },
};

const DAYS_ES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT HELPERS (top-level, reused by PERSONAL_RULES and audit checks)
// ═══════════════════════════════════════════════════════════════════════════
function shiftCatOf(s)  { const t = SHIFT_TYPES[s]; return t ? t.category : null; }
function isEarlyS(s)    { return ['early','open','bh','tg'].includes(shiftCatOf(s)); }
function isLateS(s)     { return ['late','close'].includes(shiftCatOf(s)); }
function isMidS(s)      { return shiftCatOf(s) === 'mid'; }
function isWorkingS(s)  { const t = SHIFT_TYPES[s]; return t ? t.isWorking : (!!s && s !== 'Off' && s !== 'Holidays'); }
function isOffS(s)      { const t = SHIFT_TYPES[s]; return t ? t.isOff : (!s || s === 'Off' || s === 'Holidays'); }

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL RULES — Concreciones y peticiones aprobadas por cada persona
// ═══════════════════════════════════════════════════════════════════════════
const PERSONAL_RULES = [
  {
    nameMatch: /eva.*hern/i,
    displayName: 'Eva Hernandez',
    description: 'Siempre mañana (inquebrantable)',
    severity: 'critical',
    rule: 'Eva Hernandez: petición aprobada — siempre turno de mañana (Early/Open)',
    days: null,
    check: (shift) => !isWorkingS(shift) || isEarlyS(shift),
  },
  {
    nameMatch: /eli.*mor/i,
    displayName: 'Eli Moreno',
    description: 'Siempre mañana (inquebrantable)',
    severity: 'critical',
    rule: 'Eli Moreno: petición aprobada — siempre turno de mañana (Early/Open)',
    days: null,
    check: (shift) => !isWorkingS(shift) || isEarlyS(shift),
  },
  {
    nameMatch: /cris.*car/i,
    displayName: 'Cris Carcel',
    description: 'Lunes a Viernes de mañana (entre 7:00-17:00, inquebrantable)',
    severity: 'critical',
    rule: 'Cris Carcel: petición aprobada — L-V en turno de mañana (7:00-17:00)',
    days: ['Mon','Tue','Wed','Thu','Fri'],
    check: (shift) => !isWorkingS(shift) || isEarlyS(shift),
  },
  {
    nameMatch: /meri.*alv/i,
    displayName: 'Meri Alvarez',
    description: 'Horarios fijos: Lun 10-cierre (Mid o tarde), Mar 10-19 (Mid/tarde), Mié-Vie 7-16 (mañana)',
    severity: 'important',
    rule: 'Meri Alvarez: petición — Lun/Mar Mid o tarde (entrada 10:00), Mié-Vie Early (entrada 7:00-8:00)',
    days: null,
    check: (shift, dayKey) => {
      if (!isWorkingS(shift)) return true;
      if (dayKey === 'Mon') return isLateS(shift) || isMidS(shift);
      if (dayKey === 'Tue') return isMidS(shift) || isLateS(shift);
      if (dayKey === 'Wed' || dayKey === 'Thu' || dayKey === 'Fri') return isEarlyS(shift);
      return true;
    },
  },
  {
    nameMatch: /clara.*gonz/i,
    displayName: 'Clara González',
    description: 'No puede librar el Jueves (horas sindicales 9-13)',
    severity: 'important',
    rule: 'Clara González: horas sindicales Jueves 9:00-13:00 — no puede tener Off el jueves',
    days: ['Thu'],
    check: (shift) => shift !== 'Off',
  },
  {
    nameMatch: /jorge.*gil/i,
    displayName: 'Jorge Gil',
    description: 'Lunes y Miércoles: turno de mañana (8:00-17:00)',
    severity: 'important',
    rule: 'Jorge Gil: petición — Lunes y Miércoles turno de mañana (8:00-17:00)',
    days: ['Mon','Wed'],
    check: (shift) => !isWorkingS(shift) || isEarlyS(shift),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL RULES FROM STORAGE — reads peticiones_team from localStorage
// Falls back to hardcoded PERSONAL_RULES if no data is found.
// ═══════════════════════════════════════════════════════════════════════════
function buildNameRegex(personName) {
  const parts = (personName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return /(?!)/;
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const first = escape(parts[0]);
  const last  = parts.length > 1 ? escape(parts[parts.length - 1].substring(0, 4)) : '';
  return last ? new RegExp(first + '.*' + last, 'i') : new RegExp(first, 'i');
}

function getPersonalRulesFromStorage() {
  try {
    const raw = localStorage.getItem('peticiones_team');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.rules)) return null;

    const rules = [];
    for (const r of data.rules) {
      if (!r.active) continue;
      const severity = r.priority === 'mandatory'  ? 'critical'
                     : r.priority === 'important'   ? 'important'
                     : 'suggestion';

      let days  = null;
      let check = null;

      switch (r.type) {
        case 'always_morning':
          check = (shift) => !isWorkingS(shift) || isEarlyS(shift);
          break;

        case 'always_morning_weekdays':
          days  = ['Mon','Tue','Wed','Thu','Fri'];
          check = (shift) => !isWorkingS(shift) || isEarlyS(shift);
          break;

        case 'no_day_off': {
          const noDays = (r.params?.days || []);
          days  = noDays.length ? noDays : null;
          check = (shift) => shift !== 'Off';
          break;
        }

        case 'preferred_schedule': {
          const prefDays = (r.params?.days || []);
          days  = prefDays.length ? prefDays : null;
          check = (shift) => !isWorkingS(shift) || isEarlyS(shift);
          break;
        }

        case 'fixed_schedule': {
          const schedule = r.params || {};
          check = (shift, dayKey) => {
            const expected = schedule[dayKey];
            if (!expected || expected === 'flexible' || !isWorkingS(shift)) return true;
            // Parse HH:MM from format like "07:00-16:00" or "7:00-16:00"
            const startPart = (expected.split('-')[0] || '').trim();
            const timeParts = startPart.split(':');
            if (timeParts.length < 2) return true; // malformed — skip check
            const startH = parseInt(timeParts[0], 10) * 100 + parseInt(timeParts[1], 10);
            if (isNaN(startH)) return true;
            if (startH < 1000) return isEarlyS(shift);
            if (startH < 1300) return isMidS(shift) || isLateS(shift);
            return isLateS(shift);
          };
          break;
        }

        case 'week_ab': {
          const startDateStr = r.params?.startDate || '';
          const startWeek    = r.params?.startWeek || 'A';
          if (startDateStr) {
            // Parse date components explicitly to avoid timezone issues
            const [sy, sm, sd] = startDateStr.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            const startIW   = getISOWeekNumber(startDate);
            check = (shift, dayKey, _person, weekDatesCtx) => {
              if (!isWorkingS(shift)) return true;
              // Determine week type from context (weekDates[0] label)
              let currentIW = null;
              if (weekDatesCtx && weekDatesCtx.length > 0) {
                const d = parseDateFromLabel(weekDatesCtx[0].label);
                if (d) currentIW = getISOWeekNumber(d);
              }
              if (!currentIW) return true;
              // Compute week diff using actual date arithmetic to handle 53-week years
              const startMonday = getISOWeekMonday(startIW.year, startIW.week);
              const currentMonday = getISOWeekMonday(currentIW.year, currentIW.week);
              const weekDiff = Math.round((currentMonday - startMonday) / (7 * 86400000));
              const currentWeekType = (weekDiff % 2 === 0) ? startWeek : (startWeek === 'A' ? 'B' : 'A');
              // Week A: Mon-Fri early (07-16), Sat-Sun off
              if (currentWeekType === 'A') {
                if (['Mon','Tue','Wed','Thu','Fri'].includes(dayKey)) return isEarlyS(shift);
              }
              return true;
            };
          }
          break;
        }

        case 'crossed_shifts':
        case 'weekend_alternating':
        case 'fixed_aor':
        case 'custom':
          // These types require multi-person or multi-week context; skip automatic check
          break;
      }

      if (check) {
        rules.push({
          nameMatch:   buildNameRegex(r.personName),
          displayName: r.personName,
          description: r.notes || r.type,
          severity,
          rule: `${r.personName}: ${r.notes || r.type}`,
          days,
          check,
        });
      }
    }

    return rules.length > 0 ? rules : null;
  } catch (e) {
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
const AUDIT_TEAM = [
  { id: 'diego',    names: ['Diego Rivero','Diego'],                         section: 'Store Leader' },
  { id: 'jordi',    names: ['Jordi Pajares','Jordi'],                        section: 'Store Leader' },
  { id: 'jorge',    names: ['Jorge Gil','Jorge'],                            section: 'Senior Manager' },
  { id: 'sheila',   names: ['Sheila Yubero','Sheila'],                       section: 'Senior Manager' },
  { id: 'itziar',   names: ['Itziar Cacho','Itziar'],                        section: 'Senior Manager' },
  { id: 'cris_c',   names: ['Cris Carcel','Cris C'],                         section: 'Senior Manager' },
  { id: 'jesus',    names: ['Jesús Pazos','Jesus Pazos','Jesus'],             section: 'Manager' },
  { id: 'pedro',    names: ['Pedro Borlido','Pedro'],                         section: 'Manager' },
  { id: 'julie',    names: ['Julie Robin','Julie'],                           section: 'Manager' },
  { id: 'javi_s',   names: ['Javi Sánchez','Javi Sanchez','Javi S'],          section: 'Manager' },
  { id: 'meri',     names: ['Meri Alvarez','Meri'],                           section: 'Manager' },
  { id: 'toni',     names: ['Toni Medina','Toni'],                            section: 'Manager' },
  { id: 'deborah',  names: ['Deborah Ibañez','Deborah'],                      section: 'Manager' },
  { id: 'ane',      names: ['Ane Pazos','Ane'],                               section: 'Manager' },
  { id: 'ricardo',  names: ['Ricardo Sosa','Ricardo'],                        section: 'Manager' },
  { id: 'javi_q',   names: ['Javi Quiros','Javi Quirós','Javi Q'],            section: 'Manager' },
  { id: 'cris_u',   names: ['Cris Usón','Cris Uson','Cris U'],                section: 'Manager' },
  { id: 'javi_can', names: ['Javi Canfranc','Javi Can'],                      section: 'Manager' },
  { id: 'david',    names: ['David Carrillo','David'],                         section: 'Manager' },
  { id: 'aurora',   names: ['Aurora Comesaña','Aurora Comesana','Aurora'],    section: 'Lead' },
  { id: 'ruben',    names: ['Rubén Martínez','Ruben Martinez','Rubén','Ruben'], section: 'Lead' },
  { id: 'eva_f',    names: ['Eva Famoso','Eva F'],                             section: 'Lead' },
  { id: 'eva_h',    names: ['Eva Hernandez','Eva H'],                          section: 'Lead' },
  { id: 'alberto',  names: ['Alberto Ortiz','Alberto'],                        section: 'Lead' },
  { id: 'clara',    names: ['Clara González','Clara Gonzalez','Clara'],        section: 'Lead' },
  { id: 'eli',      names: ['Eli Moreno','Eli'],                               section: 'Lead' },
];

function findTeamMember(name) {
  const nl = (name || '').toLowerCase().trim();
  return AUDIT_TEAM.find(m => m.names.some(n => {
    const lo = n.toLowerCase();
    return lo === nl || nl.includes(lo) || lo.includes(nl);
  })) || null;
}

// ISO week number (1-52) from a Date object
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() };
}

// Returns the UTC timestamp of the Monday (start) of a given ISO year+week
function getISOWeekMonday(isoYear, isoWeek) {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const day  = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - day + 1);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return monday.getTime();
}

// Try to parse a real date from a day-label string (e.g. "Lunes 30/03", "Mon 30 mar", "30/3")
function parseDateFromLabel(label) {
  const s = String(label || '');
  const MONTH_MAP = { ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11 };

  // DD/MM[/YYYY] or DD-MM[/YYYY]
  const numMatch = s.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10) - 1;
    const year = numMatch[3] ? parseInt(numMatch[3], 10) : new Date().getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(fullYear, month, day);
    }
  }

  // DD mes (e.g. "30 mar", "1 abr")
  const textMatch = s.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const month = MONTH_MAP[textMatch[2].toLowerCase()];
    if (month !== undefined) return new Date(new Date().getFullYear(), month, day);
  }

  return null;
}

// Build an improved dayLabel that includes full Spanish name + date if available
function buildWeekDayLabel(rawLabel, dayIndex) {
  const raw = String(rawLabel || '').trim();
  const fullNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const dayName = fullNames[dayIndex] || raw;

  const numDateMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (numDateMatch) {
    return `${dayName} ${numDateMatch[1]}/${numDateMatch[2]}`;
  }

  const textDateMatch = raw.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
  if (textDateMatch) {
    return `${dayName} ${textDateMatch[1]} ${textDateMatch[2].toLowerCase()}`;
  }

  // If raw has a day prefix, strip it and keep any trailing date info
  const stripped = raw.replace(/^(?:mon|tue|wed|thu|fri|sat|sun|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\w*\s*/i, '').trim();
  return stripped ? `${dayName} ${stripped}` : dayName;
}

// Threshold: if more than this fraction of managers work a weekend, suggest equity review
const WEEKEND_EQUITY_THRESHOLD = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
let state = {
  fileName: null,
  parsedPersons: [],   // [{name, role, dept, fwa, plan, sch, days:{Mon,Tue,...}}]
  weekDates: [],       // [{label:'Lunes 18 may', key:'Mon'}]
  auditIssues: [],     // [{id, severity, title, meta, rule, fix, day, personName, accepted, rejected}]
  acceptedFixes: new Set(),
  rejectedFixes: new Set(),
  activeTab: 'schedule',
  theme: localStorage.getItem('app_theme') || 'light',
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);

  // Check for data pre-loaded from the Planificador
  const preloadRaw = localStorage.getItem('auditor_preload');
  if (preloadRaw) {
    // Remove immediately so a page reload doesn't re-trigger it
    localStorage.removeItem('auditor_preload');
    try {
      const preload = JSON.parse(preloadRaw);
      if (preload && Array.isArray(preload.persons) && preload.persons.length > 0) {
        loadFromPreload(preload);
        return; // skip normal setup
      }
    } catch(e) {
      // Fall through to normal mode if payload is malformed
    }
  }

  // Normal mode
  setupUploadZone();
  setupTabs();
  renderEmptyState();
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('app_theme', state.theme);
  applyTheme(state.theme);
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANNER PRELOAD — load data passed from planificador-13w via localStorage
// ═══════════════════════════════════════════════════════════════════════════

// Holds metadata about the planner source (set when loadFromPreload is called)
state.plannerMeta = null;

function loadFromPreload(preload) {
  state.parsedPersons = preload.persons.map(p => ({
    name: p.name,
    role: p.role,
    dept: p.dept || '',
    fwa:  p.fwa  || '',
    plan: p.plan || 0,
    sch:  p.sch  || 0,
    days: p.days || {},
  }));
  state.weekDates  = preload.weekDates || [];
  state.fileName   = `${preload.weekLabel} (Planificador)`;
  state.plannerMeta = {
    weekNumber: preload.weekNumber,
    weekLabel:  preload.weekLabel,
    quarter:    preload.quarter,
    timestamp:  preload.timestamp,
  };

  // Hide the upload section and show the planner banner instead
  const uploadSection = document.getElementById('upload-section');
  if (uploadSection) uploadSection.style.display = 'none';

  // Set up tabs (they may not be initialized yet)
  setupTabs();

  runAudit();
  renderSummaryCards();
  renderScheduleTable();
  renderAuditResults();
  showActionBar(true);

  // Show "Volver al Planificador" button in the action bar
  const backBtn = document.getElementById('btn-back-planner');
  if (backBtn) backBtn.style.display = '';

  renderPlannerBanner(preload);

  showToast(`📅 Semana cargada desde el Planificador — ${preload.weekLabel}`, 'ok');
}

function renderPlannerBanner(preload) {
  const banner = document.getElementById('planner-banner');
  if (!banner) return;

  const personCount = (preload.persons || []).length;
  banner.innerHTML = `
    <div class="planner-banner-inner">
      <div class="planner-banner-info">
        <span class="planner-banner-icon">📅</span>
        <div>
          <strong>Datos cargados desde el Planificador de 13 Semanas</strong>
          <div class="planner-banner-sub">
            ${esc(preload.weekLabel)} · ${esc(preload.quarter || '')} · ${personCount} personas
            <span class="planner-banner-origin">Origen: Planificador de 13 Semanas</span>
          </div>
        </div>
      </div>
      <div class="planner-banner-actions">
        <button class="btn-banner-load" onclick="showUploadZone()"
          title="Volver al modo de subida de archivos">📁 Cargar otro archivo</button>
        <button class="btn-banner-reaudit"
          onclick="runAudit(); renderSummaryCards(); renderScheduleTable(); renderAuditResults();"
          title="Volver a ejecutar todas las comprobaciones">🔄 Re-auditar</button>
      </div>
    </div>`;
  banner.style.display = 'block';
}

// Restore the normal upload zone (called from the banner's "Cargar otro archivo" button)
function showUploadZone() {
  // Hide planner banner
  const banner = document.getElementById('planner-banner');
  if (banner) banner.style.display = 'none';

  // Show upload section
  const uploadSection = document.getElementById('upload-section');
  if (uploadSection) uploadSection.style.display = '';

  // Reset state
  state.parsedPersons = [];
  state.weekDates     = [];
  state.auditIssues   = [];
  state.acceptedFixes = new Set();
  state.rejectedFixes = new Set();
  state.fileName      = null;
  state.plannerMeta   = null;

  // Hide file-info bar and action bar; reset content
  document.getElementById('file-info').style.display = 'none';
  document.getElementById('summary-cards').innerHTML  = '';
  document.getElementById('file-input').value         = '';
  const backBtn = document.getElementById('btn-back-planner');
  if (backBtn) backBtn.style.display = 'none';
  showActionBar(false);
  renderEmptyState();
  showToast('Modo de importación de archivos restaurado', '');
}

// Navigate back to the Planificador
function returnToPlanner() {
  window.location.href = 'planificador-13w.html';
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD ZONE
// ═══════════════════════════════════════════════════════════════════════════
function setupUploadZone() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });
}

function handleFile(file) {
  const allowed = ['.xlsx', '.xls', '.csv', '.numbers'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowed.includes(ext)) {
    showToast('Formato no soportado. Usa .xlsx, .csv o .numbers (exportado como xlsx)', 'error');
    return;
  }

  state.fileName = file.name;
  showFileInfo(file);
  showLoading(true);

  const reader = new FileReader();
  reader.onload = e => {
    try {
      parseFile(e.target.result, ext);
    } catch (err) {
      showLoading(false);
      showToast('Error al parsear el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseFile(buffer, ext) {
  if (typeof XLSX === 'undefined') {
    showLoading(false);
    showToast('Error: librería SheetJS no cargada. Comprueba la conexión.', 'error');
    return;
  }

  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  // Find the "Schedule" sheet — look for the one with Name/Role columns
  let scheduleSheet = null;
  let scheduleSheetName = null;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Look for header row with Name/Role or day-column patterns
    for (let r = 0; r < Math.min(5, data.length); r++) {
      const row = data[r].map(v => String(v).trim().toLowerCase());
      if (row.includes('name') || row.includes('nombre') ||
          row.some(c => c === 'role' || c === 'rol')) {
        scheduleSheet = ws;
        scheduleSheetName = name;
        break;
      }
    }
    if (scheduleSheet) break;
  }

  // If not found by header, use first sheet
  if (!scheduleSheet) {
    scheduleSheet = wb.Sheets[wb.SheetNames[0]];
    scheduleSheetName = wb.SheetNames[0];
  }

  const rawData = XLSX.utils.sheet_to_json(scheduleSheet, { header: 1, defval: '' });
  const parsed = parseScheduleSheet(rawData);

  if (!parsed || parsed.persons.length === 0) {
    showLoading(false);
    showToast('No se encontraron personas en el archivo. Verifica el formato.', 'error');
    return;
  }

  state.parsedPersons = parsed.persons;
  state.weekDates = parsed.weekDates;

  runAudit();
  showLoading(false);
  renderSummaryCards();
  renderScheduleTable();
  renderAuditResults();
  showActionBar(true);
  showToast(`✅ ${parsed.persons.length} personas cargadas. ${state.auditIssues.length} incidencias encontradas.`, 'ok');
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════
function parseScheduleSheet(rows) {
  if (!rows || rows.length < 2) return null;

  // Find header row
  let headerRowIdx = -1;
  let headerRow = null;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i].map(v => String(v).trim());
    const lower = r.map(v => v.toLowerCase());
    if (lower.includes('name') || lower.includes('nombre') ||
        lower.some(c => c === 'role' || c === 'rol')) {
      headerRowIdx = i;
      headerRow = r;
      break;
    }
  }

  // Fallback: try to find row with day-like columns (reuse DAY_PATTERNS defined below)
  // Note: DAY_PATTERNS is defined later in the function body; this closure reference is intentional.
  const DAY_RE_FALLBACK = /^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)/i;
  if (headerRowIdx === -1) {
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const r = rows[i].map(v => String(v).trim().toLowerCase());
      const dayMatches = r.filter(c => DAY_RE_FALLBACK.test(c));
      if (dayMatches.length >= 4) {
        headerRowIdx = i;
        headerRow = rows[i].map(v => String(v).trim());
        break;
      }
    }
  }

  if (headerRowIdx === -1) {
    // Use row 0 as header
    headerRowIdx = 0;
    headerRow = rows[0].map(v => String(v).trim());
  }

  // Map column indices — day detection uses a pattern table to avoid repetition
  const DAY_PATTERNS = [
    { key: 'Mon', re: /^(mon|lun|monday|lunes)/i },
    { key: 'Tue', re: /^(tue|mar|tuesday|martes)/i },
    { key: 'Wed', re: /^(wed|mi[eé]|wednesday|mi[eé]rcoles)/i },
    { key: 'Thu', re: /^(thu|jue|thursday|jueves)/i },
    { key: 'Fri', re: /^(fri|vie|friday|viernes)/i },
    { key: 'Sat', re: /^(sat|s[aá]b|saturday|s[aá]bado)/i },
    { key: 'Sun', re: /^(sun|dom|sunday|domingo)/i },
  ];
  const colMap = {};
  const dayColIndices = [];
  const dayLabels = [];

  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c].toLowerCase().trim();
    if (!h) continue;
    if (h === 'name' || h === 'nombre') colMap.name = c;
    else if (h === 'role' || h === 'rol') colMap.role = c;
    else if (h === 'dept' || h === 'dpto' || h === 'departamento') colMap.dept = c;
    else if (h === 'fwa') colMap.fwa = c;
    else if (h === 'plan') colMap.plan = c;
    else if (h === 'sch.' || h === 'sch' || h === 'scheduled' || h === 'prog.') colMap.sch = c;
    else {
      const dayMatch = DAY_PATTERNS.find(d => d.re.test(h));
      if (dayMatch) { dayColIndices.push(c); dayLabels.push({key: dayMatch.key, label: headerRow[c]}); }
    }
  }

  // If no day columns found by name, look for date patterns in header row
  if (dayColIndices.length === 0) {
    // Try to detect columns that look like dates or are in range of 7 consecutive columns
    for (let c = 0; c < headerRow.length; c++) {
      const h = headerRow[c];
      if (/\d{1,2}[\/\-\.]\d{1,2}/.test(h) || /^\d{1,2}\s+\w+/.test(h)) {
        dayColIndices.push(c);
        dayLabels.push({key: 'Day' + dayColIndices.length, label: h});
      }
    }
  }

  // Remap to correct day keys if more than 7 found (take first 7)
  const dayKeys = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekDates = dayLabels.slice(0, 7).map((d, i) => ({
    key: dayKeys[i] || d.key,
    label: buildWeekDayLabel(d.label, i),
  }));
  const usedDayCols = dayColIndices.slice(0, 7);

  const persons = [];
  const skipPatterns = /^(scheduled total|total am|total pm|coverage|%|total|resumen)/i;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(v => String(v).trim() === '')) continue;

    const nameVal = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : String(row[0] || '').trim();
    if (!nameVal || skipPatterns.test(nameVal)) continue;

    // Skip rows that look like totals (numeric name)
    if (/^\d+(\.\d+)?$/.test(nameVal)) continue;
    if (nameVal.length < 2) continue;

    const roleVal = colMap.role !== undefined ? String(row[colMap.role] || '').trim() : '';
    const deptVal = colMap.dept !== undefined ? String(row[colMap.dept] || '').trim() : '';
    const fwaVal  = colMap.fwa  !== undefined ? String(row[colMap.fwa]  || '').trim() : '';
    const planVal = colMap.plan !== undefined ? parseFloat(String(row[colMap.plan]||'0')) || 0 : 0;
    const schVal  = colMap.sch  !== undefined ? parseFloat(String(row[colMap.sch] ||'0')) || 0 : 0;

    const days = {};
    for (let d = 0; d < usedDayCols.length; d++) {
      const key = weekDates[d] ? weekDates[d].key : dayKeys[d];
      const raw = String(row[usedDayCols[d]] || '').trim();
      days[key] = normalizeShift(raw);
    }

    persons.push({ name: nameVal, role: roleVal, dept: deptVal, fwa: fwaVal, plan: planVal, sch: schVal, days });
  }

  return { persons, weekDates };
}

function normalizeShift(raw) {
  if (!raw || raw === '') return '';
  const normalized = raw.trim();
  // Direct match
  if (SHIFT_TYPES[normalized]) return normalized;
  // Case-insensitive match
  const lower = normalized.toLowerCase();
  for (const key of Object.keys(SHIFT_TYPES)) {
    if (key.toLowerCase() === lower) return key;
  }
  // Partial match for variants
  if (/^early/i.test(normalized)) {
    if (/c2/i.test(normalized)) return 'Early C2';
    if (/c1/i.test(normalized)) return 'Early C1';
    if (/s/i.test(normalized) && normalized.length <= 8) return 'Early S';
    return 'Early';
  }
  if (/^mid/i.test(normalized)) {
    if (/s/i.test(normalized)) return 'Mid S';
    return 'Mid';
  }
  if (/^close/i.test(normalized) || /^cierre/i.test(normalized)) {
    if (/c2/i.test(normalized)) return 'Close C2';
    if (/c1/i.test(normalized)) return 'Close C1';
    return 'Close';
  }
  if (/^late/i.test(normalized) || /^tarde/i.test(normalized)) return 'Late';
  if (/^open/i.test(normalized) || /^apertura/i.test(normalized)) return 'Open';
  if (/^off/i.test(normalized) || /^libre/i.test(normalized)) return 'Off';
  if (/^holid/i.test(normalized) || /^vac/i.test(normalized) || /^festiv/i.test(normalized)) return 'Holidays';
  if (/^bh$/i.test(normalized)) return 'BH';
  if (/^tg$/i.test(normalized)) return 'TG';
  if (/^own$/i.test(normalized)) return 'Own';
  // Return as-is if nothing matched
  return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT ENGINE
// ═══════════════════════════════════════════════════════════════════════════

// Build a human-readable closing fix description from shortage counts
function buildClosingFix(dayLabel, leadShortage, mgrShortage) {
  const parts = [];
  if (leadShortage > 0) parts.push(`${leadShortage} Lead(s) más`);
  if (mgrShortage > 0)  parts.push(`${mgrShortage} Manager(s) más`);
  return `Ajustar turno de cierre en ${dayLabel}: asignar ${parts.join(' y ')} al turno de tarde/cierre.`;
}
function runAudit() {
  state.auditIssues = [];
  state.acceptedFixes = new Set();
  state.rejectedFixes = new Set();

  const persons = state.parsedPersons;
  const weekDates = state.weekDates;
  if (!persons || persons.length === 0) return;

  const BR = BUSINESS_RULES;
  let issueId = 0;
  const addIssue = (issue) => { issue.id = 'issue-' + (++issueId); state.auditIssues.push(issue); };

  // ── Helper: classify role ──────────────────────────────────────────────
  const isLead    = p => /lead/i.test(p.role) && !/manager/i.test(p.role) && !/senior/i.test(p.role);
  const isManager = p => /manager/i.test(p.role) || /senior/i.test(p.role);
  const isISE     = p => /ise/i.test(p.role);

  // ── Helper: shift category ─────────────────────────────────────────────
  const shiftCat = s => {
    const t = SHIFT_TYPES[s];
    return t ? t.category : null;
  };
  const isEarlyShift = s => ['early','open','bh','tg'].includes(shiftCat(s));
  const isLateShift  = s => ['late','close'].includes(shiftCat(s));
  const isMidShift   = s => shiftCat(s) === 'mid';
  const isWorking    = s => { const t = SHIFT_TYPES[s]; return t ? t.isWorking : (!!s && s !== 'Off' && s !== 'Holidays'); };
  const isOff        = s => { const t = SHIFT_TYPES[s]; return t ? t.isOff : (!s || s === 'Off' || s === 'Holidays'); };

  for (const wd of weekDates) {
    const dayKey  = wd.key;
    const dayLabel = wd.label || dayKey;

    const workingPersons = persons.filter(p => isWorking(p.days[dayKey]));
    const offPersons     = persons.filter(p => isOff(p.days[dayKey]));

    // 1. Coverage check — minimum workers
    const workingLeads = workingPersons.filter(isLead);
    const workingMgrs  = workingPersons.filter(isManager);
    const totalWorking = workingPersons.length;

    if (totalWorking < BR.coverage.normal.totalFloor) {
      addIssue({
        severity: 'critical',
        title: `Cobertura insuficiente el ${dayLabel}`,
        meta: `Solo ${totalWorking} personas trabajando — mínimo ${BR.coverage.normal.totalFloor}`,
        rule: `Cobertura mínima: ${BR.coverage.normal.totalFloor} personas (${BR.coverage.normal.support} Support + ${BR.coverage.normal.coach} Coach)`,
        fix: `Añadir ${BR.coverage.normal.totalFloor - totalWorking} persona(s) más al turno del ${dayLabel}. Actualmente: ${totalWorking} personas.`,
        day: dayKey,
        personName: null,
      });
    }

    // 2. Minimum managers on floor
    if (workingMgrs.length < BR.coverage.minMgrsOnFloor && workingPersons.length > 0) {
      addIssue({
        severity: 'critical',
        title: `Managers insuficientes el ${dayLabel}`,
        meta: `${workingMgrs.length} manager(s) — mínimo ${BR.coverage.minMgrsOnFloor}`,
        rule: `Mínimo ${BR.coverage.minMgrsOnFloor} Managers en floor en todo momento`,
        fix: `Reorganizar descansos de managers para asegurar ${BR.coverage.minMgrsOnFloor} en floor el ${dayLabel}. Actualmente solo ${workingMgrs.length}.`,
        day: dayKey,
        personName: workingMgrs.length > 0 ? workingMgrs[0].name : null,
      });
    }

    // 3. Opening coverage (only check Mon-Sat)
    if (dayKey !== 'Sun') {
      const earlyWorkers = workingPersons.filter(p => isEarlyShift(p.days[dayKey]));
      if (earlyWorkers.length < BR.opening.minPeople) {
        addIssue({
          severity: 'critical',
          title: `Apertura sin cobertura mínima — ${dayLabel}`,
          meta: `${earlyWorkers.length} personas en turno de mañana — mínimo ${BR.opening.minPeople}`,
          rule: `Apertura: mínimo ${BR.opening.minPeople} personas (idealmente Leads)`,
          fix: `Asignar turno de mañana a ${BR.opening.minPeople - earlyWorkers.length} persona(s) más el ${dayLabel}. ` +
               (earlyWorkers.length > 0 ? `Ya tienen turno de mañana: ${earlyWorkers.map(p=>p.name).join(', ')}.` : 'Ninguno tiene turno de mañana aún.'),
          day: dayKey,
          personName: null,
        });
      }
    }

    // 4. Closing coverage (Mon-Sat)
    if (dayKey !== 'Sun') {
      const lateWorkers = workingPersons.filter(p => isLateShift(p.days[dayKey]));
      const lateLeads   = lateWorkers.filter(isLead);
      const lateMgrs    = lateWorkers.filter(isManager);
      if (lateLeads.length < BR.closing.minLeads || lateMgrs.length < BR.closing.minManagers) {
        const msg = [];
        if (lateLeads.length < BR.closing.minLeads) msg.push(`${lateLeads.length}/${BR.closing.minLeads} Leads`);
        if (lateMgrs.length  < BR.closing.minManagers) msg.push(`${lateMgrs.length}/${BR.closing.minManagers} Managers`);
        addIssue({
          severity: 'important',
          title: `Cierre sin cobertura suficiente — ${dayLabel}`,
          meta: `Cierre: ${msg.join(', ')} — mínimos no alcanzados`,
          rule: `Cierre: mínimo ${BR.closing.minLeads} Leads + ${BR.closing.minManagers} Manager haciendo AOR/LDOPS`,
          fix: buildClosingFix(dayLabel, BR.closing.minLeads - lateLeads.length, BR.closing.minManagers - lateMgrs.length),
          day: dayKey,
          personName: null,
        });
      }
    }

    // 5. Tuesday meeting check
    if (dayKey === 'Tue') {
      const meetingExceptions = BR.meetings.martes.exceptions;
      // At least 1 lead should be on floor (not in meeting)
      const leadsWorking = workingLeads.length;
      if (leadsWorking < meetingExceptions.leadFloor) {
        addIssue({
          severity: 'important',
          title: `Reunión Comercial (Martes) — sin Lead en floor`,
          meta: `${leadsWorking} Leads trabajando — debe quedar al menos ${meetingExceptions.leadFloor} en floor`,
          rule: `Martes: Reunión Comercial 14:00-16:00. ${meetingExceptions.leadFloor} Lead en floor + ${meetingExceptions.mgrSupport} Mgr Support`,
          fix: `Asegurarse de que al menos 1 Lead quede en floor durante la Reunión Comercial del Martes 14:00-16:00.`,
          day: dayKey,
          personName: null,
        });
      }
    }

    // 6. Wednesday meeting check
    if (dayKey === 'Wed') {
      const meetEx = BR.meetings.miercoles.exceptions;
      const mgrsWorking = workingMgrs.length;
      if (mgrsWorking < meetEx.mgrFloor + 1) {
        addIssue({
          severity: 'important',
          title: `Leadership Meeting (Miércoles) — cobertura de managers insuficiente`,
          meta: `Solo ${mgrsWorking} managers disponibles — necesario al menos ${meetEx.mgrFloor} en floor + asistentes`,
          rule: `Miércoles: Leadership Meeting 14:00-16:00. ${meetEx.mgrFloor} Manager en floor, resto en reunión`,
          fix: `Asegurarse de que el ${mgrsWorking > 0 ? mgrsWorking : 'ningún'} manager disponible cubra el floor mientras el resto asiste a la Leadership Meeting.`,
          day: dayKey,
          personName: null,
        });
      }
    }

    // 7. Consecutive off days — 7 in a row would be checked over the week (simplified)
    // (Full consecutive days check requires multi-week data; we do per-person off count here)
    const offCount = offPersons.length;
    if (offCount > Math.ceil(persons.length * 0.6) && dayKey !== 'Sun') {
      addIssue({
        severity: 'suggestion',
        title: `Alto porcentaje de ausencias el ${dayLabel}`,
        meta: `${offCount} de ${persons.length} personas de descanso o vacaciones`,
        rule: `Recomendación: no más del 60% del equipo ausente en días laborables`,
        fix: `Revisar si se puede redistribuir alguna jornada de vacaciones para evitar tener ${offCount} personas ausentes el ${dayLabel}.`,
        day: dayKey,
        personName: null,
      });
    }
  }

  // ── Per-person checks ──────────────────────────────────────────────────
  for (const person of persons) {
    const dayKeys2 = weekDates.map(w => w.key);

    // 8. Hours mismatch
    const workingDaysCount = dayKeys2.filter(dk => isWorking(person.days[dk])).length;
    const expectedDays = person.plan === 40 ? 5 : person.plan === 32 ? 4 : person.plan === 24 ? 3 : null;
    if (expectedDays !== null && workingDaysCount !== expectedDays && person.plan > 0) {
      const dayLabel2 = `(${workingDaysCount} días trabajados vs. ${expectedDays} esperados para ${person.plan}h)`;
      addIssue({
        severity: 'important',
        title: `Discrepancia de horas — ${person.name}`,
        meta: dayLabel2,
        rule: `Plan ${person.plan}h = ${expectedDays} días de trabajo por semana`,
        fix: `${person.name} tiene ${person.plan}h de contrato (${expectedDays} días). Ajustar el horario para que trabaje exactamente ${expectedDays} días esta semana.`,
        day: null,
        personName: person.name,
      });
    }

    // 9. No off days (working all 7 days)
    const totalWorkingDays = dayKeys2.filter(dk => isWorking(person.days[dk])).length;
    if (totalWorkingDays === 7) {
      addIssue({
        severity: 'critical',
        title: `Sin descanso semanal — ${person.name}`,
        meta: `Trabaja los 7 días de la semana`,
        rule: `Todos los empleados deben tener al menos 1-2 días de descanso por semana`,
        fix: `Asignar al menos 1 día libre a ${person.name} esta semana. Revisar si puede intercambiar turno con otro compañero.`,
        day: null,
        personName: person.name,
      });
    }

    // 10. Manager role mixing (Coach + Support same week — for balance check)
    if (isManager(person)) {
      const coachDays   = dayKeys2.filter(dk => {
        const s = person.days[dk];
        return isWorking(s) && isEarlyShift(s);
      }).length;
      const supportDays = dayKeys2.filter(dk => {
        const s = person.days[dk];
        return isWorking(s) && isLateShift(s);
      }).length;
      const midDays     = dayKeys2.filter(dk => {
        const s = person.days[dk];
        return isWorking(s) && isMidShift(s);
      }).length;

      // Check equity — too many days of only one shift type (5+ working days all same type)
      if (totalWorkingDays >= 4) {
        if (coachDays === 0 && (supportDays + midDays) >= 4) {
          addIssue({
            severity: 'suggestion',
            title: `Desequilibrio de turnos — ${person.name}`,
            meta: `Solo turnos de tarde/cierre esta semana (0 mañanas)`,
            rule: `Manager: ~2-3 turnos de mañana + ~2-3 de tarde para equidad en el quarter`,
            fix: `Balancear horario de ${person.name}: asignar al menos 1-2 turnos de mañana para equilibrar la distribución semanal.`,
            day: null,
            personName: person.name,
          });
        } else if (supportDays === 0 && midDays === 0 && coachDays >= 4) {
          addIssue({
            severity: 'suggestion',
            title: `Desequilibrio de turnos — ${person.name}`,
            meta: `Solo turnos de mañana esta semana (0 tardes/cierres)`,
            rule: `Manager: ~2-3 turnos de mañana + ~2-3 de tarde para equidad en el quarter`,
            fix: `Balancear horario de ${person.name}: asignar al menos 1-2 turnos de tarde para equilibrar la distribución semanal.`,
            day: null,
            personName: person.name,
          });
        }
      }
    }

    // 11. Scheduled hours vs plan
    if (person.sch > 0 && person.plan > 0 && Math.abs(person.sch - person.plan) > 4) {
      addIssue({
        severity: 'important',
        title: `Horas programadas vs plan — ${person.name}`,
        meta: `Plan: ${person.plan}h / Programado: ${person.sch}h (diferencia: ${Math.abs(person.sch - person.plan)}h)`,
        rule: `Las horas programadas no deben diferir del plan más de 4h sin justificación`,
        fix: `Revisar el horario de ${person.name}: tiene ${person.sch}h programadas pero su contrato es de ${person.plan}h. ` +
             (person.sch > person.plan ? `Reducir ${person.sch - person.plan}h.` : `Añadir ${person.plan - person.sch}h.`),
        day: null,
        personName: person.name,
      });
    }
  }

  // ── Balance check across week ──────────────────────────────────────────
  // Check if every day has at least 1 early + 1 late person
  for (const wd of weekDates) {
    const dk = wd.key;
    if (dk === 'Sun') continue;
    const working = persons.filter(p => isWorking(p.days[dk]));
    const hasEarly = working.some(p => isEarlyShift(p.days[dk]));
    const hasLate  = working.some(p => isLateShift(p.days[dk]));
    if (working.length > 0 && !hasEarly) {
      addIssue({
        severity: 'important',
        title: `Sin turno de mañana el ${wd.label || dk}`,
        meta: `Nadie asignado a turno de mañana/apertura ese día`,
        rule: `Debe haber al menos 1 persona en turno de mañana cada día laborable`,
        fix: `Asignar al menos 1 persona a turno Early/Open el ${wd.label || dk}.`,
        day: dk,
        personName: null,
      });
    }
    if (working.length > 0 && !hasLate) {
      addIssue({
        severity: 'important',
        title: `Sin turno de tarde/cierre el ${wd.label || dk}`,
        meta: `Nadie asignado a turno de tarde o cierre ese día`,
        rule: `Debe haber al menos 1 persona en turno de tarde/cierre cada día laborable`,
        fix: `Asignar al menos 1 persona a turno Late/Close el ${wd.label || dk}.`,
        day: dk,
        personName: null,
      });
    }
  }

  // ── Check 12: Personal Rules (concreciones/peticiones aprobadas) ────────
  // Read from localStorage (peticiones_team); fall back to hardcoded PERSONAL_RULES.
  const personalRules = getPersonalRulesFromStorage() || PERSONAL_RULES;

  for (const person of persons) {
    // A person may match more than one rule (e.g. two rules for the same person)
    const matchingRules = personalRules.filter(r => r.nameMatch.test(person.name));
    for (const rule of matchingRules) {
      for (const wd of weekDates) {
        const dk = wd.key;
        if (rule.days && !rule.days.includes(dk)) continue;
        const shift = person.days[dk] || '';
        if (shift === '' || shift === 'Holidays') continue; // no data / holidays → skip
        // week_ab rule check receives weekDates as fourth argument
        const passes = rule.check.length >= 4
          ? rule.check(shift, dk, person, weekDates)
          : rule.check(shift, dk);
        if (!passes) {
          addIssue({
            severity: rule.severity,
            title: `Petición incumplida — ${rule.displayName} el ${wd.label}`,
            meta: `Petición: ${rule.description}. Asignado: "${shift}"`,
            rule: rule.rule,
            fix: `Revisar el turno de ${rule.displayName} el ${wd.label}. Debería respetar: ${rule.description}.`,
            day: dk,
            personName: person.name,
          });
        }
      }
    }
  }

  // ── Check 13: Vacaciones — cruce con localStorage ──────────────────────
  // localStorage key: `vacaciones_${year}` → JSON { data: { personId: { weekNum: absenceType } }, periods: [...] }
  // absenceType: '' = working, or one of VACATION_TYPES = approved absence
  {
    // Determine year and ISO week from weekDates labels (use first working day)
    let schedYear = new Date().getFullYear();
    let schedWeek = null;
    for (const wd of weekDates) {
      const d = parseDateFromLabel(wd.label);
      if (d) {
        const iw = getISOWeekNumber(d);
        schedYear = iw.year;
        schedWeek = iw.week;
        break;
      }
    }

    const raw = localStorage.getItem(`vacaciones_${schedYear}`);
    if (raw) {
      let vacData;
      try { vacData = JSON.parse(raw).data || {}; } catch(e) { vacData = null; }

      if (vacData) {
        const VACATION_TYPES = ['V','V25','F','TGD','Parental','Paternidad','Lactancia','UNPAID'];

        for (const person of persons) {
          const member = findTeamMember(person.name);
          if (!member) continue;
          const personVac = vacData[member.id] || {};

          // Per-day check — all 7 days of the same week share the same absence type
          for (const wd of weekDates) {
            const shift = person.days[wd.key] || '';
            const absType = schedWeek !== null ? (personVac[schedWeek] || '') : '';

            if (VACATION_TYPES.includes(absType) && shift !== 'Holidays') {
              addIssue({
                severity: 'critical',
                title: `Vacaciones no reflejadas — ${person.name} el ${wd.label}`,
                meta: `Tiene "${absType}" aprobado pero horario muestra "${shift || 'sin asignar'}"`,
                rule: `Si una persona tiene ausencia aprobada (${absType}), debe aparecer como "Holidays" en el horario`,
                fix: `Cambiar el turno de ${person.name} el ${wd.label} a "Holidays". Ausencia aprobada: ${absType}.`,
                day: wd.key,
                personName: person.name,
              });
            }

            if (shift === 'Holidays' && !VACATION_TYPES.includes(absType)) {
              addIssue({
                severity: 'important',
                title: `Holidays sin aprobación — ${person.name} el ${wd.label}`,
                meta: `Aparece como "Holidays" pero no hay ausencia aprobada en el sistema`,
                rule: `Un "Holidays" en el horario debe tener respaldo de ausencia aprobada en vacaciones`,
                fix: `Verificar si ${person.name} tiene una ausencia aprobada para esta semana. Si no, ajustar el horario.`,
                day: wd.key,
                personName: person.name,
              });
            }
          }
        }
      }
    }
  }

  // ── Check 14: Senior Managers Lunes+Martes de mañana ───────────────────
  const isSM = p => /senior/i.test(p.role);
  const seniorMgrs = persons.filter(isSM);
  for (const sm of seniorMgrs) {
    for (const wd of weekDates) {
      if (wd.key !== 'Mon' && wd.key !== 'Tue') continue;
      const shift = sm.days[wd.key] || '';
      if (isOffS(shift) || shift === 'Holidays') continue;
      if (isWorkingS(shift) && !isEarlyS(shift)) {
        addIssue({
          severity: 'critical',
          title: `SM turno tarde L/M — ${sm.name} el ${wd.label}`,
          meta: `Senior Manager con turno "${shift}" — L y M deben ser mañana sin excepción`,
          rule: `Los 4 Senior Managers van de mañana Lunes y Martes (sin excepción)`,
          fix: `Cambiar el turno de ${sm.name} el ${wd.label} a turno de mañana (Early/Open).`,
          day: wd.key,
          personName: sm.name,
        });
      }
    }
  }

  // ── Check 15: SM rotación Mié-Sáb (2 mañana + 2 tarde) ────────────────
  for (const wd of weekDates) {
    if (!['Wed','Thu','Fri','Sat'].includes(wd.key)) continue;
    const workingSMs = seniorMgrs.filter(sm => isWorkingS(sm.days[wd.key]));
    if (workingSMs.length < 2) continue; // not enough data
    const smEarly = workingSMs.filter(sm => isEarlyS(sm.days[wd.key]));
    const smLate  = workingSMs.filter(sm => isLateS(sm.days[wd.key]));
    if (workingSMs.length >= 4) {
      if (smEarly.length !== 2 || smLate.length !== 2) {
        addIssue({
          severity: 'important',
          title: `SM rotación desequilibrada el ${wd.label}`,
          meta: `${smEarly.length} SM mañana + ${smLate.length} SM tarde (se esperan 2+2)`,
          rule: `Mié-Sáb: 2 Senior Managers de mañana + 2 de tarde`,
          fix: `Rebalancear turnos SM el ${wd.label}: ${smEarly.map(s=>s.name).join(',')||'ninguno'} mañana / ${smLate.map(s=>s.name).join(',')||'ninguno'} tarde.`,
          day: wd.key,
          personName: null,
        });
      }
    }
  }

  // ── Check 16: Manager — semana completa en el mismo turno ──────────────
  const isRegMgr = p => /manager/i.test(p.role) && !/senior/i.test(p.role) && !/store/i.test(p.role);
  for (const person of persons.filter(isRegMgr)) {
    const dks = weekDates.map(w => w.key);
    const workDks = dks.filter(dk => isWorkingS(person.days[dk]));
    if (workDks.length < 3) continue;
    const hasEarlyDay = workDks.some(dk => isEarlyS(person.days[dk]));
    const hasLateDay  = workDks.some(dk => isLateS(person.days[dk]));
    if (hasEarlyDay && hasLateDay) {
      addIssue({
        severity: 'important',
        title: `Manager mezcla turnos — ${person.name}`,
        meta: `Tiene turnos de mañana y tarde en la misma semana`,
        rule: `Un Manager debe estar toda la semana en mañana O toda en tarde (no mezclar)`,
        fix: `Unificar los turnos de ${person.name}: decidir si esta semana es toda mañana o toda tarde.`,
        day: null,
        personName: person.name,
      });
    }
  }

  // ── Check 17: Ops Leads cruzados (Aurora ↔ Rubén) ──────────────────────
  {
    const auroraTeam = AUDIT_TEAM.find(m => m.id === 'aurora');
    const rubenTeam  = AUDIT_TEAM.find(m => m.id === 'ruben');
    const aurora = auroraTeam ? persons.find(p => auroraTeam.names.some(n => p.name.toLowerCase().includes(n.toLowerCase()))) : null;
    const ruben  = rubenTeam  ? persons.find(p => rubenTeam.names.some(n => p.name.toLowerCase().includes(n.toLowerCase()))) : null;

  for (const wd of weekDates) {
    const dk = wd.key;
    if (!aurora || !ruben) continue;
    const aShift = aurora.days[dk] || '';
    const rShift = ruben.days[dk] || '';
    if (!isWorkingS(aShift) && !isWorkingS(rShift)) continue;

    // If Aurora is on vacation, Rubén must be early
    if (!isWorkingS(aShift) && aShift === 'Holidays') {
      if (isWorkingS(rShift) && !isEarlyS(rShift)) {
        addIssue({
          severity: 'important',
          title: `Rubén debe ir mañana (Aurora de vacaciones) — ${wd.label}`,
          meta: `Aurora de Holidays → Rubén debe cubrir de mañana`,
          rule: `Ops Leads cruzados: si Aurora está de vacaciones, Rubén debe ir de mañana`,
          fix: `Cambiar turno de Rubén a mañana el ${wd.label} (Aurora en Holidays).`,
          day: dk,
          personName: ruben.name,
        });
      }
      continue;
    }

    if (isWorkingS(aShift) && isWorkingS(rShift)) {
      const aEarly = isEarlyS(aShift);
      const rEarly = isEarlyS(rShift);
      if (aEarly === rEarly) {
        addIssue({
          severity: 'critical',
          title: `Ops Leads en el mismo turno — ${wd.label}`,
          meta: `Aurora (${aShift}) y Rubén (${rShift}) en ${aEarly ? 'mañana' : 'tarde'} — deben cruzarse`,
          rule: `Aurora y Rubén siempre deben estar cruzados: uno mañana, otro tarde`,
          fix: `Cambiar uno de los dos al turno contrario el ${wd.label}.`,
          day: dk,
          personName: null,
        });
      }
    }
  }
  } // end check 17

  // ── Check 18: SM no librar Lunes-Martes-Miércoles ─────────────────────
  for (const sm of seniorMgrs) {
    for (const wd of weekDates) {
      if (!['Mon','Tue','Wed'].includes(wd.key)) continue;
      const shift = sm.days[wd.key] || '';
      if (shift === 'Off') {
        addIssue({
          severity: 'important',
          title: `SM libra ${wd.label} — ${sm.name}`,
          meta: `Senior Manager con Off el ${wd.label}`,
          rule: `Senior Managers no deberían librar Lunes, Martes ni Miércoles`,
          fix: `Mover el día libre de ${sm.name} a Jueves, Viernes o fin de semana.`,
          day: wd.key,
          personName: sm.name,
        });
      }
    }
  }

  // ── Check 19: Managers no librar Martes-Miércoles ──────────────────────
  for (const person of persons.filter(isRegMgr)) {
    for (const wd of weekDates) {
      if (!['Tue','Wed'].includes(wd.key)) continue;
      const shift = person.days[wd.key] || '';
      if (shift === 'Off') {
        addIssue({
          severity: 'important',
          title: `Manager libra ${wd.label} — ${person.name}`,
          meta: `Manager con Off el ${wd.label} (solo pueden librar Lunes)`,
          rule: `Managers no deberían librar Martes ni Miércoles (pueden librar Lunes)`,
          fix: `Mover el día libre de ${person.name} a Lunes o fin de semana.`,
          day: wd.key,
          personName: person.name,
        });
      }
    }
  }

  // ── Check 20: Máximo 5 días de trabajo por semana (SAGRADO) ────────────
  for (const person of persons) {
    const dks = weekDates.map(w => w.key);
    const workCount = dks.filter(dk => isWorkingS(person.days[dk])).length;
    if (workCount >= 6) {
      addIssue({
        severity: 'critical',
        title: `Trabaja 6+ días — ${person.name}`,
        meta: `${workCount} días de trabajo esta semana (máximo permitido: 5)`,
        rule: `SAGRADO: nadie puede trabajar más de 5 días por semana`,
        fix: `Asignar al menos ${workCount - 5} día(s) libre(s) a ${person.name} esta semana.`,
        day: null,
        personName: person.name,
      });
    }
  }

  // ── Check 21: Mix departamental (no 3+ managers del mismo dept en mismo turno) ──
  const deptGroups = {};
  for (const person of persons.filter(p => isRegMgr(p) || isSM(p))) {
    const dept = (person.dept || 'General').trim();
    if (!deptGroups[dept]) deptGroups[dept] = [];
    deptGroups[dept].push(person);
  }
  for (const wd of weekDates) {
    const dk = wd.key;
    for (const [dept, members] of Object.entries(deptGroups)) {
      if (members.length < 3) continue;
      const workMbrs = members.filter(p => isWorkingS(p.days[dk]));
      if (workMbrs.length < 3) continue;
      const earlyCount = workMbrs.filter(p => isEarlyS(p.days[dk])).length;
      const lateCount  = workMbrs.filter(p => isLateS(p.days[dk])).length;
      if (earlyCount >= 3 || lateCount >= 3) {
        addIssue({
          severity: 'suggestion',
          title: `Mix departamental — ${dept} el ${wd.label}`,
          meta: `${earlyCount >= 3 ? earlyCount + ' managers de mañana' : lateCount + ' managers de tarde'} del mismo departamento`,
          rule: `Recomendado: no tener 3+ managers del mismo departamento todos en el mismo turno`,
          fix: `Valorar mover 1 manager de ${dept} al turno contrario el ${wd.label} para mejorar cobertura cruzada.`,
          day: dk,
          personName: null,
        });
      }
    }
  }

  // ── Check 22: Cobertura cierre mejorada (mín. 2 Leads + 1 Manager en Close) ──
  for (const wd of weekDates) {
    const dk = wd.key;
    if (dk === 'Sun') continue;
    const closeWorkers = persons.filter(p => isLateS(p.days[dk]));
    const closeLeads   = closeWorkers.filter(isLead);
    const closeMgrs    = closeWorkers.filter(p => isManager(p));
    const needLeads  = BUSINESS_RULES.closing.minLeads;
    const needMgrs   = BUSINESS_RULES.closing.minManagers;
    if (closeLeads.length < needLeads || closeMgrs.length < needMgrs) {
      const parts = [];
      if (closeLeads.length < needLeads) parts.push(`${closeLeads.length}/${needLeads} Leads`);
      if (closeMgrs.length  < needMgrs)  parts.push(`${closeMgrs.length}/${needMgrs} Managers`);
      addIssue({
        severity: 'critical',
        title: `Cobertura cierre insuficiente — ${wd.label}`,
        meta: `Cierre: ${parts.join(', ')} en turno de tarde/cierre`,
        rule: `Mínimo ${needLeads} Leads + ${needMgrs} Manager en turno de cierre todos los días`,
        fix: `Asignar ${parts.join(' y ')} adicional(es) al turno de tarde/cierre el ${wd.label}.`,
        day: dk,
        personName: null,
      });
    }
  }

  // ── Check 23: Martes reunión comercial — 2 Mgr Support + 1 Lead en floor ──
  const tuesdayWd = weekDates.find(w => w.key === 'Tue');
  if (tuesdayWd) {
    const tuLeads = persons.filter(p => isLead(p) && isWorkingS(p.days['Tue']));
    const tuMgrs  = persons.filter(p => isRegMgr(p) && isWorkingS(p.days['Tue']));
    if (tuLeads.length < BUSINESS_RULES.meetings.martes.exceptions.leadFloor) {
      addIssue({
        severity: 'important',
        title: `Reunión Comercial — Lead insuficiente en floor (${tuesdayWd.label})`,
        meta: `${tuLeads.length} Leads trabajando — necesario al menos ${BUSINESS_RULES.meetings.martes.exceptions.leadFloor} en floor durante reunión 14:00-16:00`,
        rule: `Martes Reunión Comercial 14:00-16:00: ${BUSINESS_RULES.meetings.martes.exceptions.leadFloor} Lead en floor + ${BUSINESS_RULES.meetings.martes.exceptions.mgrSupport} Mgr Support`,
        fix: `Garantizar que al menos ${BUSINESS_RULES.meetings.martes.exceptions.leadFloor} Lead quede en floor el ${tuesdayWd.label} durante la Reunión Comercial (14:00-16:00).`,
        day: 'Tue',
        personName: null,
      });
    }
    if (tuMgrs.length < BUSINESS_RULES.meetings.martes.exceptions.mgrSupport) {
      addIssue({
        severity: 'important',
        title: `Reunión Comercial — Managers Support insuficientes (${tuesdayWd.label})`,
        meta: `${tuMgrs.length} Managers disponibles — se necesitan ${BUSINESS_RULES.meetings.martes.exceptions.mgrSupport} Mgr Support en floor`,
        rule: `Martes Reunión Comercial 14:00-16:00: ${BUSINESS_RULES.meetings.martes.exceptions.mgrSupport} Mgr Support deben quedarse en floor`,
        fix: `Asegurarse de que ${BUSINESS_RULES.meetings.martes.exceptions.mgrSupport} Managers de Support queden en floor el ${tuesdayWd.label} 14:00-16:00.`,
        day: 'Tue',
        personName: null,
      });
    }
  }

  // ── Check 24: Finde sí/finde no — equidad fines de semana ─────────────
  for (const person of persons.filter(p => isManager(p))) {
    const satShift = person.days['Sat'] || '';
    const sunShift = person.days['Sun'] || '';
    const workedWeekend = isWorkingS(satShift) || isWorkingS(sunShift);
    // Gather count as suggestion only when 4+ managers working the weekend
    if (workedWeekend) {
      const weekendWorkers = persons.filter(p => isManager(p) && (isWorkingS(p.days['Sat']) || isWorkingS(p.days['Sun'])));
      const weekendOff     = persons.filter(p => isManager(p) && !isWorkingS(p.days['Sat']) && !isWorkingS(p.days['Sun']));
      if (weekendWorkers.length > 0 && weekendOff.length > 0 &&
          weekendWorkers.length / (weekendWorkers.length + weekendOff.length) > WEEKEND_EQUITY_THRESHOLD) {
        addIssue({
          severity: 'suggestion',
          title: `Alta proporción de managers trabajando fin de semana`,
          meta: `${weekendWorkers.length} de ${weekendWorkers.length + weekendOff.length} managers trabajan el fin de semana`,
          rule: `Equidad finde sí/finde no: los managers deben alternar fines de semana trabajados`,
          fix: `Revisar equidad de fines de semana: valorar librar a algunos managers este sábado/domingo para balancear el quarter.`,
          day: 'Sat',
          personName: null,
        });
        break; // add once
      }
    }
  }

  // Sort by severity
  const sevOrder = { critical: 0, important: 1, suggestion: 2 };
  state.auditIssues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
function calculateScore() {
  if (state.auditIssues.length === 0) return 100;
  const criticals   = state.auditIssues.filter(i => i.severity === 'critical').length;
  const importants  = state.auditIssues.filter(i => i.severity === 'important').length;
  const suggestions = state.auditIssues.filter(i => i.severity === 'suggestion').length;

  const activeIssues = state.auditIssues.filter(i => !state.rejectedFixes.has(i.id));
  const activeCrit  = activeIssues.filter(i => i.severity === 'critical').length;
  const activeImp   = activeIssues.filter(i => i.severity === 'important').length;
  const activeSug   = activeIssues.filter(i => i.severity === 'suggestion').length;

  // Scoring formula: start at 100, deduct points per active issue.
  // Weights: critical=15 (coverage violations are severe), important=5, suggestion=2.
  let score = 100 - (activeCrit * 15) - (activeImp * 5) - (activeSug * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function renderSummaryCards() {
  const score       = calculateScore();
  const criticals   = state.auditIssues.filter(i => i.severity === 'critical').length;
  const importants  = state.auditIssues.filter(i => i.severity === 'important').length;
  const suggestions = state.auditIssues.filter(i => i.severity === 'suggestion').length;
  const persons     = state.parsedPersons.length;

  const scoreClass = score >= 80 ? '' : score >= 60 ? ' score-mid' : ' score-low';
  const barClass   = score >= 80 ? '' : score >= 60 ? ' mid' : ' low';

  document.getElementById('summary-cards').innerHTML = `
    <div class="summary-card card-score${scoreClass}">
      <div class="card-label">Puntuación</div>
      <div class="card-value">${score}%</div>
      <div class="score-bar-wrap"><div class="score-bar${barClass}" style="width:${score}%"></div></div>
      <div class="card-sub">${score >= 80 ? 'Buen horario' : score >= 60 ? 'Mejorable' : 'Requiere revisión'}</div>
    </div>
    <div class="summary-card card-critical">
      <div class="card-label">🔴 Críticos</div>
      <div class="card-value">${criticals}</div>
      <div class="card-sub">Violaciones graves</div>
    </div>
    <div class="summary-card card-important">
      <div class="card-label">🟠 Importantes</div>
      <div class="card-value">${importants}</div>
      <div class="card-sub">Requieren atención</div>
    </div>
    <div class="summary-card card-suggestion">
      <div class="card-label">🟡 Sugerencias</div>
      <div class="card-value">${suggestions}</div>
      <div class="card-sub">Mejoras opcionales</div>
    </div>
    <div class="summary-card card-persons">
      <div class="card-label">👤 Personas</div>
      <div class="card-value">${persons}</div>
      <div class="card-sub">Importadas del archivo</div>
    </div>
  `;
}

function renderScheduleTable() {
  const container = document.getElementById('schedule-table-container');
  const persons = state.parsedPersons;
  const weekDates = state.weekDates;

  if (!persons.length) {
    container.innerHTML = '<div class="state-empty"><span class="state-icon">📋</span><p>Sin datos para mostrar</p></div>';
    return;
  }

  // Build issue map: {dayKey+personName -> [issueIds]}
  const issueMap = {};
  for (const issue of state.auditIssues) {
    if (issue.day && issue.personName) {
      const key = issue.day + '|' + issue.personName;
      if (!issueMap[key]) issueMap[key] = [];
      issueMap[key].push(issue);
    } else if (issue.day) {
      const key = issue.day + '|ALL';
      if (!issueMap[key]) issueMap[key] = [];
      issueMap[key].push(issue);
    }
  }

  let html = '<div class="schedule-table-wrap"><table class="schedule-table"><thead><tr>';
  html += '<th class="col-name">Nombre</th><th class="col-role">Rol</th><th class="col-dept">Depto.</th><th class="col-plan">Plan</th>';
  for (const wd of weekDates) {
    html += `<th class="col-day">${esc(wd.label)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const person of persons) {
    const rowClass = getPersonRowClass(person);
    html += `<tr class="${rowClass}">`;
    html += `<td class="col-name" title="${esc(person.name)}">${esc(person.name)}</td>`;
    html += `<td class="col-role">${esc(person.role)}</td>`;
    html += `<td class="col-dept">${esc(person.dept)}</td>`;
    html += `<td class="col-plan">${person.plan || ''}</td>`;

    for (const wd of weekDates) {
      const shift = person.days[wd.key] || '';
      const shiftInfo = SHIFT_TYPES[shift];
      const cssClass = shiftInfo ? shiftInfo.css : (shift ? 'shift-empty' : 'shift-empty');

      // Check for issues on this cell
      const cellIssues = (issueMap[wd.key + '|' + person.name] || [])
        .concat(issueMap[wd.key + '|ALL'] || []);
      const hasIssue = cellIssues.length > 0;
      const issueClass = hasIssue
        ? (cellIssues.some(i => i.severity === 'critical') ? 'cell-issue-critical'
          : cellIssues.some(i => i.severity === 'important') ? 'cell-issue-important'
          : 'cell-issue-suggestion')
        : '';

      const issueIds = cellIssues.map(i => i.id).join(',');
      html += `<td class="${issueClass}" data-day="${esc(wd.key)}" data-person="${esc(person.name)}" data-issues="${issueIds}">`;
      if (shift) {
        html += `<span class="shift-cell ${cssClass}">${esc(shift)}</span>`;
      }
      html += '</td>';
    }
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;

  // Click cells to highlight related issues
  container.querySelectorAll('td[data-issues]').forEach(td => {
    td.addEventListener('click', () => {
      const ids = td.getAttribute('data-issues').split(',').filter(Boolean);
      if (ids.length) highlightIssues(ids);
    });
  });
}

function getPersonRowClass(person) {
  const role = (person.role || '').toLowerCase();
  if (/store leader/i.test(role)) return 'row-sl';
  if (/senior manager/i.test(role)) return 'row-senior';
  if (/manager/i.test(role)) return 'row-manager';
  if (/lead/i.test(role)) return 'row-lead';
  if (/ise/i.test(role)) return 'row-ise';
  return '';
}

function renderAuditResults() {
  const container = document.getElementById('audit-results-container');
  const issues = state.auditIssues;

  if (!issues.length) {
    container.innerHTML = `
      <div class="audit-panel">
        <div class="state-empty">
          <span class="state-icon">✅</span>
          <h3>¡Sin incidencias!</h3>
          <p>El horario cumple todas las reglas de negocio revisadas.</p>
        </div>
      </div>`;
    return;
  }

  const groups = { critical: [], important: [], suggestion: [] };
  for (const issue of issues) { groups[issue.severity].push(issue); }

  let html = '<div class="audit-panel">';

  const sections = [
    { key: 'critical',   icon: '🔴', label: 'Críticos',   badgeClass: 'badge-critical' },
    { key: 'important',  icon: '🟠', label: 'Importantes', badgeClass: 'badge-important' },
    { key: 'suggestion', icon: '🟡', label: 'Sugerencias', badgeClass: 'badge-suggestion' },
  ];

  for (const sec of sections) {
    const groupIssues = groups[sec.key];
    if (!groupIssues.length) continue;
    html += `
      <div class="audit-section">
        <div class="audit-section-title">
          ${sec.icon} ${sec.label}
          <span class="badge-count ${sec.badgeClass}">${groupIssues.length}</span>
        </div>`;

    for (const issue of groupIssues) {
      const isAccepted = state.acceptedFixes.has(issue.id);
      const isRejected = state.rejectedFixes.has(issue.id);
      const extraClass = isAccepted ? ' accepted' : isRejected ? ' rejected' : '';
      const statusTag = isAccepted
        ? '<span class="issue-status-tag status-accepted">✅ Aceptado</span>'
        : isRejected
          ? '<span class="issue-status-tag status-rejected">❌ Rechazado</span>'
          : '';

      html += `
        <div class="issue-card severity-${issue.severity}${extraClass}" id="${issue.id}">
          <div class="issue-header">
            <span class="issue-severity-icon">${sec.icon}</span>
            <span class="issue-title">${esc(issue.title)}</span>
            ${statusTag}
          </div>
          <div class="issue-meta">${esc(issue.meta)}</div>
          <div class="issue-rule">📋 Regla: ${esc(issue.rule)}</div>
          <div class="issue-fix">💡 <strong>Propuesta:</strong> ${esc(issue.fix)}</div>
          <div class="issue-actions">
            ${!isAccepted && !isRejected ? `
              <button class="btn-accept"    onclick="acceptFix('${issue.id}')">✅ Aceptar</button>
              <button class="btn-reject"    onclick="rejectFix('${issue.id}')">❌ Rechazar</button>
            ` : `
              <button class="btn-secondary" onclick="undoFix('${issue.id}')">↩️ Deshacer</button>
            `}
            ${issue.day ? `<button class="btn-highlight" onclick="highlightDay('${esc(issue.day)}','${issue.id}')">🔍 Ver en tabla</button>` : ''}
            ${issue.personName ? `<button class="btn-highlight" onclick="highlightPerson('${esc(issue.personName)}','${issue.id}')">👤 Ver persona</button>` : ''}
          </div>
        </div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX ACTIONS
// ═══════════════════════════════════════════════════════════════════════════
function acceptFix(id) {
  state.acceptedFixes.add(id);
  state.rejectedFixes.delete(id);
  renderSummaryCards();
  renderAuditResults();
  showToast('Fix aceptado ✅', 'ok');
}

function rejectFix(id) {
  state.rejectedFixes.add(id);
  state.acceptedFixes.delete(id);
  renderSummaryCards();
  renderAuditResults();
  showToast('Fix rechazado', '');
}

function undoFix(id) {
  state.acceptedFixes.delete(id);
  state.rejectedFixes.delete(id);
  renderSummaryCards();
  renderAuditResults();
}

function applyAllSafeFixes() {
  const safeSeverities = ['suggestion', 'important'];
  let count = 0;
  for (const issue of state.auditIssues) {
    if (safeSeverities.includes(issue.severity) && !state.rejectedFixes.has(issue.id)) {
      state.acceptedFixes.add(issue.id);
      count++;
    }
  }
  renderSummaryCards();
  renderAuditResults();
  showToast(`${count} fixes seguros aplicados ✅`, 'ok');
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGHLIGHTING
// ═══════════════════════════════════════════════════════════════════════════
function highlightIssues(ids) {
  // Remove previous highlights
  document.querySelectorAll('.cell-highlighted').forEach(el => el.classList.remove('cell-highlighted'));
  // Scroll to and highlight issue card
  for (const id of ids) {
    const card = document.getElementById(id);
    if (card) {
      card.classList.add('cell-highlighted');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  setTimeout(() => {
    document.querySelectorAll('.cell-highlighted').forEach(el => el.classList.remove('cell-highlighted'));
  }, 2500);
}

function highlightDay(dayKey, issueId) {
  showTab('schedule');
  setTimeout(() => {
    const cells = document.querySelectorAll(`td[data-day="${dayKey}"]`);
    cells.forEach(c => c.classList.add('cell-highlighted'));
    if (cells.length) cells[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => cells.forEach(c => c.classList.remove('cell-highlighted')), 2500);
  }, 100);

  const card = document.getElementById(issueId);
  if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 500);
}

function highlightPerson(personName, issueId) {
  showTab('schedule');
  setTimeout(() => {
    const rows = document.querySelectorAll(`td[data-person="${personName}"]`);
    rows.forEach(c => c.classList.add('cell-highlighted'));
    if (rows.length) rows[0].closest('tr').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => rows.forEach(c => c.classList.remove('cell-highlighted')), 2500);
  }, 100);

  const card = document.getElementById(issueId);
  if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll('.content-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
}

function showTab(tabId) {
  document.querySelectorAll('.content-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.content-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-' + tabId);
  });
  state.activeTab = tabId;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
function exportCSV() {
  if (!state.parsedPersons.length) { showToast('Sin datos para exportar', 'error'); return; }

  const weekDates = state.weekDates;
  const header = ['Nombre','Rol','Depto','Plan','Sch'].concat(weekDates.map(w => w.label));
  const rows = state.parsedPersons.map(p => {
    return [p.name, p.role, p.dept, p.plan, p.sch].concat(weekDates.map(w => p.days[w.key] || ''));
  });

  const csv = [header, ...rows].map(row =>
    row.map(v => (String(v).includes(',') || String(v).includes('"'))
      ? '"' + String(v).replace(/"/g,'""') + '"'
      : String(v)
    ).join(',')
  ).join('\n');

  downloadText(csv, 'horario-auditado.csv', 'text/csv;charset=utf-8;');
  showToast('CSV exportado ✅', 'ok');
}

function generateHTMLReport() {
  const score = calculateScore();
  const criticals   = state.auditIssues.filter(i => i.severity === 'critical').length;
  const importants  = state.auditIssues.filter(i => i.severity === 'important').length;
  const suggestions = state.auditIssues.filter(i => i.severity === 'suggestion').length;
  const dateStr     = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Per-person issue summary
  const personMap = {};
  for (const issue of state.auditIssues) {
    if (issue.personName) {
      if (!personMap[issue.personName]) personMap[issue.personName] = [];
      personMap[issue.personName].push(issue);
    }
  }

  const sevColor = { critical: '#dc2626', important: '#d97706', suggestion: '#ca8a04' };
  const sevBg    = { critical: '#fef2f2', important: '#fffbeb', suggestion: '#fefce8' };
  const sevIcon  = { critical: '🔴', important: '🟠', suggestion: '🟡' };
  const sevLabel = { critical: 'CRÍTICO', important: 'IMPORTANTE', suggestion: 'SUGERENCIA' };

  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';

  let issueRows = '';
  for (const issue of state.auditIssues) {
    const status = state.acceptedFixes.has(issue.id) ? ' ✅' : state.rejectedFixes.has(issue.id) ? ' ❌' : '';
    issueRows += `
      <tr style="border-bottom:1px solid #e5e7eb;background:${sevBg[issue.severity]}">
        <td style="padding:8px 12px;white-space:nowrap;font-size:12px">
          <span style="color:${sevColor[issue.severity]};font-weight:700">${sevIcon[issue.severity]} ${sevLabel[issue.severity]}</span>
        </td>
        <td style="padding:8px 12px;font-weight:600;font-size:13px">${esc(issue.title)}${status}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280">${esc(issue.meta)}</td>
        <td style="padding:8px 12px;font-size:12px">${esc(issue.fix)}</td>
      </tr>`;
  }

  let personRows = '';
  for (const [name, issues] of Object.entries(personMap)) {
    const crits = issues.filter(i => i.severity === 'critical').length;
    const impts = issues.filter(i => i.severity === 'important').length;
    const suggs = issues.filter(i => i.severity === 'suggestion').length;
    personRows += `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:6px 12px;font-weight:600;font-size:13px">${esc(name)}</td>
        <td style="padding:6px 12px;text-align:center">${crits > 0 ? `<span style="color:#dc2626;font-weight:700">🔴 ${crits}</span>` : ''}</td>
        <td style="padding:6px 12px;text-align:center">${impts > 0 ? `<span style="color:#d97706;font-weight:700">🟠 ${impts}</span>` : ''}</td>
        <td style="padding:6px 12px;text-align:center">${suggs > 0 ? `<span style="color:#ca8a04">🟡 ${suggs}</span>` : ''}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; padding: 8px 12px; text-align: left; }
</style>
</head><body>
<div style="max-width:800px;margin:0 auto;padding:24px">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;border-radius:12px;padding:24px 28px;margin-bottom:24px">
    <h1 style="margin:0 0 4px;font-size:22px">🔍 Informe de Auditoría de Horarios</h1>
    <p style="margin:0;opacity:.85;font-size:14px">Archivo: ${esc(state.fileName || '—')} · ${dateStr}</p>
  </div>

  <!-- Score + Summary -->
  <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:140px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em">Puntuación</div>
      <div style="font-size:36px;font-weight:800;color:${scoreColor}">${score}%</div>
      <div style="font-size:12px;color:#6b7280">${score >= 80 ? 'Buen horario' : score >= 60 ? 'Mejorable' : 'Requiere revisión'}</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:11px;text-transform:uppercase;color:#dc2626;letter-spacing:.05em">🔴 Críticos</div>
      <div style="font-size:36px;font-weight:800;color:#dc2626">${criticals}</div>
      <div style="font-size:12px;color:#9ca3af">Violaciones graves</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:11px;text-transform:uppercase;color:#d97706;letter-spacing:.05em">🟠 Importantes</div>
      <div style="font-size:36px;font-weight:800;color:#d97706">${importants}</div>
      <div style="font-size:12px;color:#9ca3af">Requieren atención</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:11px;text-transform:uppercase;color:#ca8a04;letter-spacing:.05em">🟡 Sugerencias</div>
      <div style="font-size:36px;font-weight:800;color:#ca8a04">${suggestions}</div>
      <div style="font-size:12px;color:#9ca3af">Mejoras opcionales</div>
    </div>
  </div>

  <!-- Issues table -->
  <h2 style="font-size:16px;margin-bottom:12px;color:#1f2937">📋 Detalle de Incidencias</h2>
  ${issueRows ? `<table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <thead><tr>
      <th>Severidad</th><th>Incidencia</th><th>Detalle</th><th>Propuesta</th>
    </tr></thead>
    <tbody>${issueRows}</tbody>
  </table>` : '<p style="color:#16a34a;margin-bottom:24px">✅ Sin incidencias detectadas.</p>'}

  <!-- Per-person summary -->
  ${personRows ? `<h2 style="font-size:16px;margin-bottom:12px;color:#1f2937">👤 Resumen por Persona</h2>
  <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <thead><tr>
      <th>Persona</th><th style="text-align:center">🔴 Críticos</th><th style="text-align:center">🟠 Importantes</th><th style="text-align:center">🟡 Sugerencias</th>
    </tr></thead>
    <tbody>${personRows}</tbody>
  </table>` : ''}

  <!-- Recommended actions -->
  ${criticals > 0 ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px;margin-bottom:16px">
    <strong style="color:#dc2626">⚡ Acciones prioritarias:</strong>
    <ul style="margin:8px 0 0;padding-left:20px;font-size:13px">
      ${state.auditIssues.filter(i=>i.severity==='critical').map(i=>`<li>${esc(i.title)}: ${esc(i.fix)}</li>`).join('')}
    </ul>
  </div>` : ''}

  <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
    Generado por Auditor de Horarios · Patrones-Schedule · ${new Date().toLocaleString('es-ES')}
  </div>
</div>
</body></html>`;
}

function exportReport() {
  if (!state.auditIssues.length && !state.parsedPersons.length) {
    showToast('Sin datos para exportar', 'error');
    return;
  }

  const score = calculateScore();
  const lines = [
    '===== INFORME DE AUDITORÍA DE HORARIOS =====',
    `Archivo: ${state.fileName || 'desconocido'}`,
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
    `Personas analizadas: ${state.parsedPersons.length}`,
    `Puntuación: ${score}%`,
    '',
    `Críticos: ${state.auditIssues.filter(i=>i.severity==='critical').length}`,
    `Importantes: ${state.auditIssues.filter(i=>i.severity==='important').length}`,
    `Sugerencias: ${state.auditIssues.filter(i=>i.severity==='suggestion').length}`,
    '',
    '===== INCIDENCIAS =====',
  ];

  for (const issue of state.auditIssues) {
    const status = state.acceptedFixes.has(issue.id) ? '[ACEPTADO]'
                 : state.rejectedFixes.has(issue.id) ? '[RECHAZADO]' : '';
    lines.push('');
    lines.push(`[${issue.severity.toUpperCase()}] ${issue.title} ${status}`);
    lines.push(`  Detalle: ${issue.meta}`);
    lines.push(`  Regla: ${issue.rule}`);
    lines.push(`  Propuesta: ${issue.fix}`);
  }

  downloadText(lines.join('\n'), 'informe-auditoria.txt', 'text/plain;charset=utf-8;');
  showToast('Informe TXT exportado ✅', 'ok');
}

function exportReportHTML() {
  if (!state.auditIssues.length && !state.parsedPersons.length) {
    showToast('Sin datos para exportar', 'error');
    return;
  }
  const html = generateHTMLReport();
  downloadText(html, 'informe-auditoria.html', 'text/html;charset=utf-8;');
  showToast('Informe HTML exportado ✅', 'ok');
}

async function copyReportForMail() {
  if (!state.parsedPersons.length && !state.auditIssues.length) {
    showToast('Sin datos para copiar', 'error');
    return;
  }
  const html = generateHTMLReport();
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blob = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
      showToast('Informe HTML copiado al portapapeles ✅ — pega directamente en Gmail/Outlook', 'ok');
    } else {
      // Fallback: copy as plain text
      const score = calculateScore();
      const lines = [
        `INFORME AUDITORÍA — ${state.fileName || ''}`,
        `Puntuación: ${score}%`,
        `Críticos: ${state.auditIssues.filter(i=>i.severity==='critical').length}`,
        `Importantes: ${state.auditIssues.filter(i=>i.severity==='important').length}`,
        `Sugerencias: ${state.auditIssues.filter(i=>i.severity==='suggestion').length}`,
        '',
        ...state.auditIssues.map(i => `[${i.severity.toUpperCase()}] ${i.title}\n  ${i.meta}\n  → ${i.fix}`),
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('Informe copiado (texto) — portapapeles no soporta HTML en este navegador', 'ok');
    }
  } catch(e) {
    showToast('No se pudo copiar al portapapeles: ' + e.message, 'error');
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

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function showFileInfo(file) {
  document.getElementById('upload-section').style.display = 'none';
  const info = document.getElementById('file-info');
  info.style.display = 'flex';
  document.getElementById('file-name-display').textContent = file.name;
  document.getElementById('file-meta-display').textContent =
    `${(file.size / 1024).toFixed(1)} KB · ${new Date().toLocaleDateString('es-ES')}`;
}

function clearFile() {
  state.fileName = null;
  state.parsedPersons = [];
  state.weekDates = [];
  state.auditIssues = [];
  state.acceptedFixes = new Set();
  state.rejectedFixes = new Set();
  state.plannerMeta = null;

  // Hide planner banner if visible
  const banner = document.getElementById('planner-banner');
  if (banner) banner.style.display = 'none';
  // Hide "Volver al Planificador" button
  const backBtn = document.getElementById('btn-back-planner');
  if (backBtn) backBtn.style.display = 'none';

  document.getElementById('upload-section').style.display = '';
  document.getElementById('file-info').style.display = 'none';
  document.getElementById('summary-cards').innerHTML = '';
  document.getElementById('file-input').value = '';
  showActionBar(false);
  renderEmptyState();
  showToast('Archivo eliminado', '');
}

function showLoading(show) {
  document.getElementById('loading-bar').style.display = show ? 'block' : 'none';
}

function showActionBar(show) {
  document.getElementById('action-bar').style.display = show ? 'flex' : 'none';
}

function renderEmptyState() {
  document.getElementById('schedule-table-container').innerHTML = `
    <div class="state-empty">
      <span class="state-icon">📁</span>
      <h3>Ningún archivo cargado</h3>
      <p>Sube un archivo .xlsx o .csv con el horario semanal para comenzar la auditoría.</p>
    </div>`;
  document.getElementById('audit-results-container').innerHTML = `
    <div class="audit-panel">
      <div class="state-empty">
        <span class="state-icon">🔍</span>
        <h3>Sin auditoría aún</h3>
        <p>Sube un archivo de horario para analizar automáticamente las incidencias y proponer mejoras.</p>
      </div>
    </div>`;
}

let toastTimer = null;
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (type === 'ok' ? ' toast-ok' : type === 'error' ? ' toast-error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
