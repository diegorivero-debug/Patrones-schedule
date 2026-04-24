// ═══════════════════════════════════════════════════════════════════════════════
// Feature 1 — KPI Semaphore + Coverage Heatmap
// ═══════════════════════════════════════════════════════════════════════════════
// Depends on globals from app.js: calcSummary, getActiveRows, getOpenStart,
// getOpenEnd, TIME_SLOTS, BUSINESS_RULES, calcPersonHours, esc, escAttr

// ── Entry point called from app.js render() ──────────────────────────────────
function renderKPISection(patIdx) {
  var kpiEl = document.getElementById('kpi-cards');
  var hmEl  = document.getElementById('kpi-heatmap');
  if (kpiEl) kpiEl.innerHTML = (typeof patIdx === 'number') ? buildKPICards(patIdx) : '';
  if (hmEl)  hmEl.innerHTML  = (typeof patIdx === 'number') ? buildCoverageHeatmap(patIdx) : '';
}

// ── Status helpers ────────────────────────────────────────────────────────────
function kpiStatusClass(status) {
  return 'kpi-' + status;
}
function kpiIcon(status) {
  return status === 'green' ? '🟢' : status === 'amber' ? '🟡' : '🔴';
}

// ── KPI 1: Cobertura mínima floor ─────────────────────────────────────────────
function kpi_coverageFloor(patIdx) {
  var s = calcSummary(patIdx);
  var TotalFloor = s.TotalFloor;
  var openStart = getOpenStart(patIdx);
  var openEnd   = getOpenEnd();
  var minFloor  = BUSINESS_RULES.coverage.normal.totalFloor; // 4
  var ok = 0, total = 0;
  var badSlots = [];
  for (var i = openStart; i <= openEnd; i++) {
    total++;
    if (TotalFloor[i] >= minFloor) ok++;
    else badSlots.push(i);
  }
  var pct = total > 0 ? Math.round(ok / total * 100) : 100;
  var status = pct >= 95 ? 'green' : pct >= 80 ? 'amber' : 'red';
  return {
    status: status, value: pct + '%', label: 'Cobertura Floor',
    detail: ok + '/' + total + ' franjas ≥' + minFloor, badSlots: badSlots, type: 'coverage'
  };
}

// ── KPI 2: Coaches simultáneos ────────────────────────────────────────────────
function kpi_coaches(patIdx) {
  var s = calcSummary(patIdx);
  var counts = s.counts;
  var openStart = getOpenStart(patIdx);
  var openEnd   = getOpenEnd();
  var minC = Infinity, sumC = 0, maxC = 0, cnt = 0;
  var badSlots = [];
  for (var i = openStart; i <= openEnd; i++) {
    var v = counts.Coach[i];
    if (v < minC) minC = v;
    if (v > maxC) maxC = v;
    sumC += v; cnt++;
    if (v < 2) badSlots.push(i);
  }
  if (minC === Infinity) minC = 0;
  var avg = cnt > 0 ? (sumC / cnt).toFixed(1) : '0';
  var status = minC >= 2 ? 'green' : minC >= 1 ? 'amber' : 'red';
  return {
    status: status, value: minC + '–' + maxC, label: 'Coach (min–max)',
    detail: 'Media: ' + avg + ' · mín 2', badSlots: badSlots, type: 'coach'
  };
}

// ── KPI 3: Managers en floor ──────────────────────────────────────────────────
function kpi_managers(patIdx) {
  var s = calcSummary(patIdx);
  var MgrsOnFloor = s.MgrsOnFloor;
  var openStart = getOpenStart(patIdx);
  var openEnd   = getOpenEnd();
  var minM = Infinity;
  var badSlots = [];
  for (var i = openStart; i <= openEnd; i++) {
    if (MgrsOnFloor[i] < minM) minM = MgrsOnFloor[i];
    if (MgrsOnFloor[i] < 2) badSlots.push(i);
  }
  if (minM === Infinity) minM = 0;
  var status = minM >= 2 ? 'green' : minM >= 1 ? 'amber' : 'red';
  return {
    status: status, value: minM + ' mín', label: 'Managers Floor',
    detail: 'mín 2 simultáneos', badSlots: badSlots, type: 'managers'
  };
}

