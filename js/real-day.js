// ═══════════════════════════════════════════════════════════════════════════════
// Feature — Modo "Día Real"
// Reads realSchedule:v1 from localStorage and renders it in the dashboard.
// Depends on globals from app.js: esc, escAttr, TIME_SLOTS, COLORS
// ═══════════════════════════════════════════════════════════════════════════════

var LS_REAL_SCHEDULE = 'realSchedule:v1';

// Ordered list of Spanish day names we expect in realSchedule
var REAL_ES_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Currently selected day index within the available days
var realDaySelectedIdx = 0;

// Cached data reference for event delegation (updated on each render)
var _realCurrentData = null;

// ── Initialize schedule-container click delegation (once) ─────────────────────
// We attach once and look up data from _realCurrentData to avoid duplicate listeners.
(function initRealClickDelegation() {
  document.addEventListener('DOMContentLoaded', function() {
    var sc = document.getElementById('schedule-container');
    if (!sc) return;
    sc.addEventListener('click', function(e) {
      // Person card click → drill-down
      var card = e.target.closest('.real-person-card');
      if (card && _realCurrentData) {
        var personName = card.dataset.personName;
        if (personName) { openRealPersonDrilldown(personName, _realCurrentData); return; }
      }
      // Day selector button click
      var dayBtn = e.target.closest('.real-day-btn');
      if (dayBtn) {
        var idx = parseInt(dayBtn.dataset.dayIdx, 10);
        if (!isNaN(idx)) selectRealDay(idx);
      }
    });
  });
})();

// ── Load / persist helpers ────────────────────────────────────────────────────

