/* ===== VACACIONES.JS — Calendario de Vacaciones ===== */
'use strict';

// ── Constants ────────────────────────────────────────
const ABSENCE_TYPES = ['', 'V', 'V25', 'F', 'TGD', 'Parental', 'Paternidad', 'Lactancia', 'UNPAID'];
const ABSENCE_LABELS = {
  '':          'Trabajando',
  'V':         'Vacaciones',
  'V25':       'Vac. año anterior',
  'F':         'Festivo personal',
  'TGD':       'Training Group Day',
  'Parental':  'Parental',
  'Paternidad':'Paternidad',
  'Lactancia': 'Lactancia',
  'UNPAID':    'Sin sueldo',
};
// Default period bands keyed by year
const DEFAULT_PERIODS = [
  { label: 'PEAK',          weeks: [],  color: '#ffd700', textColor: '#5c4200' },
  { label: 'Semana Santa',  weeks: [],  color: '#b0b0b0', textColor: '#333' },
  { label: 'APR',           weeks: [],  color: '#90cdf4', textColor: '#1a3a5c' },
  { label: 'NPI',           weeks: [],  color: '#90cdf4', textColor: '#1a3a5c' },
];

// Team roster — read from TEAM_REGISTRY if available, fallback to static list
const TEAM = (window.TEAM_REGISTRY && window.TEAM_REGISTRY.getSections)
  ? window.TEAM_REGISTRY.getSections()
  : [
    { section: 'Store Leaders' },
    { id: 'diego',    name: 'Diego Rivero' },
    { id: 'jordi',    name: 'Jordi Pajares' },
    { section: 'Senior Managers' },
    { id: 'jorge',    name: 'Jorge Gil' },
    { id: 'sheila',   name: 'Sheila Yubero' },
    { id: 'itziar',   name: 'Itziar Cacho' },
    { id: 'cris_c',   name: 'Cristina Carcel' },
    { section: 'Managers' },
    { id: 'jesus',    name: 'Jesús Pazos' },
    { id: 'pedro',    name: 'Pedro Borlido' },
    { id: 'julie',    name: 'Julie Robin' },
    { id: 'javi_s',   name: 'Javi Sanchez' },
    { id: 'meri',     name: 'Meri Alvarez' },
    { id: 'toni',     name: 'Toni Medina' },
    { id: 'deborah',  name: 'Deborah Ibañez' },
    { id: 'ane',      name: 'Ana Maria Pazos' },
    { id: 'ricardo',  name: 'Ricardo Sosa' },
    { id: 'javi_q',   name: 'Javier Quiros' },
    { id: 'cris_u',   name: 'Cristina Uson' },
    { id: 'javi_can', name: 'Javi Canfranc' },
    { id: 'david',    name: 'David Carrillo' },
    { section: 'Leads' },
    { id: 'aurora',   name: 'Aurora Comesaña' },
    { id: 'ruben',    name: 'Rubén Martínez' },
    { id: 'eva_f',    name: 'Eva Famoso' },
    { id: 'eva_h',    name: 'Eva Hernandez' },
    { id: 'alberto',  name: 'Alberto Ortiz' },
    { id: 'clara',    name: 'Clara González' },
    { id: 'eli',      name: 'Eli Moreno' },
  ];

