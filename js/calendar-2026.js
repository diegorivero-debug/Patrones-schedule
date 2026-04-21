/* ===== calendar-2026.js — Calendario laboral 2026 · Passeig de Gràcia ===== */
/* Fuente: Calendario oficial Apple PDG 2026                                   */
/* Actualizado: 2026-04-21                                                     */

(function () {
  'use strict';

  function d(month, day) {
    return '2026-' + (month < 10 ? '0' + month : String(month)) + '-' + (day < 10 ? '0' + day : String(day));
  }

  /* ── Domingos de apertura ───────────────────────────────────────────────── */
  /* Solo estos domingos abre la tienda. El resto de domingos, CERRADO.        */
  var SUNDAYS_OPEN = [
    // Enero
    d(1,  4), d(1, 11),
    // Verano (26 jul – 13 sep) — horario especial 12-20
    d(7, 26),
    d(8,  2), d(8,  9), d(8, 16), d(8, 23), d(8, 30),
    d(9,  6), d(9, 13),
    // Navidad / Black Friday (29 nov – 27 dic)
    d(11, 29),
    d(12,  6), d(12, 13), d(12, 20), d(12, 27)
  ];

  /* ── Festivos de apertura que NO son domingo ────────────────────────────── */
  var FESTIVOS_OPEN = [
    d(8, 15),  // Asunción (sábado) — horario 11-21
    d(12, 8)   // Inmaculada Concepción (martes) — horario 11-21
  ];

  /* ── Ventana domingos de verano ─────────────────────────────────────────── */
  var SUMMER_SUNDAY_START = '2026-07-26';
  var SUMMER_SUNDAY_END   = '2026-09-13';

  /* ── Horarios por tipo de día especial ──────────────────────────────────── */
  var OPENING_HOURS = {
    // Domingos dentro del periodo verano (26 jul – 13 sep)
    // Tienda 12-20, primera persona entra 10:00, última sale 20:30
    summerSunday: {
      label:         'Domingo verano',
      storeOpen:     '12:00',
      storeClose:    '20:00',
      firstPersonIn: '10:00',
      lastPersonOut: '20:30'
    },
    // Domingos de apertura fuera del periodo verano
    sunday: {
      label:         'Domingo apertura',
      storeOpen:     '11:00',
      storeClose:    '21:00',
      firstPersonIn: '09:00',
      lastPersonOut: '21:30'
    },
    // Festivos de apertura no-domingo (15 ago, 8 dic)
    festivo: {
      label:         'Festivo apertura',
      storeOpen:     '11:00',
      storeClose:    '21:00',
      firstPersonIn: '09:00',
      lastPersonOut: '21:30'
    }
  };

  /* ── Helpers ────────────────────────────────────────────���───────────────── */

  function isSummerSunday(isoDate) {
    return isoDate >= SUMMER_SUNDAY_START &&
           isoDate <= SUMMER_SUNDAY_END &&
           SUNDAYS_OPEN.indexOf(isoDate) !== -1;
  }

  /** Devuelve true si la tienda está cerrada ese día */
  function isClosed(isoDate) {
    var dt  = new Date(isoDate + 'T00:00:00');
    var dow = dt.getDay();
    // Domingo no incluido en SUNDAYS_OPEN → cerrado
    if (dow === 0) return SUNDAYS_OPEN.indexOf(isoDate) === -1;
    // Festivo no incluido en FESTIVOS_OPEN → cerrado
    // (todos los festivos normales son días de libranza, no hay lista separada)
    return false;
  }

  /** Devuelve el objeto de horario especial, o null si es día laboral normal */
  function getOpeningHours(isoDate) {
    if (isSummerSunday(isoDate))               return OPENING_HOURS.summerSunday;
    if (SUNDAYS_OPEN.indexOf(isoDate) !== -1)  return OPENING_HOURS.sunday;
    if (FESTIVOS_OPEN.indexOf(isoDate) !== -1) return OPENING_HOURS.festivo;
    return null; // día laboral normal — usar horario estándar de config.js
  }

  /** Devuelve el tipo de día como string */
  function getDayType(isoDate) {
    var dt  = new Date(isoDate + 'T00:00:00');
    var dow = dt.getDay();
    if (dow === 0) {
      if (isSummerSunday(isoDate))              return 'SUNDAY_SUMMER';
      if (SUNDAYS_OPEN.indexOf(isoDate) !== -1) return 'SUNDAY_OPEN';
      return 'SUNDAY_CLOSED';
    }
    if (FESTIVOS_OPEN.indexOf(isoDate) !== -1)  return 'FESTIVO_OPEN';
    return 'NORMAL';
  }

  /* ── Exposición global ──────────────────────────────────────────────────── */
  window.CALENDAR_2026 = {
    sundaysOpen:       SUNDAYS_OPEN,
    festivosOpen:      FESTIVOS_OPEN,
    openingHours:      OPENING_HOURS,
    summerSundayStart: SUMMER_SUNDAY_START,
    summerSundayEnd:   SUMMER_SUNDAY_END,
    isClosed:          isClosed,
    getOpeningHours:   getOpeningHours,
    getDayType:        getDayType,
    isSummerSunday:    isSummerSunday
  };

}());
