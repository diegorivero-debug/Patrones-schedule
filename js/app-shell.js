/**
 * app-shell.js — Sidebar toggle with localStorage persistence + tooltips
 *
 * Behaviour:
 *  - Reads initial state from localStorage (key: "ui_sidebar")
 *  - Toggles the class "sidebar-collapsed" on #app-sidebar
 *  - Persists state on every toggle
 *  - Shows a fixed-position tooltip on sidebar links when collapsed
 *  - Works with any page that includes the App Shell markup
 *
 * New files added in this phase:
 *  - css/ui-tokens.css   — CSS design tokens (spacing, sidebar sizes, colours)
 *  - css/app-shell.css   — Sidebar + topbar layout styles
 *  - js/app-shell.js     — This file: toggle logic + tooltip
 */

(function () {
  'use strict';

  var LS_KEY     = 'ui_sidebar';     /* 'collapsed' | 'expanded'  */
  var SIDEBAR_ID = 'app-sidebar';
  var TOGGLE_ID  = 'sidebar-toggle';

  /* ── Helpers ──────────────────────────────────────────── */
  function getSidebar()  { return document.getElementById(SIDEBAR_ID); }
  function getToggleBtn(){ return document.getElementById(TOGGLE_ID);  }

  function isCollapsed() {
    var el = getSidebar();
    return el ? el.classList.contains('sidebar-collapsed') : false;
  }

  function setCollapsed(collapsed) {
    var el  = getSidebar();
    var btn = getToggleBtn();
    if (!el) return;

    if (collapsed) {
      el.classList.add('sidebar-collapsed');
    } else {
      el.classList.remove('sidebar-collapsed');
    }

    /* Update toggle button aria + label */
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('title', collapsed ? 'Expandir menú' : 'Colapsar menú');
      btn.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Colapsar menú');
    }

    /* Persist */
    try {
      localStorage.setItem(LS_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch (e) { /* storage quota / private mode */ }
  }

  function toggleSidebar() {
    setCollapsed(!isCollapsed());
  }

  /* ── Tooltip (for collapsed sidebar) ────────────────── */
  var tooltipEl = null;
  var tooltipTimer = null;

  function getTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'sidebar-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function showTooltip(link, text) {
    clearTimeout(tooltipTimer);
    var tt = getTooltip();
    var rect = link.getBoundingClientRect();
    tt.textContent = text;
    tt.style.top  = Math.round(rect.top + rect.height / 2) + 'px';
    tt.style.left = Math.round(rect.right + 10) + 'px';
    tt.style.transform = 'translateY(-50%)';
    tt.classList.add('visible');
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(function () {
      if (tooltipEl) tooltipEl.classList.remove('visible');
    }, 80);
  }

  function initTooltips() {
    var sidebar = getSidebar();
    if (!sidebar) return;

    sidebar.addEventListener('mouseover', function (e) {
      if (!isCollapsed()) return;
      var link = e.target.closest('.sidebar-link');
      if (!link) return;
      var label = link.getAttribute('data-tooltip') || link.getAttribute('title') || '';
      if (label) showTooltip(link, label);
    });

    sidebar.addEventListener('mouseout', function (e) {
      if (!isCollapsed()) return;
      var link = e.target.closest('.sidebar-link');
      if (!link) return;
      hideTooltip();
    });
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    /* Restore persisted state BEFORE first paint (DOMContentLoaded) */
    var saved;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) {}

    /* Default: expanded */
    var startCollapsed = (saved === 'collapsed');
    setCollapsed(startCollapsed);

    /* Wire toggle button */
    var btn = getToggleBtn();
    if (btn) {
      btn.addEventListener('click', toggleSidebar);
    }

    /* Wire tooltips */
    initTooltips();
  }

  /* Run on DOMContentLoaded so the sidebar element exists */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