// ── Default vacation data 2026 ───────────────────────
// Loaded automatically the first time vacaciones_2026 is accessed.
const DEFAULT_VACACIONES_2026 = {
  periods: [
    { label: 'PEAK',                      weeks: [2,3,4,5],                   color: '#ffd700', textColor: '#5c4200' },
    { label: 'Pre-Semana Santa',           weeks: [12,13],                     color: '#b0b0b0', textColor: '#333' },
    { label: 'Post Semana Santa',          weeks: [14,15],                     color: '#c8b0d0', textColor: '#3a1a4a' },
    { label: 'Puente de Mayo',             weeks: [18],                        color: '#d4f0c0', textColor: '#1a4a20' },
    { label: 'Segunda Pascua - 25 de Mayo',weeks: [21,22],                     color: '#ffd0a0', textColor: '#4a2a00' },
    { label: '24 DE JUNIO',                weeks: [26],                        color: '#d0f0ff', textColor: '#003a5c' },
    { label: 'APR',                        weeks: [27,28,29,30,31,32,33,34,35],color: '#90cdf4', textColor: '#1a3a5c' },
    { label: 'PREPARACION NPI',            weeks: [36,37],                     color: '#e0d0f0', textColor: '#2a1a4a' },
    { label: 'NPI',                        weeks: [38,39,40],                  color: '#90cdf4', textColor: '#1a3a5c' },
    { label: 'PEAK',                       weeks: [50,51,52,53],               color: '#ffd700', textColor: '#5c4200' },
  ],
  data: {
    sheila:   { 6:'F', 14:'V', 28:'TGD', 29:'V', 30:'V', 31:'V', 47:'V' },
    cris_c:   { 8:'F', 14:'V', 28:'TGD', 31:'V', 32:'V', 33:'V', 44:'V' },
    itziar:   { 16:'TGD', 29:'V', 30:'V', 31:'V', 37:'V', 44:'V' },
    jorge:    { 12:'TGD', 14:'V', 28:'V', 30:'V', 31:'V', 34:'V' },
    ane:      { 4:'V25', 5:'V25', 6:'V25', 16:'TGD', 22:'V', 23:'V', 30:'V25', 31:'V', 32:'V', 42:'V', 43:'V25' },
    cris_u:   { 10:'TGD', 11:'V', 28:'V', 30:'V', 38:'V', 39:'V', 52:'V' },
    david:    { 11:'V', 12:'V', 21:'F', 22:'V', 30:'V', 31:'V', 45:'V' },
    deborah:  { 12:'TGD', 13:'V', 17:'F', 30:'V', 31:'V', 45:'V', 46:'V' },
    javi_can: { 2:'Parental', 3:'Parental', 4:'Parental', 5:'Parental', 6:'Lactancia', 7:'Lactancia',
                19:'F', 20:'TGD', 21:'V', 22:'V', 23:'V', 24:'V', 25:'V',
                26:'Paternidad', 27:'Paternidad', 28:'Paternidad', 29:'Paternidad', 30:'Paternidad',
                31:'Paternidad', 32:'Paternidad', 33:'Paternidad', 34:'Paternidad', 35:'Paternidad',
                36:'Paternidad', 37:'Paternidad', 38:'Paternidad' },
    javi_s:   { 4:'F', 14:'V', 20:'TGD', 30:'V', 31:'V', 32:'V', 42:'V' },
    javi_q:   { 10:'TGD', 11:'F', 28:'V', 31:'V', 32:'V', 33:'V', 52:'V' },
    jesus:    { 13:'V', 20:'TGD', 28:'V', 31:'V', 32:'V', 45:'V' },
    meri:     { 14:'TGD', 28:'V', 32:'V', 33:'V', 34:'V', 44:'V' },
    pedro:    { 6:'F', 12:'TGD', 14:'V', 28:'V', 31:'V', 32:'V', 44:'V' },
    ricardo:  { 17:'F', 22:'V', 24:'V', 25:'TGD', 32:'V', 33:'V', 45:'V' },
    julie:    { 31:'V', 32:'V', 41:'V', 48:'V' },
    toni:     { 4:'F', 11:'V', 12:'V', 20:'TGD', 28:'V', 33:'V', 42:'V' },
    aurora:   { 11:'V', 23:'TGD', 28:'V', 33:'V', 34:'V', 38:'V', 52:'V' },
    ruben:    { 12:'V', 23:'F', 24:'TGD', 25:'V', 32:'V', 33:'V', 45:'V' },
    eva_f:    { 10:'V', 16:'V', 23:'TGD', 24:'F', 25:'V', 41:'V', 48:'V' },
    alberto:  { 15:'F', 25:'TGD', 26:'V', 27:'V', 32:'V', 37:'V', 45:'V' },
    eva_h:    { 18:'UNPAID', 25:'TGD', 27:'V', 29:'V', 33:'V', 34:'V', 44:'V' },
    clara:    { 11:'F', 12:'TGD', 17:'V', 22:'V', 28:'V', 39:'V', 40:'V' },
    eli:      { 9:'TGD', 15:'V', 17:'F', 28:'V', 32:'V', 33:'V', 52:'V' },
  },
};

