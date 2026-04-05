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
// STATE
// ═══════════════════════════════════════════════════════════════════════════
let state = {
  fileName: null,
  parsedPersons: [],   // [{name, role, dept, fwa, plan, sch, days:{Mon,Tue,...}}]
  weekDates: [],       // [{label:'Lunes 18 may', key:'Mon'}]
  auditIssues: [],     // [{id, severity, title, meta, rule, fix, day, personName, accepted, rejected}]
  acceptedFixes: new Set(),
  rejectedFixes: new Set(),
  activeTab: 'schedule',
  theme: localStorage.getItem('auditor_theme') || 'light',
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
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
  localStorage.setItem('auditor_theme', state.theme);
  applyTheme(state.theme);
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
    label: d.label || DAYS_ES[i] || d.key,
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
  showToast('Informe exportado ✅', 'ok');
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
