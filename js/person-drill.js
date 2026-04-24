// ═══════════════════════════════════════════════════════════════════════════════
// Feature 2 — Drill-down por persona
// ═══════════════════════════════════════════════════════════════════════════════
// Depends on globals from app.js: currentState, TIME_SLOTS, COLORS, BUSINESS_RULES,
// calcPersonHours, esc, escAttr, shiftIndices, getOpenStart, teamData

function openPersonDrilldown(patIdx, rowIdx) {
  var row = currentState[patIdx][rowIdx];
  if (!row) return;

  var overlay = document.getElementById('modal-person-drill');
  if (!overlay) return;

  overlay.querySelector('.person-drill-body').innerHTML = buildDrilldownContent(patIdx, rowIdx, row);
  overlay.classList.add('open');

  // Focus first focusable element
  var firstBtn = overlay.querySelector('button');
  if (firstBtn) firstBtn.focus();
}

function closePersonDrilldown() {
  var overlay = document.getElementById('modal-person-drill');
  if (overlay) overlay.classList.remove('open');
}

// ── Build full modal content ──────────────────────────────────────────────────
function buildDrilldownContent(patIdx, rowIdx, row) {
  var isLead = row.role === 'Lead';
  var isSat  = patIdx === 3;
  var BR     = BUSINESS_RULES;

  // Resolve assigned name
  var displayName = row.role;
  if (row.assignedId) {
    var members = isLead ? teamData.leads : teamData.managers;
    var member = members.find(function(m) { return m.id === row.assignedId; });
    if (member) displayName = member.name || member.shortName || row.role;
  }

  var h = '';

  // ── Header ──
  var roleLabel = isLead ? 'Lead' : 'Manager';
  var roleColor = isLead ? 'var(--lead-text)' : 'var(--mgr-text)';
  h += '<div class="pd-header">';
  h += '<div class="pd-name">' + esc(displayName) + '</div>';
  h += '<div class="pd-meta">';
  h += '<span class="pd-role-badge" style="background:' + (isLead ? 'var(--lead-bg)' : 'var(--mgr-bg)') + ';color:' + roleColor + '">' + roleLabel + '</span>';
  h += '<span class="pd-shift">' + esc(row.shift) + '</span>';
  h += '</div>';
  h += '</div>';

  // ── Mini timeline ──
  h += buildDrillTimeline(row);

  // ── Hours summary ──
  h += buildDrillHoursSummary(row, isSat, isLead, BR);

  // ── Individual validations ──
  h += buildDrillValidations(patIdx, rowIdx, row, BR);

  return h;
}

// ── Mini timeline (horizontal colored bar) ────────────────────────────────────
function buildDrillTimeline(row) {
  var si_ei = shiftIndices(row.shift);
  var si = si_ei[0], ei = si_ei[1];
  var n  = TIME_SLOTS.length;

  var h = '<div class="pd-section">';
  h += '<div class="pd-section-title">⏱️ Timeline del día</div>';
  h += '<div class="pd-timeline-wrap">';

  // One cell per slot in the shift
  var totalSlots = ei - si;
  if (totalSlots <= 0) {
    h += '<span style="color:var(--text-muted);font-size:.8rem">Sin datos</span>';
  } else {
    h += '<div class="pd-timeline">';
    for (var c = si; c < ei; c++) {
      var act = row.acts[c] || '';
      var bg  = COLORS.hasOwnProperty(act) ? COLORS[act] : '#eee';
      var pct = (1 / totalSlots * 100).toFixed(2);
      var title = TIME_SLOTS[c] + ': ' + (act || '—');
      h += '<div class="pd-tl-block" style="background:' + bg + ';width:' + pct + '%"' +
        ' title="' + escAttr(title) + '" aria-label="' + escAttr(title) + '"></div>';
    }
    h += '</div>';

    // Time labels below
    h += '<div class="pd-tl-labels">';
    h += '<span>' + esc(TIME_SLOTS[si]) + '</span>';
    var mid = Math.floor((si + ei) / 2);
    h += '<span>' + esc(TIME_SLOTS[mid]) + '</span>';
    h += '<span>' + esc(TIME_SLOTS[Math.min(ei, n - 1)]) + '</span>';
    h += '</div>';

    // Activity legend for this person
    var acts = {};
    for (var c2 = si; c2 < ei; c2++) {
      var a = row.acts[c2] || '';
      if (a) acts[a] = (acts[a] || 0) + 1;
    }
    h += '<div class="pd-tl-legend">';
    Object.keys(acts).forEach(function(act) {
      var bg2 = COLORS.hasOwnProperty(act) ? COLORS[act] : '#eee';
      h += '<span class="pd-tl-leg-item"><span class="pd-tl-swatch" style="background:' + bg2 + '"></span>' + esc(act) + ' (' + (acts[act] * 0.5).toFixed(1) + 'h)</span>';
    });
    h += '</div>';
  }
  h += '</div></div>';
  return h;
}