// ── State ────────────────────────────────────────────
let currentYear = new Date().getFullYear();
let data = {};   // { personId: { week: { type: absenceType, status: 'approved'|'pending'|'confirmed' } } }
let periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
let alertsDismissed = new Set();

// Status cycle order
const STATUS_CYCLE = ['approved', 'pending', 'confirmed'];
const STATUS_LABELS = { approved: 'Aprobada', pending: 'Pendiente', confirmed: 'Confirmada' };

// ── Helpers ──────────────────────────────────────────
function getPersonName(id) {
  const p = TEAM.find(m => !m.section && m.id === id);
  return p ? p.name : id;
}

// Extract type from a cell value (handles old string format and new object format)
function getCellType(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.type || '';
}

// Extract status from a cell value
function getCellStatus(value) {
  if (!value || typeof value === 'string') return 'approved';
  return value.status || 'approved';
}

// ── LocalStorage helpers ─────────────────────────────
function lsKey(year) { return `vacaciones_${year}`; }

function saveData() {
  const payload = { data, periods };
  try {
    localStorage.setItem(lsKey(currentYear), JSON.stringify(payload));
  } catch(e) {
    showToast('⚠️ Error al guardar: ' + e.message);
  }
}

function loadData(year) {
  const raw = localStorage.getItem(lsKey(year));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      data = parsed.data || {};
      periods = parsed.periods || JSON.parse(JSON.stringify(DEFAULT_PERIODS));
      // Migrate old string format to new object format for backward compatibility
      Object.keys(data).forEach(personId => {
        Object.keys(data[personId]).forEach(week => {
          const v = data[personId][week];
          if (typeof v === 'string') {
            data[personId][week] = { type: v, status: 'approved' };
          }
        });
      });
    } catch(e) {
      data = {};
      periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
    }
  } else if (year === 2026 && DEFAULT_VACACIONES_2026) {
    // Load built-in 2026 defaults the first time (no user data yet)
    periods = JSON.parse(JSON.stringify(DEFAULT_VACACIONES_2026.periods));
    data = {};
    const src = DEFAULT_VACACIONES_2026.data;
    Object.keys(src).forEach(personId => {
      data[personId] = {};
      Object.keys(src[personId]).forEach(week => {
        const v = src[personId][week];
        data[personId][week] = { type: v, status: 'approved' };
      });
    });
  } else {
    data = {};
    periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
  }
}

// ── Week calculation ─────────────────────────────────
// Returns the number of ISO weeks in a given year (52 or 53).
// A year has 53 ISO weeks when Jan 1 is Thursday, or equivalently when Dec 31
// is Thursday (which only differs from Jan 1 in leap years, where Dec 31 is
// one weekday ahead of Jan 1).  Both conditions are tested below so no
// special leap-year branch is needed.
function isoWeeksInYear(year) {
  function dayOfWeek(y, m, d) { return new Date(y, m - 1, d).getDay(); }
  const jan1  = dayOfWeek(year, 1, 1);
  const dec31 = dayOfWeek(year, 12, 31);
  return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

// Returns array of { week: number, monday: Date } for all ISO weeks of the given year
function getWeeks(year) {
  // Find first Monday of the year (ISO week 1 starts on Monday)
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in W1
  const day = jan4.getDay() || 7;    // Make Sunday = 7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (day - 1));

  const totalWeeks = isoWeeksInYear(year);
  const weeks = [];
  for (let i = 0; i < totalWeeks; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i * 7);
    weeks.push({ week: i + 1, monday: d });
  }
  return weeks;
}

