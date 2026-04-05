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
const ABSENCE_COLORS = {
  '':          '#ffffff',
  'V':         '#90EE90',
  'V25':       '#FF69B4',
  'F':         '#FF9999',
  'TGD':       '#5F9EA0',
  'Parental':  '#FFA07A',
  'Paternidad':'#FFB347',
  'Lactancia': '#FFDAB9',
  'UNPAID':    '#B0B0B0',
};

// Default period bands keyed by year
const DEFAULT_PERIODS = [
  { label: 'PEAK',          weeks: [],  color: '#ffd700', textColor: '#5c4200' },
  { label: 'Semana Santa',  weeks: [],  color: '#b0b0b0', textColor: '#333' },
  { label: 'APR',           weeks: [],  color: '#90cdf4', textColor: '#1a3a5c' },
  { label: 'NPI',           weeks: [],  color: '#90cdf4', textColor: '#1a3a5c' },
];

// Team roster
const TEAM = [
  { section: 'Store Leaders' },
  { id: 'diego',    name: 'Diego Rivero' },
  { id: 'jordi',    name: 'Jordi Pajares' },
  { section: 'Senior Managers' },
  { id: 'jorge',    name: 'Jorge Gil' },
  { id: 'sheila',   name: 'Sheila Yubero' },
  { id: 'itziar',   name: 'Itziar Cacho' },
  { id: 'cris_c',   name: 'Cris Carcel' },
  { section: 'Managers' },
  { id: 'jesus',    name: 'Jesús Pazos' },
  { id: 'pedro',    name: 'Pedro Borlido' },
  { id: 'julie',    name: 'Julie Robin' },
  { id: 'javi_s',   name: 'Javi Sánchez' },
  { id: 'meri',     name: 'Meri Alvarez' },
  { id: 'toni',     name: 'Toni Medina' },
  { id: 'deborah',  name: 'Deborah Ibañez' },
  { id: 'ane',      name: 'Ane Pazos' },
  { id: 'ricardo',  name: 'Ricardo Sosa' },
  { id: 'javi_q',   name: 'Javi Quiros' },
  { id: 'cris_u',   name: 'Cris Usón' },
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

// ── State ────────────────────────────────────────────
let currentYear = new Date().getFullYear();
let data = {};   // { personId: { week: absenceType } }
let periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
let alertsDismissed = new Set();

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
    } catch(e) {
      data = {};
      periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
    }
  } else {
    data = {};
    periods = JSON.parse(JSON.stringify(DEFAULT_PERIODS));
  }
}

// ── Week calculation ─────────────────────────────────
// Returns array of { week: number, monday: Date } for 52 weeks of the given year
function getWeeks(year) {
  // Find first Monday of the year (ISO week 1 starts on Monday)
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in W1
  const day = jan4.getDay() || 7;    // Make Sunday = 7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (day - 1));

  const weeks = [];
  for (let i = 0; i < 52; i++) {
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

// Get ISO week number for a date
function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
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
      const type = (data[p.id] || {})[week];
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
        if (personData[w] && personData[w] !== '') {
          alerts.push({
            key: `peak_${p.id}_w${w}`,
            level: 'orange',
            icon: '⚠️',
            msg: `${p.name}: ausencia (${personData[w]}) durante semana PEAK (sem. ${w})`,
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
  let sectionIdx = 0;

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
      const type = (data[p.id] || {})[week] || '';
      td.dataset.type = type;
      td.dataset.personId = p.id;
      td.dataset.week = week;
      applyCell(td, type);
      if (type !== '') total++;
      td.addEventListener('click', onCellClick);
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
      const type = (data[p.id] || {})[week];
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

function applyCell(td, type) {
  // Remove all type classes
  ABSENCE_TYPES.forEach(t => td.classList.remove(`type-${t === '' ? 'empty' : t}`));
  td.classList.add(`type-${type === '' ? 'empty' : type}`);
  td.textContent = type;
  td.dataset.type = type;
  td.title = ABSENCE_LABELS[type] || '';
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
    data[personId][week] = nextType;
  }

  applyCell(td, nextType);
  updateRowTotal(personId);
  updateWeekCount(week);
  saveData();
  alertsDismissed.clear();
  renderAlerts();
}

function updateRowTotal(personId) {
  const personData = data[personId] || {};
  const total = Object.values(personData).filter(v => v && v !== '').length;
  const el = document.getElementById(`total-${personId}`);
  if (el) el.textContent = total || '';
}

function updateWeekCount(week) {
  const people = TEAM.filter(p => !p.section);
  let count = 0;
  people.forEach(p => {
    const type = (data[p.id] || {})[week];
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
  document.getElementById('modal-period-weeks').value = per.weeks.join(', ');
  document.getElementById('period-modal').classList.remove('hidden');
}

function closePeriodModal() {
  document.getElementById('period-modal').classList.add('hidden');
  editingPeriod = null;
}

function savePeriodModal() {
  if (!editingPeriod) return;
  const label = document.getElementById('modal-period-label').value.trim();
  const color = document.getElementById('modal-period-color').value;
  const weeksRaw = document.getElementById('modal-period-weeks').value;
  const weeks = weeksRaw.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 52);

  editingPeriod.label = label || editingPeriod.label;
  editingPeriod.color = color;
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

  // Build a normalized name map for matching: lowercase trimmed name -> person
  const nameMap = {};
  TEAM.forEach(p => {
    if (p.section) return;
    nameMap[p.name.toLowerCase().trim()] = p;
  });

  function findPerson(rawName) {
    const normalized = rawName.toLowerCase().trim();
    // Exact match first
    if (nameMap[normalized]) return nameMap[normalized];
    // Partial match: all words of rawName appear in team member name
    const words = normalized.split(/\s+/).filter(Boolean);
    return TEAM.find(p => {
      if (p.section) return false;
      const tname = p.name.toLowerCase();
      return words.length > 0 && words.every(w => tname.includes(w));
    }) || null;
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
          data[person.id][c] = val;
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
    const row = [p.name, ...weeks.map(w => (data[p.id] || {})[w.week] || '')];
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

// ── Theme toggle ─────────────────────────────────────
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

  // Period modal buttons
  document.getElementById('btn-period-save').addEventListener('click', savePeriodModal);
  document.getElementById('btn-period-cancel').addEventListener('click', closePeriodModal);

  // Close modal on overlay click
  document.getElementById('period-modal').addEventListener('click', function(e) {
    if (e.target === this) closePeriodModal();
  });
});