function loadRealSchedule() {
  try {
    var raw = localStorage.getItem(LS_REAL_SCHEDULE);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

// ── Main entry point (called from tab click in app.js) ────────────────────────

function renderRealDayView() {
  var data = loadRealSchedule();
  _realCurrentData = data;  // Update cached reference for event delegation

  var subtitle = document.getElementById('subtitle');
  var kpiEl    = document.getElementById('kpi-cards');
  var hmEl     = document.getElementById('kpi-heatmap');
  var qsEl     = document.getElementById('quick-stats');
  var sc       = document.getElementById('schedule-container');

  // Reset KPI / heatmap
  if (kpiEl) kpiEl.innerHTML = '';
  if (hmEl)  hmEl.innerHTML  = '';

  // Hide alerts / what-if banners (not applicable in Real mode)
  var alertBadge = document.getElementById('alerts-badge');
  var alertSummary = document.getElementById('alert-drawer-summary');
  if (alertBadge)   { alertBadge.textContent = ''; alertBadge.className = 'alert-badge ok'; }
  if (alertSummary) {
    alertSummary.innerHTML = 'ℹ️ <strong>Día Real</strong> — Horario importado desde el Auditor';
    alertSummary.style.color = 'var(--text-muted)';
  }

  if (!data || !data.days) {
    if (subtitle) subtitle.textContent = '📂 Día Real · Sin datos importados';
    if (qsEl) qsEl.innerHTML = '';
    if (sc) sc.innerHTML = buildRealEmptyState();
    return;
  }

  // Collect available days in canonical order
  var availableDays = REAL_ES_DAYS.filter(function(d) {
    return data.days[d] && data.days[d].length > 0;
  });

  if (availableDays.length === 0) {
    if (subtitle) subtitle.textContent = '📂 Día Real · Sin datos para mostrar';
    if (qsEl) qsEl.innerHTML = '';
    if (sc) sc.innerHTML = buildRealEmptyState();
    return;
  }

  // Clamp selected index
  if (realDaySelectedIdx < 0 || realDaySelectedIdx >= availableDays.length) {
    realDaySelectedIdx = 0;
  }

  var selectedDay = availableDays[realDaySelectedIdx];
  var persons     = data.days[selectedDay] || [];

  // Subtitle
  var importDate = data.importedAt
    ? new Date(data.importedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  if (subtitle) {
    subtitle.textContent = '📂 Día Real · ' + (data.fileName || 'horario') + ' · ' + importDate;
  }

  // Quick stats
  if (qsEl) qsEl.innerHTML = buildRealQuickStats(persons);

  // KPI cards
  if (kpiEl) kpiEl.innerHTML = buildRealKPICards(data, selectedDay, persons);

  // Main schedule view
  if (sc) sc.innerHTML = buildRealScheduleHTML(data, availableDays, selectedDay, persons);
}

// ── Empty state ───────────────────────────────────────────────────────────────

function buildRealEmptyState() {
  return '<div class="real-empty-state">' +
    '<div class="real-empty-icon">📂</div>' +
    '<h2 class="real-empty-title">Sin horario real importado</h2>' +
    '<p class="real-empty-desc">Importa un archivo de horario desde el Auditor para verlo aquí con KPIs y vista por día.</p>' +
    '<a href="auditor.html" class="real-empty-cta">🔍 Ir al Auditor para importar</a>' +
    '</div>';
}

// ── Quick stats bar ───────────────────────────────────────────────────────────

function buildRealQuickStats(persons) {
  var working   = persons.length;
  var managers  = persons.filter(function(p) { return /manager/i.test(p.role); }).length;
  var leads     = persons.filter(function(p) { return /lead/i.test(p.role); }).length;
  var mornings  = persons.filter(function(p) { return /early|open|mid/i.test(p.shift); }).length;
  var lates     = persons.filter(function(p) { return /late|close/i.test(p.shift); }).length;

  return '<div class="stat-card"><div class="stat-value">' + working + '</div><div class="stat-label">Personas</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:var(--mgr-text)">' + managers + '</div><div class="stat-label">Managers</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:var(--lead-text)">' + leads + '</div><div class="stat-label">Leads</div></div>' +
    '<div class="stat-card"><div class="stat-value">🌅 ' + mornings + '</div><div class="stat-label">Mañana</div></div>' +
    '<div class="stat-card"><div class="stat-value">🌙 ' + lates + '</div><div class="stat-label">Tarde</div></div>';
}

// ── KPI cards (simplified, based on shift categories) ────────────────────────

function buildRealKPICards(data, selectedDay, persons) {
  // KPI 1: Total working
  var working = persons.length;
  var workingStatus = working >= 8 ? 'green' : working >= 5 ? 'amber' : 'red';
  var workingIcon = workingStatus === 'green' ? '🟢' : workingStatus === 'amber' ? '🟡' : '🔴';

  // KPI 2: Managers on floor
  var managers = persons.filter(function(p) { return /manager/i.test(p.role); }).length;
  var mgrStatus = managers >= 6 ? 'green' : managers >= 4 ? 'amber' : 'red';
  var mgrIcon = mgrStatus === 'green' ? '🟢' : mgrStatus === 'amber' ? '🟡' : '🔴';

  // KPI 3: Leads
  var leads = persons.filter(function(p) { return /lead/i.test(p.role); }).length;
  var leadStatus = leads >= 3 ? 'green' : leads >= 2 ? 'amber' : 'red';
  var leadIcon = leadStatus === 'green' ? '🟢' : leadStatus === 'amber' ? '🟡' : '🔴';

  // KPI 4: Apertura/Cierre coverage
  var hasEarly = persons.some(function(p) { return /early|open/i.test(p.shift); });
  var hasClose = persons.some(function(p) { return /close|late/i.test(p.shift); });
  var aperturaStatus = hasEarly ? 'green' : 'red';
  var cierreStatus   = hasClose ? 'green' : 'red';

  function card(icon, status, value, label, detail) {
    return '<div class="kpi-card kpi-' + status + '" title="' + escAttr(detail) + '">' +
      '<div class="kpi-icon">' + icon + '</div>' +
      '<div class="kpi-value">' + esc(value) + '</div>' +
      '<div class="kpi-label">' + esc(label) + '</div>' +
      '<div class="kpi-detail">' + esc(detail) + '</div>' +
      '</div>';
  }

  return card(workingIcon, workingStatus, working + ' personas', 'Equipo', 'Personas trabajando este día') +
    card(mgrIcon, mgrStatus, managers + ' Mgr', 'Managers', 'Managers programados') +
    card(leadIcon, leadStatus, leads + ' Leads', 'Leads', 'Leads programados') +
    card(hasEarly ? '🟢' : '🔴', aperturaStatus, hasEarly ? '✓ Apertura' : '✗ Apertura', 'Cobertura apertura', 'Turno Early / Open cubierto') +
    card(hasClose ? '🟢' : '🔴', cierreStatus,   hasClose ? '✓ Cierre' : '✗ Cierre',   'Cobertura cierre',   'Turno Close / Late cubierto');
}

// ── Main schedule HTML ────────────────────────────────────────────────────────

function buildRealScheduleHTML(data, availableDays, selectedDay, persons) {
  var h = '';

  // ── Info bar ──
  var importDate = data.importedAt
    ? new Date(data.importedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  var weekStart = data.weekStart
    ? new Date(data.weekStart).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  h += '<div class="real-info-bar">';
  h += '<div class="real-info-left">';
  h += '<span class="real-file-badge">📋 ' + esc(data.fileName || 'horario') + '</span>';
  if (weekStart) h += ' <span class="real-week-badge">📅 Semana del ' + esc(weekStart) + '</span>';
  h += ' <span class="real-import-date">Importado: ' + esc(importDate) + '</span>';
  h += '</div>';
  h += '<div class="real-info-right">';
  h += '<a href="auditor.html" class="real-btn-import">📁 Importar otro</a>';
  h += '</div>';
  h += '</div>';

  // ── Day selector ──
  h += '<div class="real-day-selector">';
  for (var i = 0; i < availableDays.length; i++) {
    var day = availableDays[i];
    var count = data.days[day] ? data.days[day].length : 0;
    var isActive = day === selectedDay;
    h += '<button class="real-day-btn' + (isActive ? ' active' : '') + '" ' +
      'data-day-idx="' + i + '" aria-pressed="' + isActive + '">' +
      esc(day.substring(0, 3)) +
      '<span class="real-day-count">' + count + '</span>' +
      '</button>';
  }
  h += '</div>';

  // ── Schedule table ──
  if (persons.length === 0) {
    h += '<div class="real-no-data">Sin personas programadas para este día.</div>';
    return h;
  }

  // Group by role: Leads first, then Managers
  var leads    = persons.filter(function(p) { return /lead/i.test(p.role); });
  var managers = persons.filter(function(p) { return /manager/i.test(p.role); });
  var others   = persons.filter(function(p) { return !/lead|manager/i.test(p.role); });

  function renderGroup(groupPersons, groupLabel, rowClass) {
    if (groupPersons.length === 0) return '';
    var gh = '<div class="real-group">';
    gh += '<div class="real-group-header">' + esc(groupLabel) + ' <span class="real-group-count">(' + groupPersons.length + ')</span></div>';
    gh += '<div class="real-persons-grid">';
    for (var gi = 0; gi < groupPersons.length; gi++) {
      var p = groupPersons[gi];
      var shiftColor = getRealShiftColor(p.shift);
      // Use data-person-name attribute; click is handled via event delegation
      gh += '<div class="real-person-card ' + rowClass + '" data-person-name="' + escAttr(p.name) + '">' +
        '<div class="real-person-name">' + esc(p.name) + '</div>' +
        '<div class="real-person-role" style="color:' + (rowClass === 'real-lead' ? 'var(--lead-text)' : 'var(--mgr-text)') + '">' + esc(p.role) + '</div>' +
        '<div class="real-person-shift" style="background:' + shiftColor.bg + ';color:' + shiftColor.text + '">' + esc(p.shift) + '</div>' +
        '</div>';
    }
    gh += '</div></div>';
    return gh;
  }

  h += '<div class="real-schedule-body">';
  h += renderGroup(leads,    'Leads',    'real-lead');
  h += renderGroup(managers, 'Managers', 'real-manager');
  h += renderGroup(others,   'Otros',    'real-other');
  h += '</div>';

  return h;
}

// ── Day selection handler (called from onclick) ───────────────────────────────

function selectRealDay(idx) {
  realDaySelectedIdx = idx;
  renderRealDayView();
}

// ── Shift color helper ────────────────────────────────────────────────────────

function getRealShiftColor(shift) {
  if (!shift) return { bg: '#e2e8f0', text: '#4a5568' };
  var s = shift.toLowerCase();
  if (/early|open/.test(s)) return { bg: '#ebf8ff', text: '#2b6cb0' };
  if (/mid/.test(s))        return { bg: '#f0fff4', text: '#276749' };
  if (/late/.test(s))       return { bg: '#fffaf0', text: '#c05621' };
  if (/close/.test(s))      return { bg: '#fff5f5', text: '#c53030' };
  if (/off|holid/.test(s))  return { bg: '#edf2f7', text: '#718096' };
  if (/bh|tg|own/.test(s))  return { bg: '#faf5ff', text: '#553c9a' };
  return { bg: '#f7fafc', text: '#4a5568' };
}

// ── Real person drill-down ────────────────────────────────────────────────────

function openRealPersonDrilldown(personName, data) {
  var overlay = document.getElementById('modal-person-drill');
  if (!overlay) return;

  overlay.querySelector('.person-drill-body').innerHTML = buildRealPersonDrillContent(personName, data);
  overlay.classList.add('open');

  var firstBtn = overlay.querySelector('button');
  if (firstBtn) firstBtn.focus();
}

function buildRealPersonDrillContent(personName, data) {
  // Find person across all days
  var weekData = {};  // { dayName: shift }
  var role = '';
  var dept = '';

  for (var di = 0; di < REAL_ES_DAYS.length; di++) {
    var day = REAL_ES_DAYS[di];
    var dayPersons = data.days[day] || [];
    var found = dayPersons.find(function(p) { return p.name === personName; });
    if (found) {
      weekData[day] = found.shift || '';
      if (!role) role = found.role || '';
      if (!dept) dept = found.dept || '';
    } else {
      weekData[day] = null; // not scheduled this day
    }
  }

  var isLead   = /lead/i.test(role);
  var roleColor = isLead ? 'var(--lead-text)' : 'var(--mgr-text)';
  var roleBg    = isLead ? 'var(--lead-bg)'   : 'var(--mgr-bg)';

  var h = '';
  h += '<div class="pd-header">';
  h += '<div class="pd-name">' + esc(personName) + '</div>';
  h += '<div class="pd-meta">';
  h += '<span class="pd-role-badge" style="background:' + roleBg + ';color:' + roleColor + '">' + esc(role || 'Sin rol') + '</span>';
  if (dept) h += '<span class="pd-shift">' + esc(dept) + '</span>';
  h += '</div>';
  h += '</div>';

  // Import date + source
  var importDate = data.importedAt
    ? new Date(data.importedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  h += '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:10px;">📋 Fuente: ' + esc(data.fileName || 'horario') + ' · ' + esc(importDate) + '</div>';

  // Weekly schedule table
  h += '<div class="pd-section"><div class="pd-section-title">📅 Semana Real</div>';
  h += '<div class="real-drill-week">';
  var workingDays = 0;
  for (var d = 0; d < REAL_ES_DAYS.length; d++) {
    var dayName = REAL_ES_DAYS[d];
    var shift   = weekData[dayName];
    var isWorking = shift !== null && shift !== '' && !/off|holid/i.test(shift || '');
    if (isWorking) workingDays++;
    var sc = getRealShiftColor(shift);
    h += '<div class="real-drill-day">';
    h += '<div class="real-drill-day-name">' + esc(dayName.substring(0, 3)) + '</div>';
    if (shift === null) {
      h += '<div class="real-drill-shift" style="background:#edf2f7;color:#718096">—</div>';
    } else if (!shift || /off|holid/i.test(shift)) {
      h += '<div class="real-drill-shift" style="background:#edf2f7;color:#718096">' + esc(shift || 'Off') + '</div>';
    } else {
      h += '<div class="real-drill-shift" style="background:' + sc.bg + ';color:' + sc.text + '">' + esc(shift) + '</div>';
    }
    h += '</div>';
  }
  h += '</div>';
  h += '<div style="font-size:.8rem;color:var(--text-muted);margin-top:6px;">Días trabajando: <strong>' + workingDays + '</strong> / ' + REAL_ES_DAYS.length + '</div>';
  h += '</div>';

  h += '<div class="pd-section"><div class="pd-section-title">ℹ️ Nota</div>';
  h += '<div style="font-size:.8rem;color:var(--text-muted);">El horario real importado contiene tipos de turno (Early, Late, Mid, etc.). Para ver actividades detalladas (Coach/Support/AOR), consulta los patrones teóricos.</div>';
  h += '</div>';

  return h;
}