function formatDate(d) {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ── Render ───────────────────────────────────────────
function render() {
  renderAlerts();
  renderTable();
}

function renderAlerts() {
  const container = document.getElementById('alerts-container');
  const alerts = generateAlerts();
  container.innerHTML = '';
  alerts.forEach((a) => {
    if (alertsDismissed.has(a.key)) return;
    const div = document.createElement('div');
    div.className = `alert alert-${a.level}`;
    const span = document.createElement('span');
    span.textContent = `${a.icon} ${a.msg}`;
    const btn = document.createElement('button');
    btn.className = 'dismiss';
    btn.title = 'Cerrar';
    btn.textContent = '✕';
    btn.addEventListener('click', () => dismissAlert(a.key));
    div.appendChild(span);
    div.appendChild(btn);
    container.appendChild(div);
  });
}

function dismissAlert(key) {
  alertsDismissed.add(key);
  renderAlerts();
}

function generateAlerts() {
  const alerts = [];
  const weeks = getWeeks(currentYear);
  // Warn if >5 absent same week
  weeks.forEach(({ week }) => {
    let count = 0;
    TEAM.forEach(p => {
      if (p.section) return;
      const entry = (data[p.id] || {})[week];
      const type = getCellType(entry);
      if (type && type !== '') count++;
    });
    if (count > 5) {
      alerts.push({
        key: `overload_w${week}`,
        level: 'red',
        icon: '🚨',
        msg: `Semana ${week}: ${count} personas ausentes (máx recomendado: 5)`,
      });
    }
  });

  // Warn if absence during PEAK period
  const peakPeriod = periods.find(p => p.label === 'PEAK');
  if (peakPeriod && peakPeriod.weeks.length > 0) {
    TEAM.forEach(p => {
      if (p.section) return;
      const personData = data[p.id] || {};
      peakPeriod.weeks.forEach(w => {
        const entry = personData[w];
        const type = getCellType(entry);
        if (type && type !== '') {
          alerts.push({
            key: `peak_${p.id}_w${w}`,
            level: 'orange',
            icon: '⚠️',
            msg: `${p.name}: ausencia (${type}) durante semana PEAK (sem. ${w})`,
          });
        }
      });
    });
  }

  return alerts;
}

function renderTable() {
  const weeks = getWeeks(currentYear);
  const container = document.getElementById('vac-table-container');
  const people = TEAM.filter(p => !p.section);

  const tbl = document.createElement('table');
  tbl.className = 'vac-table';
  tbl.id = 'vac-table';

  // ── THEAD ────────────────────────────────────────
  const thead = document.createElement('thead');

  // Row 1: period bands
  const periodsRow = document.createElement('tr');
  periodsRow.className = 'periods-row';
  const thPeriodName = document.createElement('th');
  thPeriodName.className = 'col-name';
  thPeriodName.textContent = 'Período';
  periodsRow.appendChild(thPeriodName);

  // Build a map weekIndex -> period
  const weekPeriodMap = {};
  periods.forEach(per => {
    per.weeks.forEach(w => { weekPeriodMap[w] = per; });
  });

  // Merge consecutive same-period weeks into colspan cells
  let wi = 0;
  while (wi < weeks.length) {
    const w = weeks[wi].week;
    const per = weekPeriodMap[w];
    if (per) {
      // find run length
      let run = 1;
      while (
        wi + run < weeks.length &&
        weekPeriodMap[weeks[wi + run].week] === per
      ) run++;
      const th = document.createElement('th');
      th.colSpan = run;
      th.style.background = per.color;
      th.style.color = per.textColor;
      const span = document.createElement('span');
      span.className = 'period-label';
      span.style.background = per.color;
      span.style.color = per.textColor;
      span.textContent = per.label;
      span.title = 'Clic para editar período';
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'button');
      span.onclick = () => openPeriodModal(per);
      span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPeriodModal(per); }
      });
      th.appendChild(span);
      periodsRow.appendChild(th);
      wi += run;
    } else {
      const th = document.createElement('th');
      th.style.background = 'var(--surface)';
      periodsRow.appendChild(th);
      wi++;
    }
  }
  // total col header
  const thPeriodTotal = document.createElement('th');
  thPeriodTotal.className = 'col-total';
  periodsRow.appendChild(thPeriodTotal);
  thead.appendChild(periodsRow);

  // Row 2: week numbers
  const weeksRow = document.createElement('tr');
  weeksRow.className = 'weeks-row';
  const thWName = document.createElement('th');
  thWName.className = 'col-name';
  thWName.textContent = `Año ${currentYear}`;
  weeksRow.appendChild(thWName);
  weeks.forEach(({ week }) => {
    const th = document.createElement('th');
    th.textContent = `S${week}`;
    weeksRow.appendChild(th);
  });
  const thWTotal = document.createElement('th');
  thWTotal.className = 'col-total';
  thWTotal.textContent = 'Total';
  weeksRow.appendChild(thWTotal);
  thead.appendChild(weeksRow);

  // Row 3: dates
  const datesRow = document.createElement('tr');
  datesRow.className = 'dates-row';
  const thDName = document.createElement('th');
  thDName.className = 'col-name';
  thDName.textContent = 'Lunes';
  datesRow.appendChild(thDName);
  weeks.forEach(({ monday }) => {
    const th = document.createElement('th');
    th.textContent = formatDate(monday);
    datesRow.appendChild(th);
  });
  const thDTotal = document.createElement('th');
  thDTotal.className = 'col-total';
  datesRow.appendChild(thDTotal);
  thead.appendChild(datesRow);

  tbl.appendChild(thead);

  // ── TBODY ────────────────────────────────────────
  const tbody = document.createElement('tbody');

  TEAM.forEach(p => {
    if (p.section) {
      const tr = document.createElement('tr');
      tr.className = 'section-header';
      const td = document.createElement('td');
      td.className = 'col-name';
      td.colSpan = weeks.length + 2;
      td.textContent = p.section;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    const tr = document.createElement('tr');
    tr.className = 'person-row';
    tr.dataset.personId = p.id;

    const tdName = document.createElement('td');
    tdName.className = 'col-name';
    tdName.textContent = p.name;
    tr.appendChild(tdName);

    let total = 0;
    weeks.forEach(({ week }) => {
      const td = document.createElement('td');
      td.className = 'vac-cell';
      const entry = (data[p.id] || {})[week];
      const type = getCellType(entry);
      const status = getCellStatus(entry);
      td.dataset.type = type;
      td.dataset.status = status;
      td.dataset.personId = p.id;
      td.dataset.week = week;
      td.tabIndex = 0;
      td.setAttribute('role', 'button');
      applyCell(td, type, status);
      td.setAttribute('aria-label', `${p.name}, semana ${week}, ${ABSENCE_LABELS[type] || ABSENCE_LABELS['']}`);
      if (type !== '') total++;
      td.addEventListener('click', onCellClick);
      td.addEventListener('contextmenu', onCellRightClick);
      td.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          td.click();
        }
      });
      tr.appendChild(td);
    });

    const tdTotal = document.createElement('td');
    tdTotal.className = 'col-total';
    tdTotal.id = `total-${p.id}`;
    tdTotal.textContent = total || '';
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });

  // ── Footer row (counts per week) ─────────────────
  const footerRow = document.createElement('tr');
  footerRow.className = 'footer-row';
  const tdFooterName = document.createElement('td');
  tdFooterName.className = 'col-name';
  tdFooterName.textContent = '👥 Ausentes';
  footerRow.appendChild(tdFooterName);

  weeks.forEach(({ week }) => {
    let count = 0;
    people.forEach(p => {
      const entry = (data[p.id] || {})[week];
      const type = getCellType(entry);
      if (type && type !== '') count++;
    });
    const td = document.createElement('td');
    td.id = `count-w${week}`;
    td.className = count === 0 ? '' : count <= 2 ? 'count-ok' : count <= 4 ? 'count-warn' : 'count-danger';
    td.textContent = count > 0 ? count : '';
    footerRow.appendChild(td);
  });

  const tdFooterTotal = document.createElement('td');
  tdFooterTotal.className = 'col-total';
  footerRow.appendChild(tdFooterTotal);
  tbody.appendChild(footerRow);

  tbl.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(tbl);
}

