/* ===== CONFIG.JS — Fuente única de verdad para reglas de negocio ===== */
/* Patrones-schedule · Fase 1 */

(function () {
  'use strict';

  var LS_KEY = 'app_config';

  /* ── Valores por defecto ──────────────────────────────────────────── */
  var DEFAULTS = {
    tienda: {
      apertura: '09:30',
      cierreVerano: '21:30',
      cierreInvierno: '21:00',
      sabadoApertura: '08:00',
      entradaLeadMin: '07:00',
      entradaManagerMin: '08:00'
    },
    patrones: {
      lunch: {
        ventanaDesde: '11:00',
        ventanaHasta: '17:00',
        duracionSlots: 2,
        maxSimultaneo: 3
      },
      cobertura: {
        floorMinimo: 4,
        managersFloorMinimo: 2,
        coachMinimo: 2,
        floorHoraPunta: 6,
        horasPunta: ['12:00-14:00', '17:00-21:00']
      },
      bloques: {
        floorMinimoSlots: 4,
        aorMaxBloques: 2
      },
      reuniones: {
        martes: { hora: '14:00-16:00', tipo: 'comercial', nombre: 'Reunión Comercial' },
        miercoles: { hora: '14:00-16:00', tipo: 'leadership', nombre: 'Leadership Meeting' }
      },
      apertura: { minimoPersonas: 2 },
      cierre: { minimoLeads: 2, minimoManagers: 1 },
      managerRol: { coachDiasPorSemana: [2, 3], supportDiasPorSemana: [2, 3] }
    },
    planificador: {
      maxDiasLaborables: 5,
      smMañanaObligatoria: ['LUN', 'MAR'],
      opsLeadsCruzados: true,
      equidadMañanaTarde: 0.5,
      restriccionesPersonales: {
        jorge:  { fixedMorningDays: ['MON', 'WED'], neverOffDays: ['MON', 'TUE', 'WED'] },
        sheila: { neverOffDays: ['MON', 'TUE', 'WED'] },
        itziar: { neverOffDays: ['MON', 'TUE', 'WED'] },
        cris_c: { morningOnlyWeekdays: true, neverOffDays: ['MON', 'TUE', 'WED'] },
        javi_s: { aorFixedDays: ['MON', 'FRI'], avoidOffDays: ['TUE', 'WED'] },
        ane:    { weekAB: true, avoidOffDays: ['TUE', 'WED'] },
        eva_h:  { morningOnly: true, altWeekend: true, hours32: true },
        eli:    { morningOnly: true, altWeekend: true },
        clara:  { neverOffThursday: true },
        aurora: { crossedWith: 'ruben' },
        ruben:  { crossedWith: 'aurora' }
      }
    },
    alertas: {
      rojo:     ['cobertura_cero', 'apertura', 'cierre', 'mezcla_rol', 'floor_min', 'coach_min'],
      naranja:  ['hora_punta', 'lunch_simultaneo', 'actividad_fuera_turno', 'lunch_fuera_ventana'],
      amarillo: ['bloque_corto', 'aor_fragmentado', 'mezcla_departamental']
    }
  };

  /* ── Deep clone helper ────────────────────────────────────────────── */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ── Deep merge: apply src on top of dst (dst mutated in place) ───── */
  /* Arrays are always replaced wholesale (not recursed into). */
  function deepMerge(dst, src) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return dst;
    Object.keys(src).forEach(function (k) {
      var srcVal = src[k];
      var dstVal = dst[k];
      // Recurse only when BOTH sides are plain (non-array) objects
      if (srcVal !== null && typeof srcVal === 'object' && !Array.isArray(srcVal) &&
          dstVal !== null && typeof dstVal === 'object' && !Array.isArray(dstVal)) {
        deepMerge(dstVal, srcVal);
      } else {
        // Primitives and arrays are always replaced with a fresh clone
        dst[k] = deepClone(srcVal);
      }
    });
    return dst;
  }

  /* ── Build the CONFIG object ──────────────────────────────────────── */
  var config = deepClone(DEFAULTS);

  // Try to read saved overrides from localStorage
  try {
    var saved = localStorage.getItem(LS_KEY);
    if (saved) {
      deepMerge(config, JSON.parse(saved));
    }
  } catch (e) {
    // localStorage not available or data corrupt — use defaults silently
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /**
   * Persist current CONFIG values to localStorage.
   */
  config.save = function () {
    // Build a plain copy without the methods before serialising
    var plain = deepClone({
      tienda:       this.tienda,
      patrones:     this.patrones,
      planificador: this.planificador,
      alertas:      this.alertas
    });
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(plain));
    } catch (e) {
      console.warn('CONFIG.save: no se pudo guardar en localStorage', e);
    }
  };

  /**
   * Reset CONFIG to factory defaults and remove the saved override from localStorage.
   */
  config.reset = function () {
    var fresh = deepClone(DEFAULTS);
    ['tienda', 'patrones', 'planificador', 'alertas'].forEach(function (section) {
      config[section] = fresh[section];
    });
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      console.warn('CONFIG.reset: no se pudo limpiar localStorage', e);
    }
  };

  /**
   * Return a plain-object snapshot of defaults (read-only reference).
   */
  config.getDefaults = function () {
    return deepClone(DEFAULTS);
  };

  /* ── Expose globally ──────────────────────────────────────────────── */
  window.CONFIG = config;

})();
