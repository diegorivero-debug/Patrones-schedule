// ═══════════════════════════════════════════════════════════════════════════════
// Command Palette — ⌘K / Ctrl+K
// Works on all pages. Page-specific commands are filtered by location.pathname.
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────────
  var isOpen         = false;
  var selectedIdx    = -1;
  var filteredCmds   = [];
  var overlayEl      = null;
  var inputEl        = null;
  var listEl         = null;

  // Detect current page
  var pagePath = (location.pathname || '').toLowerCase();
  function onPage(name) { return pagePath.indexOf(name) !== -1; }
  var isDashboard = onPage('dashboard');

  // ── Navigation commands ──────────────────────────────────────────────────────
  var NAV_COMMANDS = [
    { id: 'nav-dashboard',    icon: '📊', label: 'Ir a Dashboard',           action: function() { go('dashboard.html'); } },
    { id: 'nav-auditor',      icon: '🔍', label: 'Ir a Auditor',             action: function() { go('auditor.html'); } },
    { id: 'nav-equipo',       icon: '👥', label: 'Ir a Equipo',              action: function() { go('equipo.html'); } },
    { id: 'nav-vacaciones',   icon: '🌴', label: 'Ir a Vacaciones',          action: function() { go('vacaciones.html'); } },
    { id: 'nav-planificador', icon: '📅', label: 'Ir a Planificador 13W',    action: function() { go('planificador-13w.html'); } },
    { id: 'nav-equity',       icon: '⚖️', label: 'Ir a Equidad',             action: function() { go('equity.html'); } },
    { id: 'nav-ajustes',      icon: '⚙️', label: 'Ir a Ajustes',             action: function() { go('ajustes.html'); } },
    { id: 'nav-inicio',       icon: '🏠', label: 'Ir a Inicio',              action: function() { go('index.html'); } },
  ];

  // ── Dashboard-specific pattern navigation commands ───────────────────────────
  var PATTERN_COMMANDS = [
    { id: 'pat-0',      icon: '📋', label: 'Patrón: Día Normal',        action: function() { switchTab('0'); } },
    { id: 'pat-1',      icon: '📋', label: 'Patrón: Martes',            action: function() { switchTab('1'); } },
    { id: 'pat-2',      icon: '📋', label: 'Patrón: Miércoles',         action: function() { switchTab('2'); } },
    { id: 'pat-3',      icon: '📋', label: 'Patrón: Sábado',            action: function() { switchTab('3'); } },
    { id: 'pat-week',   icon: '📅', label: 'Vista: Semana',             action: function() { switchTab('week'); } },
    { id: 'pat-equity', icon: '⚖️', label: 'Vista: Equidad Managers',   action: function() { switchTab('equity'); } },
    { id: 'pat-real',   icon: '📂', label: 'Vista: Día Real',           action: function() { switchTab('real'); } },
    { id: 'pat-planner',icon: '📋', label: 'Vista: Planificar',         action: function() { switchTab('planner'); } },
  ];

  // ── Dashboard action commands ─────────────────────────────────────────────────
  var ACTION_COMMANDS = [
    { id: 'act-theme',    icon: '🌓', label: 'Cambiar tema (claro/oscuro)',  action: function() { callIfExists('toggleTheme'); } },
    { id: 'act-verano',   icon: '☀️', label: 'Temporada: Verano',            action: function() { callIfExists('switchSeason', 'verano'); } },
    { id: 'act-invierno', icon: '❄️', label: 'Temporada: Invierno',          action: function() { callIfExists('switchSeason', 'invierno'); } },
    { id: 'act-add',      icon: '➕', label: 'Añadir Figura',               action: function() { callIfExists('openAddFigure'); } },
    { id: 'act-gen',      icon: '⚙️', label: 'Generar Patrón',              action: function() { callIfExists('openGenerate'); } },
    { id: 'act-whatif',   icon: '🔮', label: 'Activar/Desactivar What-if',   action: function() { callIfExists('toggleWhatif'); } },
    { id: 'act-rules',    icon: '📋', label: 'Abrir Reglas',                 action: function() { callIfExists('openRules'); } },
    { id: 'act-ai',       icon: '🤖', label: 'Abrir IA Advisor',             action: function() { callIfExists('openAIPanel'); } },
    { id: 'act-reset',    icon: '🔄', label: 'Resetear patrón',              action: function() { callIfExists('resetPattern'); } },
    { id: 'act-export',   icon: '⬇️', label: 'Exportar CSV',                 action: function() { callIfExists('exportCSV'); } },
    { id: 'act-print',    icon: '🖨️', label: 'Imprimir',                     action: function() { window.print(); } },
    { id: 'act-undo',     icon: '↩️', label: 'Deshacer',                     action: function() { callIfExists('undo'); } },
    { id: 'act-redo',     icon: '↪️', label: 'Rehacer',                      action: function() { callIfExists('redo'); } },
  ];

  // ── Build the command list (base, not including person search) ────────────────
  function buildBaseCommands() {
    var cmds = NAV_COMMANDS.slice();
    if (isDashboard) {
      cmds = cmds.concat(PATTERN_COMMANDS).concat(ACTION_COMMANDS);
    }
    return cmds;
  }

  // ── Get team members from app.js globals (dashboard only) ────────────────────
  function getTeamMembers() {
    if (!isDashboard) return [];
    var members = [];
    try {
      var td = window.teamData;
      if (!td) return [];
      (td.leads || []).forEach(function(m) {
        members.push({ id: m.id, name: m.name || m.shortName, role: 'Lead' });
      });
      (td.managers || []).forEach(function(m) {
        members.push({ id: m.id, name: m.name || m.shortName, role: 'Manager' });
      });
    } catch(e) {}
    return members;
  }

  // ── Fuzzy/substring filter ────────────────────────────────────────────────────
  function matches(query, label) {
    if (!query) return true;
    var q  = query.toLowerCase();
    var l  = label.toLowerCase();
    // Simple substring match
    if (l.indexOf(q) !== -1) return true;
    // Token match: all query tokens must appear somewhere in label
    var tokens = q.split(/\s+/);
    return tokens.every(function(t) { return l.indexOf(t) !== -1; });
  }

  // ── Filter commands by query ──────────────────────────────────────────────────
  function filterCommands(query) {
    var base = buildBaseCommands();
    var results = base.filter(function(c) { return matches(query, c.label); });

    // Dynamic person search (only when query is non-empty)
    if (query && isDashboard) {
      var members = getTeamMembers();
      members.forEach(function(m) {
        if (!m.name) return;
        if (matches(query, m.name) || matches(query, m.role)) {
          results.push({
            id: 'person-' + m.id,
            icon: m.role === 'Lead' ? '👤' : '👔',
            label: 'Ver drill-down: ' + m.name + ' (' + m.role + ')',
            action: (function(member) {
              return function() { openDrilldownForMember(member); };
            })(m),
          });
        }
      });
    }

    return results;
  }

  // ── Open person drill-down by member id ──────────────────────────────────────
  function openDrilldownForMember(member) {
    if (typeof window.activePattern === 'undefined' || typeof window.currentState === 'undefined') return;
    var patIdx = window.activePattern;
    var rows   = window.currentState[patIdx] || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].assignedId === member.id) {
        if (typeof window.openPersonDrilldown === 'function') {
          window.openPersonDrilldown(patIdx, i);
        }
        return;
      }
    }
    // If not found in active pattern, try all patterns
    for (var p = 0; p < 5; p++) {
      var prows = window.currentState[p] || [];
      for (var r = 0; r < prows.length; r++) {
        if (prows[r].assignedId === member.id) {
          if (typeof window.openPersonDrilldown === 'function') {
            window.openPersonDrilldown(p, r);
          }
          return;
        }
      }
    }
  }

  // ── Switch tab in dashboard ───────────────────────────────────────────────────
  function switchTab(pat) {
    var btn = document.querySelector('.tab-btn[data-pat="' + pat + '"]');
    if (btn) btn.click();
  }

  // ── Navigate helper ───────────────────────────────────────────────────────────
  function go(url) {
    window.location.href = url;
  }

  // ── Safe function caller ──────────────────────────────────────────────────────
  function callIfExists(fnName, arg) {
    if (typeof window[fnName] === 'function') {
      if (arg !== undefined) window[fnName](arg);
      else window[fnName]();
    }
  }

  // ── Render the palette list ───────────────────────────────────────────────────
  function render(query) {
    filteredCmds = filterCommands(query || '');
    if (selectedIdx >= filteredCmds.length) selectedIdx = filteredCmds.length - 1;
    if (selectedIdx < 0 && filteredCmds.length > 0) selectedIdx = 0;

    var html = '';
    if (filteredCmds.length === 0) {
      html = '<li class="cmd-no-results">Sin resultados para "' + escHtml(query) + '"</li>';
    } else {
      for (var i = 0; i < filteredCmds.length; i++) {
        var c = filteredCmds[i];
        html += '<li class="cmd-item' + (i === selectedIdx ? ' cmd-selected' : '') +
          '" data-idx="' + i + '" role="option" aria-selected="' + (i === selectedIdx) + '">' +
          '<span class="cmd-icon">' + (c.icon || '▸') + '</span>' +
          '<span class="cmd-label">' + escHtml(c.label) + '</span>' +
          '</li>';
      }
    }
    listEl.innerHTML = html;

    // Scroll selected item into view
    var sel = listEl.querySelector('.cmd-selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  // ── HTML escape ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  // ── Execute selected command ──────────────────────────────────────────────────
  function execute(idx) {
    var cmd = filteredCmds[idx];
    if (!cmd) return;
    close();
    setTimeout(function() { cmd.action(); }, 40);
  }

  // ── Open palette ─────────────────────────────────────────────────────────────
  function open() {
    if (isOpen) return;
    isOpen = true;
    buildDOM();
    document.body.appendChild(overlayEl);
    render('');
    requestAnimationFrame(function() {
      overlayEl.classList.add('cmd-visible');
      inputEl.focus();
    });
  }

  // ── Close palette ─────────────────────────────────────────────────────────────
  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (overlayEl) {
      overlayEl.classList.remove('cmd-visible');
      setTimeout(function() {
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null; inputEl = null; listEl = null;
      }, 180);
    }
  }

  // ── Build DOM elements ────────────────────────────────────────────────────────
  function buildDOM() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'cmd-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Paleta de comandos');

    var box = document.createElement('div');
    box.className = 'cmd-box';

    var header = document.createElement('div');
    header.className = 'cmd-header';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'cmd-input';
    inputEl.placeholder = 'Busca un comando, página o persona…';
    inputEl.setAttribute('aria-label', 'Búsqueda de comandos');
    inputEl.setAttribute('aria-controls', 'cmd-list');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');

    var closeBtn = document.createElement('button');
    closeBtn.className = 'cmd-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Cerrar paleta');
    closeBtn.addEventListener('click', close);

    header.appendChild(inputEl);
    header.appendChild(closeBtn);

    listEl = document.createElement('ul');
    listEl.className = 'cmd-list';
    listEl.id = 'cmd-list';
    listEl.setAttribute('role', 'listbox');

    var footer = document.createElement('div');
    footer.className = 'cmd-footer';
    footer.innerHTML = '<span>↑↓ Navegar</span><span>↵ Ejecutar</span><span>Esc Cerrar</span>';

    box.appendChild(header);
    box.appendChild(listEl);
    box.appendChild(footer);
    overlayEl.appendChild(box);

    // Events
    inputEl.addEventListener('input', function() {
      selectedIdx = 0;
      render(this.value);
    });

    inputEl.addEventListener('keydown', handleKeydown);

    listEl.addEventListener('click', function(e) {
      var li = e.target.closest('li.cmd-item');
      if (!li) return;
      var idx = parseInt(li.dataset.idx, 10);
      if (!isNaN(idx)) execute(idx);
    });

    listEl.addEventListener('mousemove', function(e) {
      var li = e.target.closest('li.cmd-item');
      if (!li) return;
      var idx = parseInt(li.dataset.idx, 10);
      if (!isNaN(idx) && idx !== selectedIdx) {
        selectedIdx = idx;
        render(inputEl.value);
      }
    });

    overlayEl.addEventListener('mousedown', function(e) {
      if (e.target === overlayEl) close();
    });

    // Focus trap: keep focus inside the palette
    overlayEl.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        inputEl.focus();
      }
    });
  }

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  function handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, filteredCmds.length - 1);
        render(inputEl.value);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        render(inputEl.value);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIdx >= 0) execute(selectedIdx);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  }

  // ── Global keyboard shortcut ──────────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    var isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && e.key === 'k') {
      e.preventDefault();
      if (isOpen) close();
      else open();
    }
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // ── Inject nav button ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    // Add ⌘K button to site-nav (or header-controls if on dashboard)
    var nav = document.querySelector('.site-nav');
    if (nav) {
      var btn = document.createElement('button');
      btn.className = 'cmd-nav-btn';
      btn.setAttribute('aria-label', 'Abrir paleta de comandos (Ctrl+K)');
      btn.title = 'Paleta de comandos (Ctrl+K / ⌘K)';
      btn.innerHTML = '🔍 <span class="cmd-kbd">⌘K</span>';
      btn.addEventListener('click', function() {
        if (isOpen) close();
        else open();
      });
      nav.appendChild(btn);
    }
  });

})();
