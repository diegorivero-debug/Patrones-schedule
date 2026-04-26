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
        // DEPRECATED: usar coberturaFranja para valores por franja horaria
        // Se mantiene como fallback para código que aún no use coberturaFranja
        floorMinimo: 4,
        managersFloorMinimo: 2,
        coachMinimo: 2,
        floorHoraPunta: 6,
        horasPunta: ['12:00-14:00', '17:00-21:00'],
        cierreInvierno: '21:00',
        cierreVerano: '21:30',
        ldopsAorMinStartInvierno: '21:00',
        ldopsAorMinStartVerano: '21:30',
        excedenteParaLDOPS: { minSupport: 4, minCoach: 1 }
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
      managerRol: { coachDiasPorSemana: [2, 3], supportDiasPorSemana: [2, 3] },
      dd: { hora: '09:15', duracionMin: 15 },
      franjasTranquilas: ['09:30-11:00', '15:00-16:00'],
      libranzas: { maxDiasLaborables: 5, equidadFindeQ: true, maxFindesConsecutivos: 2 },
      mixDepartamental: { enabled: true, departamentos: ['Shopping+Biz', 'People', 'Support', 'Ops'] },
      // Mínimos de cobertura por franja horaria — fuente de verdad para el auditor
      // Basado en SPECS_13W.md sección 4
      coberturaFranja: {
        // 09:30-11:00 apertura
        apertura:    { support: 2, coach: 1, total: 3, max: 4 },
        // 11:00-13:00 mediodía
        mediodia:    { support: 3, coach: 2, total: 5 },
        // 13:00-15:00 hora punta mediodía
        horaPunta1:  { support: 4, coach: 2, total: 6 },
        // 15:00-17:00 transición tarde
        transicion:  { support: 3, coach: 2, total: 5 },
        // 17:00-21:00 hora punta tarde
        horaPunta2:  { support: 4, coach: 2, total: 6 },
        // 21:00-21:30 cierre (invierno) / 21:00-22:00 cierre (verano)
        cierre:      { support: 3, coach: 2, total: 5 },
        // Sábado — todas las franjas
        sabado:      { support: 4, coach: 2, total: 6 },
        // Valores legacy para compatibilidad con código existente
        aperturaMin: 3,
        aperturaMax: 4,
        normalSupportMin: 6,
        normalCoachMin: 2,
        transicionMin: 4,
        transicionMax: 5,
        horaPuntaMin: 6,
        cierreMin: 4
      },
      flexRules: {
        coachTransicion: true,
        lunchExtendido: true,
        aorFragmentable: true
      },
      staffingMinimos: {
        normal: 14,     // Lunes, Jueves, Viernes
        martes: 14,     // Martes (Reunión Comercial)
        miercoles: 14,  // Miércoles (Leadership Meeting)
        sabado: 12,     // Sábado mínimo
        sabadoIdeal: 14 // Sábado ideal
      },
      morningMin: 7,    // Mínimo personas turno mañana (apertura + floor hasta mediodía)
      afternoonMin: 7,  // Mínimo personas turno tarde (hora punta + cierre)
      reunionFloorMin: {
        martes: 3,      // 2 Mgr Support + 1 Lead durante reunión comercial
        miercoles: 4    // 1 Manager + 3 Leads durante leadership meeting
      }
    },
    planificador: {
      maxDiasLaborables: 5,
      smMañanaObligatoria: ['LUN', 'MAR'],
      opsLeadsCruzados: true,
      equidadMañanaTarde: 0.5,
      opsLeadMaxSimultaneousLDOPS: 1,
      opsLeads: {
        diasLdops: 3,
        diasMixtos: 2
      },
      smDetallado: {
        lmTodosMañana: true,
        miercolesJorgeCrisMañana: true,
        jueSabRotacion2x2: true
      },
      restriccionesPersonales: {
        jorge:  { fixedMorningDays: ['WED'], ownDays: ['MON', 'TUE'], neverOffDays: ['MON', 'TUE', 'WED'], ownCountsForCoverage: false, role: 'SENIOR_MANAGER' },
        sheila: { ownDays: ['MON', 'TUE'], neverOffDays: ['MON', 'TUE', 'WED'], ownCountsForCoverage: false, role: 'SENIOR_MANAGER' },
        itziar: { ownDays: ['MON', 'TUE'], neverOffDays: ['MON', 'TUE', 'WED'], ownCountsForCoverage: false, role: 'SENIOR_MANAGER' },
        cris_c: { morningOnlyWeekdays: true, ownDays: ['MON', 'TUE'], neverOffDays: ['MON', 'TUE', 'WED'], ownCountsForCoverage: false, role: 'SENIOR_MANAGER' },
        javi_s: { aorFixedDays: ['MON', 'FRI'], avoidOffDays: ['TUE', 'WED'] },
        // Semana A: L-V 7:00-16:00, finde descanso. Semana B: libre disposición.
        // Ancla: semana del 2026-03-30 (lunes) = Semana A. Alterna A,B,A,B...
        ane:    {
          weekAB: true,
          weekABAnchor: '2026-03-30', // lunes de la semana ancla
          weekABAnchorType: 'A',      // esa semana es tipo A
          weekASchedule: { start: '07:00', end: '16:00', weekendOff: true },
          avoidOffDays: ['TUE', 'WED']
        },
        // SPECS_13W: concreción semanal fija de Meri Alvarez (L-V)
        meri:   {
          fixedSchedule: {
            MON: { start: '10:00', end: '22:00' },
            TUE: { start: '10:00', end: '19:00' },
            WED: { start: '07:00', end: '16:00' },
            THU: { start: '07:00', end: '16:00' },
            FRI: { start: '07:00', end: '16:00' }
          },
          availableWeekends: true,
          ownPerWeek: 1,
          ownNeverOn: ['SAT'],
          ownCountsForCoverage: false,
          role: 'PEOPLE_MANAGER'
        },
        toni:   { ownPerWeek: 1, ownNeverOn: ['SAT'], ownCountsForCoverage: false, role: 'PEOPLE_MANAGER' },
        eva_h:  { morningOnly: true, altWeekend: true, hours32: true },
        eli:    { morningOnly: true, altWeekend: true },
        clara:  {
          neverOffThursday: true,
          juevesHorasSindicales: { start: '09:00', end: '13:00' },
          // Los jueves Clara no está disponible para floor hasta las 13:00
          thursdayFloorAvailableFrom: '13:00'
        },
        aurora: { crossedWith: 'ruben', ldopsPerWeek: 3, ldopsMinPerWeek: 2, role: 'OPS_LEAD' },
        ruben:  { crossedWith: 'aurora', ldopsPerWeek: 3, ldopsMinPerWeek: 2, role: 'OPS_LEAD' }
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

  /**
   * Devuelve el mínimo de floor (total) para una hora dada (formato 'HH:MM').
   * Usa coberturaFranja como fuente de verdad.
   * @param {string} time — e.g. '10:00', '17:30'
   * @param {boolean} isSaturday — si es sábado
   * @returns {number} mínimo de personas en floor
   */
  config.getFloorMinForTime = function (time, isSaturday) {
    if (isSaturday) return this.patrones.coberturaFranja.sabado.total;
    var cf = this.patrones.coberturaFranja;
    var t = time.replace(':', '');
    var n = parseInt(t, 10);
    if (n < 930) return 0;                   // antes de apertura
    if (n < 1100) return cf.apertura.total;  // 09:30-11:00
    if (n < 1300) return cf.mediodia.total;  // 11:00-13:00
    if (n < 1500) return cf.horaPunta1.total; // 13:00-15:00
    if (n < 1700) return cf.transicion.total; // 15:00-17:00
    if (n < 2100) return cf.horaPunta2.total; // 17:00-21:00
    if (n < 2200) return cf.cierre.total;    // 21:00-22:00
    return 0;                                // tienda cerrada
  };

  /* ── Expose globally ──────────────────────────────────────────────── */
  window.CONFIG = config;

})();
