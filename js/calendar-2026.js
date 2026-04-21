/* ===== calendar-2026.js — Calendario laboral 2026 · Passeig de Gràcia ===== */
/* Fuente: Calendario oficial Apple PDG 2026                                   */
/* Actualizado: 2026-04-21                                                     */

(function () {
  'use strict';

  function d(month, day) {
    return '2026-' + (month < 10 ? '0' + month : '' + month) + '-' + (day < 10 ? '0' + day : '' + day);
  }

  /* Festivos que cierran la tienda (no son domingo) */
  var HOLIDAYS_CLOSED = [
    d(1,  1),  // Año Nuevo
    d(1,  6),  // Reyes
    d(4,  3),  // Viernes Santo
    d(4,  6),  // Lunes de Pascua
    d(5,  1),  // Día del Trabajador
    d(5, 25),  // Lunes de Pentecostés
    d(10,12),  // Fiesta Nacional de España
    d(12,25),  // Navidad
    d(12,26)   // San Esteban (festivo Cataluña)
  ];

  /* Domingos de apertura especial (azul claro en el calendario) */
  var SUNDAYS_OPEN = [
    d(1,  4), d(1, 11),
    d(2,  8), d(2, 15), d(2, 22),
    d(4, 12), d(4, 19), d(4, 26),
    d(7, 26),
    d(8,  2), d(8,  9), d(8, 16), d(8, 23), d(8, 30),
    d(9,  6), d(9, 13),
    d(11,29),
    d(12, 6), d(12,13), d(12,20)
  ];

  /* Festivos de apertura especial que no son domingo (azul oscuro en el calendario) */
  var FESTIVOS_OPEN = [
    d(6, 24),  // San Juan (miercoles)
    d(8, 15),  // Asuncion (sabado)
    d(9, 11),  // Diada de Catalunya (viernes)
    d(9, 24),  // La Merce (jueves)
    d(12, 8)   // Inmaculada Concepcion (martes)
  ];

  /* Ventana de domingos de verano */
  var SUMMER_SUNDAY_START = '2026-07-26';
  var SUMMER_SUNDAY_END   = '2026-09-13';

  /* Horarios por tipo de dia especial */
  var OPENING_HOURS = {
    // Domingos dentro del periodo de verano (26 jul - 13 sep)
    // Tienda 12-20, primera persona 10:00, ultima sale 20:30
    summerSunday: {
      label:         'Domingo verano',
      storeOpen:     '12:00',
      storeClose:    '20:00',
      firstPersonIn: '10:00',
      lastPersonOut: '20:30'
    },
    // Domingos de apertura fuera de verano: tienda 11-21
    sunday: {
      label:         'Domingo apertura',
      storeOpen:     '11:00',
      storeClose:    '21:00',
      firstPersonIn: '09:00',
      lastPersonOut: '21:30'
    },
    // Festivos de apertura no-domingo: tienda 11-21
    festivo: {
      label:         'Festivo apertura',
      storeOpen:     '11:00',
      storeClose:    '21:00',
      firstPersonIn: '09:00',
      lastPersonOut: '21:30'
    }
  };

  function isSummerSunday(isoDate) {
    return isoDate >= SUMMER_SUNDAY_START &&
           isoDate <= SUMMER_SUNDAY_END &&
           SUNDAYS_OPEN.indexOf(isoDate) !== -1;
  }

  function isClosed(isoDate) {
    if (HOLIDAYS_CLOSED.indexOf(isoDate) !== -1) return true;
    var dt = new Date(isoDate + 'T00:00:00');
    if (dt.getDay() === 0) {
      return SUNDAYS_OPEN.indexOf(isoDate) === -1;
    }
    return false;
  }

  function getOpeningHours(isoDate) {
    if (isSummerSunday(isoDate))                return OPENING_HOURS.summerSunday;
    if (SUNDAYS_OPEN.indexOf(isoDate) !== -1)   return OPENING_HOURS.sunday;
    if (FESTIVOS_OPEN.indexOf(isoDate) !== -1)  return OPENING_HOURS.festivo;
    return null; // dia laborable normal, usar horario estandar de config.js
  }

  function getDayType(isoDate) {
    if (HOLIDAYS_CLOSED.indexOf(isoDate) !== -1)  return 'HOLIDAY_CLOSED';
    var dt  = new Date(isoDate + 'T00:00:00');
    var dow = dt.getDay();
    if (dow === 0) {
      if (isSummerSunday(isoDate))               return 'SUNDAY_SUMMER';
      if (SUNDAYS_OPEN.indexOf(isoDate) !== -1)  return 'SUNDAY_OPEN';
      return 'SUNDAY_CLOSED';
    }
    if (FESTIVOS_OPEN.indexOf(isoDate) !== -1)   return 'FESTIVO_OPEN';
    return 'NORMAL';
  }

  window.CALENDAR_2026 = {
    holidaysClosed:    HOLIDAYS_CLOSED,
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
