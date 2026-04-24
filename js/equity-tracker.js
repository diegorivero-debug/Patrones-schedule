// ═══════════════════════════════════════════════════════════════════════════════
// Feature 3 — Equity Tracker semanal de Managers
// ═══════════════════════════════════════════════════════════════════════════════
// Depends on globals from app.js: currentState, DAY_PATTERN_IDX, WEEK_DAYS,
// getFloorRoleForRow, esc, escAttr, memberShortDisplay, teamData, calculateScore, scoreColor

function renderEquityTrackerView() {
  var subtitle = document.getElementById('subtitle');
  if (subtitle) subtitle.textContent = '⚖️ Equity Tracker · Managers (Semana modelo)';

  var badge   = document.getElementById('alerts-badge');
  var summary = document.getElementById('alert-drawer-summary');
  if (badge)   { badge.textContent = ''; badge.className = 'alert-badge ok'; }
  if (summary) {
    summary.innerHTML = 'ℹ️ <strong>Equity Tracker</strong> — Equidad de roles Coach/Support por Manager';
    summary.style.color = 'var(--text-muted)';
  }

  var kpiEl = document.getElementById('kpi-cards');
  var hmEl  = document.getElementById('kpi-heatmap');
  if (kpiEl) kpiEl.innerHTML = '';
  if (hmEl)  hmEl.innerHTML  = '';

  var qsEl = document.getElementById('quick-stats');
  if (qsEl) qsEl.innerHTML = buildEquityQuickStats();

  var sc = document.getElementById('schedule-container');
  if (sc) sc.innerHTML = buildEquityTrackerHTML();
}

// ── Quick stats for equity view ───────────────────────────────────────────────
function buildEquityQuickStats() {
  var info = getEquityData();
  var totalCoachDays   = 0, totalSupportDays = 0;
  info.managers.forEach(function(m) { totalCoachDays += m.coachDays; totalSupportDays += m.supportDays; });
  var totalMgrs = info.managers.length;
  var balanced  = info.managers.filter(function(m) { return m.isBalanced; }).length;
  var pct = totalMgrs > 0 ? Math.round(balanced / totalMgrs * 100) : 100;
  var pctColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--orange)' : 'var(--red)';

  return '<div class="stat-card"><div class="stat-value">' + totalMgrs + '</div><div class="stat-label">Managers</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:var(--green)">' + totalCoachDays + '</div><div class="stat-label">Días Coach (semana)</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:var(--orange)">' + totalSupportDays + '</div><div class="stat-label">Días Support (semana)</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:' + pctColor + '">' + pct + '%</div><div class="stat-label">Managers equilibrados</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="font-size:.85rem">⚖️</div><div class="stat-label">Target 2-3C / 2-3S</div></div>';
}

// ── Collect equity data ───────────────────────────────────────────────────────
function getEquityData() {
  var dayPatterns = DAY_PATTERN_IDX.map(function(idx) { return currentState[idx]; });
  var dayMgrs = dayPatterns.map(function(p) { return p.filter(function(r) { return r.role === 'Manager'; }); });
  var maxMgrs = Math.max.apply(null, dayMgrs.map(function(a) { return a.length; }));

  var managers = [];
  for (var i = 0; i < maxMgrs; i++) {
    var coachDays = 0, supportDays = 0, offDays = 0;
    var days = []; // info per day: {role, shift, isCoach, isSup, isMorning}

    // Try to get label from team data
    var label = 'Mgr ' + (i + 1);
    var assignedId = null;
    for (var d = 0; d < WEEK_DAYS.length; d++) {
      var row = dayMgrs[d][i];
      if (row && row.assignedId && !assignedId) {
        assignedId = row.assignedId;
        var member = teamData.managers.find(function(m) { return m.id === assignedId; });
        if (member) label = memberShortDisplay(member);
      }
    }

    for (var d = 0; d < WEEK_DAYS.length; d++) {
      var row = dayMgrs[d][i];
      if (!row) {
        days.push({ off: true });
        offDays++;
        continue;
      }
      var role = getFloorRoleForRow(row);
      if (role === 'Coach') coachDays++;
      else if (role === 'Support') supportDays++;

      // Morning/afternoon: morning if shift starts <= 09:30
      var startTime = row.shift ? row.shift.split('-')[0] : '';
      var startHourStr = startTime.replace(':', '');
      var startHour = startHourStr ? parseInt(startHourStr, 10) : 1200;
      var isMorning = startHour <= 930;

      days.push({ role: role, shift: row.shift, isMorning: isMorning, off: false });
    }

    // Balanced: 2-3 coach AND 2-3 support days (across the 6-day week)
    var activeDays = coachDays + supportDays;
    var isBalanced = activeDays > 0 && coachDays >= 2 && coachDays <= 3 && supportDays >= 2 && supportDays <= 3;

    // Check morning/afternoon streaks
    var morningStreak = 0, afternoonStreak = 0, maxMorningStreak = 0, maxAfternoonStreak = 0;
    days.forEach(function(d) {
      if (!d.off) {
        if (d.isMorning) { morningStreak++; afternoonStreak = 0; if (morningStreak > maxMorningStreak) maxMorningStreak = morningStreak; }
        else { afternoonStreak++; morningStreak = 0; if (afternoonStreak > maxAfternoonStreak) maxAfternoonStreak = afternoonStreak; }
      } else {
        morningStreak = 0; afternoonStreak = 0;
      }
    });

    // Count consecutive working days (no off day)
    var consecWork = 0, maxConsecWork = 0;
    days.forEach(function(d) {
      if (!d.off) { consecWork++; if (consecWork > maxConsecWork) maxConsecWork = consecWork; }
      else consecWork = 0;
    });

    managers.push({
      label: label,
      coachDays: coachDays,
      supportDays: supportDays,
      offDays: offDays,
      isBalanced: isBalanced,
      days: days,
      maxMorningStreak: maxMorningStreak,
      maxAfternoonStreak: maxAfternoonStreak,
      maxConsecWork: maxConsecWork
    });
  }

  return { managers: managers };
}