// ── Hours summary vs target ───────────────────────────────────────────────────
function buildDrillHoursSummary(row, isSat, isLead, BR) {
  var h_obj = calcPersonHours(row);

  var h = '<div class="pd-section">';
  h += '<div class="pd-section-title">⏰ Resumen de horas</div>';
  h += '<div class="pd-hours-grid">';

  if (isLead) {
    var tgt = isSat ? BR.saturday.lead : BR.weekday.lead;
    var ldopsTarget = tgt.ldopsHours !== undefined ? tgt.ldopsHours : 3;
    var floorOk   = Math.abs(h_obj.ldSup - tgt.floorHours) <= 0.5;
    var ldopsOk   = Math.abs(h_obj.ldops - ldopsTarget) <= 0.5;
    var lunchOk   = h_obj.lunch >= 0.5;

    h += drillHourRow('LDSup (floor)', h_obj.ldSup, tgt.floorHours, floorOk);
    h += drillHourRow('LDOPS (gestión)', h_obj.ldops, ldopsTarget, ldopsOk);
    h += drillHourRow('Lunch', h_obj.lunch, 1, lunchOk);
    var totalH = h_obj.ldSup + h_obj.ldops + h_obj.lunch + h_obj.coach + h_obj.support;
    h += drillHourRow('Total turno', totalH, 8, totalH >= 7.5 && totalH <= 9.5);
  } else {
    var tgtM = isSat ? BR.saturday.manager : BR.weekday.manager;
    var floorHours = h_obj.coach + h_obj.support;
    var floorOkM   = Math.abs(floorHours - tgtM.floorHours) <= 0.5;
    var aorOkM     = Math.abs(h_obj.aor - tgtM.aorHours) <= 0.5;
    var lunchOkM   = h_obj.lunch >= 0.5;
    var floorRole  = h_obj.coach > 0 ? 'Coach' : (h_obj.support > 0 ? 'Support' : '—');

    h += drillHourRow('Floor (' + floorRole + ')', floorHours, tgtM.floorHours, floorOkM);
    if (h_obj.coach > 0 && h_obj.support > 0) {
      h += '<div class="pd-hour-row pd-hour-warn">⚠️ Mezcla Coach+Support</div>';
    }
    h += drillHourRow('AOR (gestión)', h_obj.aor, tgtM.aorHours, aorOkM);
    h += drillHourRow('Lunch', h_obj.lunch, 1, lunchOkM);
    var totalHM = floorHours + h_obj.aor + h_obj.lunch;
    h += drillHourRow('Total turno', totalHM, 8, totalHM >= 7.5 && totalHM <= 9.5);
  }

  h += '</div></div>';
  return h;
}

function drillHourRow(label, actual, target, ok) {
  var icon  = ok ? '✅' : '❌';
  var color = ok ? 'var(--green)' : 'var(--red)';
  return '<div class="pd-hour-row">' +
    '<span class="pd-hour-label">' + esc(label) + '</span>' +
    '<span class="pd-hour-actual" style="color:' + color + '">' + actual.toFixed(1) + 'h</span>' +
    '<span class="pd-hour-target">/ ' + target + 'h</span>' +
    '<span class="pd-hour-icon">' + icon + '</span>' +
    '</div>';
}