function applyCell(td, type, status) {
  // Remove all type classes
  ABSENCE_TYPES.forEach(t => td.classList.remove(`type-${t === '' ? 'empty' : t}`));
  td.classList.remove('status-pending', 'status-confirmed', 'status-approved');
  td.classList.add(`type-${type === '' ? 'empty' : type}`);
  if (type !== '' && status) {
    td.classList.add(`status-${status}`);
  }
  td.textContent = type;
  td.dataset.type = type;
  td.dataset.status = status || 'approved';
  const statusLabel = status && status !== 'approved' ? ` (${status})` : '';
  td.title = (ABSENCE_LABELS[type] || '') + statusLabel;
}

// ── Cell click → cycle absence type ─────────────────
function onCellClick(e) {
  const td = e.currentTarget;
  const personId = td.dataset.personId;
  const week = parseInt(td.dataset.week, 10);
  const currentType = td.dataset.type || '';
  const idx = ABSENCE_TYPES.indexOf(currentType);
  const nextType = ABSENCE_TYPES[(idx + 1) % ABSENCE_TYPES.length];

  if (!data[personId]) data[personId] = {};
  if (nextType === '') {
    delete data[personId][week];
  } else {
    // Preserve existing status when changing type, default to 'approved' for new entries
    const existing = data[personId][week];
    const existingStatus = (existing && typeof existing === 'object') ? (existing.status || 'approved') : 'approved';
    data[personId][week] = { type: nextType, status: existingStatus };
  }

  const newStatus = nextType !== '' ? (data[personId][week].status || 'approved') : '';
  applyCell(td, nextType, newStatus);
  td.setAttribute('aria-label', `${getPersonName(personId)}, semana ${week}, ${ABSENCE_LABELS[nextType] || ABSENCE_LABELS['']}`);
  updateRowTotal(personId);
  updateWeekCount(week);
  saveData();
  alertsDismissed.clear();
  renderAlerts();
}