// ── Build equity HTML ─────────────────────────────────────────────────────────
function buildEquityTrackerHTML() {
  var info = getEquityData();
  var managers = info.managers;

  var h = '<div class="equity-tracker-wrap">';
  h += '<div class="equity-tracker-header">';
  h += '<h2>⚖️ Equity Tracker · Managers</h2>';
  h += '<p class="equity-note">📅 Semana modelo: ' + WEEK_DAYS.join(', ') +
    ' · Patrones: Día Normal × 3 + Martes + Miércoles + Sábado · Target: 2-3 días Coach, 2-3 días Support</p>';
  h += '</div>';

  // Summary aggregated totals
  var totalCoach = 0, totalSupport = 0, totalOff = 0;
  managers.forEach(function(m) { totalCoach += m.coachDays; totalSupport += m.supportDays; totalOff += m.offDays; });

  h += '<div class="equity-aggregated">';
  h += '<span class="eq-agg-item"><span class="eq-agg-icon">🟦</span>Total Coach-días: <strong>' + totalCoach + '</strong></span>';
  h += '<span class="eq-agg-item"><span class="eq-agg-icon">🟧</span>Total Support-días: <strong>' + totalSupport + '</strong></span>';
  h += '<span class="eq-agg-item">Días OFF: <strong>' + totalOff + '</strong></span>';
  h += '<span class="eq-agg-item">Target: <strong>2-3 Coach / 2-3 Support por Manager</strong></span>';
  h += '</div>';

  // Main table
  h += '<div class="equity-table-wrap">';
  h += '<table class="equity-table" role="table" aria-label="Tabla de equidad de roles por Manager">';
  h += '<thead><tr>';
  h += '<th class="eq-th eq-th-name" scope="col">Manager</th>';
  WEEK_DAYS.forEach(function(d) { h += '<th class="eq-th" scope="col">' + d.slice(0,3) + '</th>'; });
  h += '<th class="eq-th" scope="col">Coach</th>';
  h += '<th class="eq-th" scope="col">Support</th>';
  h += '<th class="eq-th" scope="col">Balance</th>';
  h += '<th class="eq-th" scope="col">Turno</th>';
  h += '</tr></thead><tbody>';

  managers.forEach(function(mgr) {
    var rowCls = mgr.isBalanced ? '' : ' eq-row-imbalance';
    h += '<tr class="eq-tr' + rowCls + '">';
    h += '<td class="eq-td eq-td-name" scope="row">' + esc(mgr.label) + '</td>';

    // Day cells
    mgr.days.forEach(function(day) {
      if (day.off) {
        h += '<td class="eq-td eq-day-off" title="Día libre">⚪</td>';
      } else {
        var icon = day.role === 'Coach' ? '🟦' : day.role === 'Support' ? '🟧' : '⬜';
        var shiftEmoji = day.isMorning ? '🌅' : '🌙';
        var roleLabel = day.role || '—';
        h += '<td class="eq-td eq-day-cell" title="' + escAttr(roleLabel + ' · ' + (day.shift || '')) + '">' +
          icon + '<br><span class="eq-shift-emoji">' + shiftEmoji + '</span>' +
          '</td>';
      }
    });

    // Coach days bar
    var coachPct = Math.round(mgr.coachDays / 6 * 100);
    var coachCls = (mgr.coachDays >= 2 && mgr.coachDays <= 3) ? 'eq-bar-ok' : 'eq-bar-warn';
    h += '<td class="eq-td eq-bar-cell">';
    h += '<div class="eq-bar-wrap" title="' + mgr.coachDays + ' días Coach">';
    h += '<div class="eq-bar ' + coachCls + '" style="width:' + Math.min(coachPct * 1.5, 100) + '%">' + mgr.coachDays + '</div>';
    h += '</div></td>';

    // Support days bar
    var suppPct = Math.round(mgr.supportDays / 6 * 100);
    var suppCls = (mgr.supportDays >= 2 && mgr.supportDays <= 3) ? 'eq-bar-ok' : 'eq-bar-warn';
    h += '<td class="eq-td eq-bar-cell">';
    h += '<div class="eq-bar-wrap" title="' + mgr.supportDays + ' días Support">';
    h += '<div class="eq-bar eq-bar-support ' + suppCls + '" style="width:' + Math.min(suppPct * 1.5, 100) + '%">' + mgr.supportDays + '</div>';
    h += '</div></td>';

    // Balance indicator
    var balEmoji = mgr.isBalanced ? '✅' : '⚠️';
    var balText  = mgr.coachDays + 'C / ' + mgr.supportDays + 'S';
    var balCls   = mgr.isBalanced ? 'eq-bal-ok' : 'eq-bal-warn';
    h += '<td class="eq-td ' + balCls + '">' + balEmoji + '<br><span class="eq-bal-label">' + balText + '</span></td>';

    // Morning/afternoon indicator + streak
    var schedInfo = '';
    var morningDays = mgr.days.filter(function(d) { return !d.off && d.isMorning; }).length;
    var afternoonDays = mgr.days.filter(function(d) { return !d.off && !d.isMorning; }).length;
    schedInfo = morningDays + '🌅 / ' + afternoonDays + '🌙';
    var streakWarn = '';
    if (mgr.maxMorningStreak > 5) streakWarn = ' ⚠️>' + mgr.maxMorningStreak + '🌅';
    if (mgr.maxAfternoonStreak > 5) streakWarn += ' ⚠️>' + mgr.maxAfternoonStreak + '🌙';
    if (mgr.maxConsecWork >= 6) streakWarn += ' 🔴' + mgr.maxConsecWork + 'días';

    h += '<td class="eq-td eq-sched-cell">' + schedInfo + (streakWarn ? '<br><span class="eq-streak-warn">' + streakWarn + '</span>' : '') + '</td>';

    h += '</tr>';
  });

  h += '</tbody></table></div>';

  // Alerts section
  var hasAlerts = managers.some(function(m) { return !m.isBalanced || m.maxConsecWork >= 6 || m.maxMorningStreak > 5 || m.maxAfternoonStreak > 5; });
  if (hasAlerts) {
    h += '<div class="equity-alerts">';
    h += '<h3>⚠️ Alertas de equidad</h3>';
    managers.forEach(function(mgr) {
      if (!mgr.isBalanced) {
        h += '<div class="equity-alert-item equity-alert-warn">' +
          '⚠️ <strong>' + esc(mgr.label) + '</strong>: ' + mgr.coachDays + ' días Coach / ' + mgr.supportDays + ' días Support — target 2-3 de cada</div>';
      }
      if (mgr.maxConsecWork >= 6) {
        h += '<div class="equity-alert-item equity-alert-red">' +
          '🔴 <strong>' + esc(mgr.label) + '</strong>: ' + mgr.maxConsecWork + ' días consecutivos trabajados (máx recomendado: 6)</div>';
      }
      if (mgr.maxMorningStreak > 5) {
        h += '<div class="equity-alert-item equity-alert-warn">' +
          '⚠️ <strong>' + esc(mgr.label) + '</strong>: ' + mgr.maxMorningStreak + ' días seguidos de mañana</div>';
      }
      if (mgr.maxAfternoonStreak > 5) {
        h += '<div class="equity-alert-item equity-alert-warn">' +
          '⚠️ <strong>' + esc(mgr.label) + '</strong>: ' + mgr.maxAfternoonStreak + ' días seguidos de tarde</div>';
      }
    });
    h += '</div>';
  }

  // Legend
  h += '<div class="equity-legend">';
  h += '<span class="eq-leg-item"><span>🟦</span> Coach</span>';
  h += '<span class="eq-leg-item"><span>🟧</span> Support</span>';
  h += '<span class="eq-leg-item"><span>⚪</span> Día libre</span>';
  h += '<span class="eq-leg-item"><span>🌅</span> Mañana (≤09:30)</span>';
  h += '<span class="eq-leg-item"><span>🌙</span> Tarde (>09:30)</span>';
  h += '<span class="eq-leg-item"><span>✅</span> Equilibrado</span>';
  h += '<span class="eq-leg-item"><span>⚠️</span> Desbalanceado</span>';
  h += '</div>';

  h += '</div>';
  return h;
}