// ── KPI 4: Riesgo apertura ────────────────────────────────────────────────────
function kpi_opening(patIdx) {
  var rows = getActiveRows(patIdx);
  var openSlot = patIdx === 3 ? TIME_SLOTS.indexOf('08:00') : TIME_SLOTS.indexOf('07:00');
  var people = rows.filter(function(r) { return r.acts[openSlot] !== ''; }).length;
  var ok = people >= 2;
  var status = ok ? 'green' : 'red';
  return {
    status: status, value: ok ? '✅ OK' : '❌ Riesgo', label: 'Apertura',
    detail: people + ' personas a las ' + TIME_SLOTS[openSlot],
    badSlots: ok ? [] : [openSlot], type: 'opening'
  };
}

// ── KPI 5: Riesgo cierre ──────────────────────────────────────────────────────
function kpi_closing(patIdx) {
  var rows = getActiveRows(patIdx);
  var closeSlot = getOpenEnd();
  var leads = rows.filter(function(r) { return r.role === 'Lead' && r.acts[closeSlot] !== ''; }).length;
  var mgrs  = rows.filter(function(r) { return r.role === 'Manager' && r.acts[closeSlot] !== ''; }).length;
  var minLeads = BUSINESS_RULES.closing.minLeads;    // 2
  var minMgrs  = BUSINESS_RULES.closing.minManagers; // 1
  var ok = leads >= minLeads && mgrs >= minMgrs;
  var status = ok ? 'green' : (leads + mgrs >= 2 ? 'amber' : 'red');
  return {
    status: status, value: ok ? '✅ OK' : '❌ Riesgo', label: 'Cierre',
    detail: leads + 'L + ' + mgrs + 'M a las ' + TIME_SLOTS[closeSlot],
    badSlots: ok ? [] : [closeSlot], type: 'closing'
  };
}

// ── KPI 6: Balance horas floor vs gestión ────────────────────────────────────
function kpi_hoursBalance(patIdx) {
  var rows = getActiveRows(patIdx);
  var isSat = patIdx === 3;
  var BR = BUSINESS_RULES;
  var ok = 0;
  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri];
    var h = calcPersonHours(row);
    var matches = false;
    if (row.role === 'Manager') {
      var tgt = isSat ? BR.saturday.manager : BR.weekday.manager;
      var floorH = h.coach + h.support;
      var mgmtH  = h.aor;
      matches = Math.abs(floorH - tgt.floorHours) <= 0.5 && Math.abs(mgmtH - tgt.aorHours) <= 0.5;
    } else {
      var tgtL = isSat ? BR.saturday.lead : BR.weekday.lead;
      var floorHL = h.ldSup;
      var mgmtHL  = h.ldops;
      var ldopsTarget = tgtL.ldopsHours !== undefined ? tgtL.ldopsHours : 3;
      matches = Math.abs(floorHL - tgtL.floorHours) <= 0.5 && Math.abs(mgmtHL - ldopsTarget) <= 0.5;
    }
    if (matches) ok++;
  }
  var pct = rows.length > 0 ? Math.round(ok / rows.length * 100) : 100;
  var status = pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red';
  return {
    status: status, value: pct + '%', label: 'Balance Horas',
    detail: ok + '/' + rows.length + ' personas OK', badSlots: [], type: 'balance'
  };
}

// ── Build KPI cards HTML ──────────────────────────────────────────────────────
function buildKPICards(patIdx) {
  var kpis = [
    kpi_coverageFloor(patIdx),
    kpi_coaches(patIdx),
    kpi_managers(patIdx),
    kpi_opening(patIdx),
    kpi_closing(patIdx),
    kpi_hoursBalance(patIdx),
  ];

  var h = '<div class="kpi-cards-row" role="list">';
  for (var ki = 0; ki < kpis.length; ki++) {
    var kpi = kpis[ki];
    var cls = 'kpi-card ' + kpiStatusClass(kpi.status);
    var clickable = kpi.badSlots && kpi.badSlots.length > 0;
    var onclick = clickable ? 'kpiScrollToProblematic(\'' + kpi.type + '\',' + patIdx + ')' : '';
    if (clickable) cls += ' kpi-clickable';
    h += '<div class="' + cls + '" role="listitem"' +
      (clickable ? ' onclick="' + onclick + '" tabindex="0" onkeydown="if(event.key===\'Enter\'){' + onclick + '}"' : '') +
      ' title="' + escAttr(kpi.detail) + '"' +
      ' aria-label="' + escAttr(kpi.label + ': ' + kpi.value + '. ' + kpi.detail) + '">' +
      '<div class="kpi-status-icon">' + kpiIcon(kpi.status) + '</div>' +
      '<div class="kpi-value">' + esc(kpi.value) + '</div>' +
      '<div class="kpi-label">' + esc(kpi.label) + '</div>' +
      '<div class="kpi-detail">' + esc(kpi.detail) + '</div>' +
      (clickable ? '<div class="kpi-hint">Clic para ver ▼</div>' : '') +
      '</div>';
  }
  h += '</div>';
  return h;
}