// ── Cell right-click → cycle approval status ─────────
function onCellRightClick(e) {
  e.preventDefault();
  const td = e.currentTarget;
  const personId = td.dataset.personId;
  const week = parseInt(td.dataset.week, 10);
  const entry = (data[personId] || {})[week];
  const type = getCellType(entry);
  if (!type) return; // no absence to change status for

  const currentStatus = getCellStatus(entry);
  const idx = STATUS_CYCLE.indexOf(currentStatus);
  const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

  data[personId][week] = { type, status: nextStatus };
  applyCell(td, type, nextStatus);
  saveData();
  showToast(`Estado: ${STATUS_LABELS[nextStatus] || nextStatus}`);
}

function updateRowTotal(personId) {
  const personData = data[personId] || {};
  const total = Object.values(personData).filter(v => {
    const type = getCellType(v);
    return type && type !== '';
  }).length;
  const el = document.getElementById(`total-${personId}`);
  if (el) el.textContent = total || '';
}

function updateWeekCount(week) {
  const people = TEAM.filter(p => !p.section);
  let count = 0;
  people.forEach(p => {
    const entry = (data[p.id] || {})[week];
    const type = getCellType(entry);
    if (type && type !== '') count++;
  });
  const td = document.getElementById(`count-w${week}`);
  if (!td) return;
  td.className = count === 0 ? '' : count <= 2 ? 'count-ok' : count <= 4 ? 'count-warn' : 'count-danger';
  td.textContent = count > 0 ? count : '';
}

// ── Year selector ────────────────────────────────────
function initYearSelector() {
  const sel = document.getElementById('year-select');
  sel.innerHTML = '';
  for (let y = 2025; y <= 2030; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

function onYearChange() {
  const sel = document.getElementById('year-select');
  currentYear = parseInt(sel.value, 10);
  alertsDismissed.clear();
  loadData(currentYear);
  render();
}

function onCreateYear() {
  const sel = document.getElementById('year-select');
  const year = parseInt(sel.value, 10);
  if (localStorage.getItem(lsKey(year))) {
    if (!confirm(`Ya existe un calendario para ${year}. ¿Sobreescribir con uno vacío?`)) return;
  }
  currentYear = year;
  data = {};
  periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
  saveData();
  alertsDismissed.clear();
  render();
  showToast(`✅ Calendario ${year} creado`);
}

// ── Period editor modal ──────────────────────────────
let editingPeriod = null;

function openPeriodModal(per) {
  editingPeriod = per;
  document.getElementById('modal-period-label').value = per.label;
  document.getElementById('modal-period-color').value = per.color;
  document.getElementById('modal-period-weeks').value = weeksToRangeString(per.weeks);
  document.getElementById('period-modal').classList.remove('hidden');
}

function closePeriodModal() {
  document.getElementById('period-modal').classList.add('hidden');
  editingPeriod = null;
}

// Parse a weeks input string supporting ranges (e.g. "1-3, 10, 12-16")
// Returns a sorted, deduplicated array of valid week numbers (1-53)
function parseWeeksInput(raw) {
  const nums = new Set();
  raw.split(/[,\s]+/).forEach(token => {
    token = token.trim();
    if (!token) return;
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to   = parseInt(rangeMatch[2], 10);
      const start = Math.min(from, to);
      const end   = Math.max(from, to);
      for (let w = start; w <= end; w++) {
        if (w >= 1 && w <= 53) nums.add(w);
      }
    } else {
      const n = parseInt(token, 10);
      if (n >= 1 && n <= 53) nums.add(n);
    }
  });
  return [...nums].sort((a, b) => a - b);
}

// Convert a sorted array of week numbers to a compact range string (e.g. [1,2,3,5,6] → "1-3, 5-6")
function weeksToRangeString(weeks) {
  if (!weeks || weeks.length === 0) return '';
  const sorted = [...weeks].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);
  return parts.join(', ');
}