// ── Individual validations ────────────────────────────────────────────────────
function buildDrillValidations(patIdx, rowIdx, row, BR) {
  var si_ei = shiftIndices(row.shift);
  var si = si_ei[0], ei = si_ei[1];
  var n = TIME_SLOTS.length;
  var checks = [];

  // 1. Lunch within window 11:00-17:00
  var lunchWinStart = TIME_SLOTS.indexOf(BR.lunch.windowStart);
  var lunchWinEnd   = TIME_SLOTS.indexOf(BR.lunch.windowEnd);
  var lunchSlots = [];
  for (var c = si; c < ei; c++) { if (row.acts[c] === 'Lunch') lunchSlots.push(c); }

  if (lunchSlots.length === 0) {
    checks.push({ ok: false, text: 'Sin Lunch asignado' });
  } else {
    var firstLunch = Math.min.apply(null, lunchSlots);
    var lunchInWindow = firstLunch >= lunchWinStart && firstLunch <= lunchWinEnd;
    checks.push({ ok: lunchInWindow, text: 'Lunch en ventana ' + BR.lunch.windowStart + '-' + BR.lunch.windowEnd +
      ' (inicia ' + TIME_SLOTS[firstLunch] + ')' });
  }

  // 2. Floor blocks ≥ 2h (= 4 consecutive slots)
  var isLead = row.role === 'Lead';
  var floorActs = isLead ? ['LDSup'] : ['Coach', 'Support'];
  var maxBlock = 0, curBlock = 0;
  for (var c2 = si; c2 < ei; c2++) {
    if (floorActs.indexOf(row.acts[c2]) >= 0) { curBlock++; if (curBlock > maxBlock) maxBlock = curBlock; }
    else curBlock = 0;
  }
  var blockOk = maxBlock >= BR.blocks.minFloorBlockSlots; // 4 slots = 2h
  checks.push({ ok: blockOk, text: 'Bloque floor ≥ 2h seguidas (máx: ' + (maxBlock * 0.5).toFixed(1) + 'h)' });

  // 3. AOR/LDOPS in max 2 blocks
  var mgmtAct = isLead ? 'LDOPS' : 'AOR';
  var mgmtBlocks = 0, inMgmtBlock = false;
  for (var c3 = si; c3 < ei; c3++) {
    var isMgmt = row.acts[c3] === mgmtAct;
    if (isMgmt && !inMgmtBlock) { mgmtBlocks++; inMgmtBlock = true; }
    else if (!isMgmt) { inMgmtBlock = false; }
  }
  var mgmtOk = mgmtBlocks <= BR.blocks.maxAorBlocks; // 2
  checks.push({ ok: mgmtOk, text: mgmtAct + ' en máx ' + BR.blocks.maxAorBlocks + ' bloques (' + mgmtBlocks + ' detectado' + (mgmtBlocks !== 1 ? 's' : '') + ')' });

  // 4. DD at 09:15 if morning shift
  var ddSlot = TIME_SLOTS.indexOf('09:15');
  if (si <= ddSlot && ddSlot < ei) {
    var hasDDSlot = row.acts[ddSlot] === 'DD';
    checks.push({ ok: hasDDSlot, text: 'DD a las 09:15 ' + (hasDDSlot ? 'asignado' : 'NO asignado') });
  }

  // 5. If starts before 09:15, activity before opening should be LDOPS/AOR/DD
  var openStoreSlot = TIME_SLOTS.indexOf('09:30');
  if (si < openStoreSlot) {
    var preOpenOk = true;
    for (var c4 = si; c4 < Math.min(openStoreSlot, ei); c4++) {
      var a = row.acts[c4];
      if (a && a !== 'LDOPS' && a !== 'AOR' && a !== 'DD' && a !== '') {
        preOpenOk = false; break;
      }
    }
    checks.push({ ok: preOpenOk, text: 'Pre-apertura en LDOPS/AOR/DD ' + (preOpenOk ? 'correcto' : 'revisar') });
  }

  // 6. Manager: no mixing Coach + Support
  if (!isLead) {
    var hasCoach = false, hasSupport = false;
    for (var c5 = si; c5 < ei; c5++) {
      if (row.acts[c5] === 'Coach') hasCoach = true;
      if (row.acts[c5] === 'Support') hasSupport = true;
    }
    var noMix = !(hasCoach && hasSupport);
    checks.push({ ok: noMix, text: 'Manager no mezcla Coach+Support ' + (noMix ? '✓' : '✗') });
  }

  var h = '<div class="pd-section">';
  h += '<div class="pd-section-title">🔍 Validaciones individuales</div>';
  h += '<ul class="pd-checks">';
  checks.forEach(function(chk) {
    h += '<li class="pd-check-item' + (chk.ok ? '' : ' pd-check-fail') + '">' +
      (chk.ok ? '✅' : '❌') + ' ' + esc(chk.text) + '</li>';
  });
  h += '</ul></div>';
  return h;
}