// ── Scroll + highlight problematic slots ─────────────────────────────────────
function kpiScrollToProblematic(type, patIdx) {
  var badSlots = [];
  var s = calcSummary(patIdx);
  var openStart = getOpenStart(patIdx);
  var openEnd   = getOpenEnd();

  if (type === 'coverage') {
    var minFloor = BUSINESS_RULES.coverage.normal.totalFloor;
    for (var i = openStart; i <= openEnd; i++) { if (s.TotalFloor[i] < minFloor) badSlots.push(i); }
  } else if (type === 'coach') {
    for (var i = openStart; i <= openEnd; i++) { if (s.counts.Coach[i] < 2) badSlots.push(i); }
  } else if (type === 'managers') {
    for (var i = openStart; i <= openEnd; i++) { if (s.MgrsOnFloor[i] < 2) badSlots.push(i); }
  } else if (type === 'opening') {
    badSlots = [patIdx === 3 ? TIME_SLOTS.indexOf('08:00') : TIME_SLOTS.indexOf('07:00')];
  } else if (type === 'closing') {
    badSlots = [getOpenEnd()];
  }

  if (badSlots.length === 0) return;

  var schedTable = document.getElementById('sched-table');
  if (schedTable) schedTable.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(function() {
    document.querySelectorAll('.kpi-highlight').forEach(function(el) { el.classList.remove('kpi-highlight'); });
    badSlots.forEach(function(slotIdx) {
      document.querySelectorAll('td.act-cell[data-col="' + slotIdx + '"]').forEach(function(td) {
        td.classList.add('kpi-highlight');
      });
    });
    setTimeout(function() {
      document.querySelectorAll('.kpi-highlight').forEach(function(el) { el.classList.remove('kpi-highlight'); });
    }, 3000);
  }, 400);
}