// Compute a readable text color (black or white) based on background luminance
function contrastTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#333333' : '#ffffff';
}

function savePeriodModal() {
  if (!editingPeriod) return;
  const label = document.getElementById('modal-period-label').value.trim();
  const color = document.getElementById('modal-period-color').value;
  const weeksRaw = document.getElementById('modal-period-weeks').value;
  const weeks = parseWeeksInput(weeksRaw);

  editingPeriod.label = label || editingPeriod.label;
  editingPeriod.color = color;
  editingPeriod.textColor = contrastTextColor(color);
  editingPeriod.weeks = weeks;

  closePeriodModal();
  saveData();
  render();
}

function addPeriod() {
  periods.push({ label: 'Nuevo Período', weeks: [], color: '#bee3f8', textColor: '#1a3a5c' });
  saveData();
  render();
  showToast('✅ Período añadido — clic en él para editar');
}

// ── Import Excel/CSV ─────────────────────────────────
function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      importRows(rows);
    } catch(err) {
      showToast('❌ Error al importar: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function importRows(rows) {
  if (!rows || rows.length < 2) {
    showToast('❌ Archivo vacío o sin formato reconocido');
    return;
  }
  // Expected format: first column = name, columns 2..53 = week absence types (week 1..52)
  let imported = 0;

  // Build a normalized name map for matching: normalized name -> person
  // Normalizing strips diacritics so "Ibanez" matches "Ibañez", etc.
  function normalizeName(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  const nameMap = {};
  TEAM.forEach(p => {
    if (p.section) return;
    nameMap[normalizeName(p.name)] = p;
  });

  function findPerson(rawName) {
    const normalized = normalizeName(rawName);
    // 1. Exact match (after normalization)
    if (nameMap[normalized]) return nameMap[normalized];
    // 2. All-words fuzzy: every word in rawName appears in team member name
    //    Require unique match to avoid ambiguity (e.g. "Eva" could match 2 people)
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    const matches = TEAM.filter(p => {
      if (p.section) return false;
      const tname = normalizeName(p.name);
      return words.every(w => tname.includes(w));
    });
    return matches.length === 1 ? matches[0] : null;
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const person = findPerson(name);
    if (!person) continue;
    if (!data[person.id]) data[person.id] = {};
    for (let c = 1; c <= 52; c++) {
      const val = row[c] ? String(row[c]).trim() : '';
      if (ABSENCE_TYPES.includes(val)) {
        if (val === '') {
          delete data[person.id][c];
        } else {
          data[person.id][c] = { type: val, status: 'approved' };
        }
      }
    }
    imported++;
  }
  saveData();
  alertsDismissed.clear();
  render();
  showToast(`✅ Importados ${imported} registros`);
}

// ── Export CSV ───────────────────────────────────────
function exportCSV() {
  const weeks = getWeeks(currentYear);
  const header = ['Nombre', ...weeks.map(w => `S${w.week}`)];
  const rows = [header];

  TEAM.forEach(p => {
    if (p.section) return;
    const row = [p.name, ...weeks.map(w => getCellType((data[p.id] || {})[w.week]) || '')];
    rows.push(row);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vacaciones_${currentYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exportado');
}

// ── Resumen panel ────────────────────────────────────
function openResumenPanel() {
  const people = TEAM.filter(p => !p.section);
  const types = ABSENCE_TYPES.filter(t => t !== '');
  const typeTotals = {};
  types.forEach(t => { typeTotals[t] = 0; });
  let grandTotal = 0;

  let html = '<table class="resumen-table">';
  html += '<thead><tr><th>Persona</th>';
  types.forEach(t => { html += `<th>${t}</th>`; });
  html += '<th>Total</th></tr></thead><tbody>';

  people.forEach(p => {
    const personData = data[p.id] || {};
    const counts = {};
    types.forEach(t => { counts[t] = 0; });
    Object.values(personData).forEach(entry => {
      const type = getCellType(entry);
      if (type && counts[type] !== undefined) counts[type]++;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    grandTotal += total;
    types.forEach(t => { typeTotals[t] += counts[t]; });

    html += `<tr><td class="resumen-name">${p.name}</td>`;
    types.forEach(t => {
      const v = counts[t];
      html += `<td class="resumen-cell">${v > 0 ? `<span class="type-${t} resumen-badge">${v}</span>` : ''}</td>`;
    });
    html += `<td class="resumen-total">${total || ''}</td></tr>`;
  });

  // Footer totals row
  html += '<tr class="resumen-footer"><td class="resumen-name">👥 Total</td>';
  types.forEach(t => {
    html += `<td class="resumen-cell">${typeTotals[t] || ''}</td>`;
  });
  html += `<td class="resumen-total">${grandTotal || ''}</td></tr>`;
  html += '</tbody></table>';

  document.getElementById('resumen-year').textContent = currentYear;
  document.getElementById('resumen-content').innerHTML = html;
  document.getElementById('resumen-modal').classList.remove('hidden');
}

function closeResumenPanel() {
  document.getElementById('resumen-modal').classList.add('hidden');
}

// ── Exported functions for other modules ─────────────
window.getVacacionesForWeek = function(year, weekNumber) {
  const raw = localStorage.getItem('vacaciones_' + year);
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch(e) { return []; }
  const vacData = parsed.data || {};
  const result = [];
  Object.keys(vacData).forEach(personId => {
    const weekData = vacData[personId][weekNumber];
    if (weekData) {
      const type = typeof weekData === 'string' ? weekData : weekData.type;
      const status = typeof weekData === 'string' ? 'approved' : (weekData.status || 'approved');
      if (type && type !== '') {
        result.push({ personId, personName: getPersonName(personId), type, status });
      }
    }
  });
  return result;
};

window.getVacacionesForPerson = function(year, personId) {
  const raw = localStorage.getItem('vacaciones_' + year);
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch(e) { return {}; }
  return (parsed.data || {})[personId] || {};
};


function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-toggle').textContent = isDark ? '🌙 Oscuro' : '☀️ Claro';
  try { localStorage.setItem('vac_theme', isDark ? 'light' : 'dark'); } catch(e) {}
}

function loadTheme() {
  try {
    const t = localStorage.getItem('vac_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('theme-toggle').textContent = t === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
  } catch(e) {}
}

// ── Toast ─────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  initYearSelector();
  loadData(currentYear);
  render();

  // Wire up toolbar buttons
  document.getElementById('year-select').addEventListener('change', onYearChange);
  document.getElementById('btn-create-year').addEventListener('click', onCreateYear);
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('file-import').addEventListener('change', onImportFile);
  document.getElementById('btn-add-period').addEventListener('click', addPeriod);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('btn-resumen').addEventListener('click', openResumenPanel);

  // Period modal buttons
  document.getElementById('btn-period-save').addEventListener('click', savePeriodModal);
  document.getElementById('btn-period-cancel').addEventListener('click', closePeriodModal);

  // Close modal on overlay click
  document.getElementById('period-modal').addEventListener('click', function(e) {
    if (e.target === this) closePeriodModal();
  });

  // Resumen modal
  document.getElementById('btn-resumen-close').addEventListener('click', closeResumenPanel);
  document.getElementById('resumen-modal').addEventListener('click', function(e) {
    if (e.target === this) closeResumenPanel();
  });
});