// ── Coverage Heatmap SVG ──────────────────────────────────────────────────────
function buildCoverageHeatmap(patIdx) {
  var s = calcSummary(patIdx);
  var counts = s.counts;
  var TotalFloor = s.TotalFloor;
  var MgrsOnFloor = s.MgrsOnFloor;
  var openStart = getOpenStart(patIdx);
  var openEnd   = getOpenEnd();
  var n         = TIME_SLOTS.length;

  var Support = s.TotalSupport;

  // Rows: [label, dataArray, greenThreshold, amberThreshold]
  var rows = [
    { label: 'Total Floor', data: TotalFloor, green: 6, amber: 4 },
    { label: 'Support',     data: Support,    green: 3, amber: 2 },
    { label: 'Coach',       data: counts.Coach, green: 3, amber: 2 },
    { label: 'Managers',    data: MgrsOnFloor,  green: 3, amber: 2 },
    { label: 'Leads',       data: counts.LDSup, green: 2, amber: 1 },
  ];

  var CW = 20, CH = 22, GAP = 1;
  var LABEL_W = 82;
  var totalW = LABEL_W + n * (CW + GAP) + 2;
  var totalH = rows.length * (CH + GAP) + 28;

  var openLineX  = LABEL_W + openStart * (CW + GAP);
  var closeLineX = LABEL_W + (openEnd + 1) * (CW + GAP);
  var linesH     = rows.length * (CH + GAP);

  var svg = '<svg class="heatmap-svg" viewBox="0 0 ' + totalW + ' ' + totalH + '"' +
    ' xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Heatmap de cobertura por franja horaria">';

  // Vertical lines: store open/close
  svg += '<line x1="' + openLineX + '" y1="0" x2="' + openLineX + '" y2="' + linesH + '" class="hm-open-line" stroke-width="2" stroke-dasharray="4,3"/>';
  svg += '<line x1="' + closeLineX + '" y1="0" x2="' + closeLineX + '" y2="' + linesH + '" class="hm-close-line" stroke-width="2" stroke-dasharray="4,3"/>';

  // X-axis labels — only full hours & notable slots
  for (var i = 0; i < n; i++) {
    var t = TIME_SLOTS[i];
    if (t.slice(3) === '00') { // full hour
      var x = LABEL_W + i * (CW + GAP) + CW / 2;
      svg += '<text x="' + x + '" y="' + (totalH - 2) + '" text-anchor="middle" class="hm-time-label">' + esc(t) + '</text>';
    }
  }

  // Row labels + cells
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var y = r * (CH + GAP);

    svg += '<text x="' + (LABEL_W - 4) + '" y="' + (y + CH / 2 + 4) + '"' +
      ' text-anchor="end" class="hm-row-label">' + esc(row.label) + '</text>';

    for (var ci = 0; ci < n; ci++) {
      var v = row.data[ci];
      var cx = LABEL_W + ci * (CW + GAP);
      var isOpen = (ci >= openStart && ci <= openEnd);
      var fillCls;

      if (!isOpen) {
        fillCls = 'hm-out';
      } else if (v >= row.green) {
        fillCls = 'hm-green';
      } else if (v >= row.amber) {
        fillCls = 'hm-amber';
      } else {
        fillCls = 'hm-red';
      }

      var tipText = isOpen ? (esc(row.label) + ' ' + esc(TIME_SLOTS[ci]) + ': ' + v) : '';
      svg += '<rect x="' + cx + '" y="' + y + '" width="' + CW + '" height="' + CH + '"' +
        ' rx="2" class="' + fillCls + '"' +
        (tipText ? ' data-hm-tip="' + escAttr(tipText) + '"' : '') +
        ' onmouseenter="showHeatmapTip(event,this)" onmouseleave="hideHeatmapTip()"/>';

      if (isOpen && v > 0) {
        svg += '<text x="' + (cx + CW / 2) + '" y="' + (y + CH / 2 + 4) + '"' +
          ' text-anchor="middle" class="hm-cell-val">' + v + '</text>';
      }
    }
  }

  svg += '</svg>';

  var toggleId = 'heatmap-body-' + patIdx;
  return '<div class="kpi-heatmap-wrap">' +
    '<div class="kpi-heatmap-header">' +
      '<h3>🌡️ Heatmap de Cobertura</h3>' +
      '<button class="kpi-hm-toggle-btn" onclick="toggleHeatmap(\'' + toggleId + '\',this)" aria-expanded="true">Ocultar ▴</button>' +
    '</div>' +
    '<div id="' + toggleId + '" class="heatmap-body">' +
      '<div class="heatmap-scroll">' + svg + '</div>' +
      '<div class="heatmap-legend">' +
        '<span class="hm-leg"><span class="hm-swatch hm-green"></span>Cumple objetivo</span>' +
        '<span class="hm-leg"><span class="hm-swatch hm-amber"></span>En límite mínimo</span>' +
        '<span class="hm-leg"><span class="hm-swatch hm-red"></span>Por debajo</span>' +
        '<span class="hm-leg"><span class="hm-swatch hm-out"></span>Fuera de apertura</span>' +
        '<span class="hm-leg hm-open-leg">▎ Apertura/Cierre tienda</span>' +
      '</div>' +
    '</div>' +
    '<div id="hm-tooltip" class="hm-tooltip" aria-hidden="true"></div>' +
  '</div>';
}

function toggleHeatmap(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var hidden = el.classList.toggle('heatmap-hidden');
  btn.textContent = hidden ? 'Mostrar ▾' : 'Ocultar ▴';
  btn.setAttribute('aria-expanded', String(!hidden));
}

function showHeatmapTip(e, el) {
  var tip = document.getElementById('hm-tooltip');
  if (!tip || !el.dataset.hmTip) return;
  tip.textContent = el.dataset.hmTip;
  tip.style.left = (e.clientX + 14) + 'px';
  tip.style.top  = (e.clientY + 14) + 'px';
  tip.classList.add('hm-tooltip-visible');
}

function hideHeatmapTip() {
  var tip = document.getElementById('hm-tooltip');
  if (tip) tip.classList.remove('hm-tooltip-visible');
}
