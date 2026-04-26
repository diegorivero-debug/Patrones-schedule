// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const TIME_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:15','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
const OPEN_START = TIME_SLOTS.indexOf(
  (window.CONFIG && CONFIG.tienda && CONFIG.tienda.apertura) || '09:30'
);

// Season-dependent closing: Verano 21:30 (idx 30), Invierno 21:00 (idx 29)
const OPEN_END_VERANO = TIME_SLOTS.indexOf(
  (window.CONFIG && CONFIG.tienda && CONFIG.tienda.cierreVerano) || '21:30'
);
const OPEN_END_INVIERNO = TIME_SLOTS.indexOf(
  (window.CONFIG && CONFIG.tienda && CONFIG.tienda.cierreInvierno) || '21:00'
);

const ACTIVITY_OPTIONS = ['','LDSup','LDOPS','Coach','Support','AOR','Lunch','DD','MEETING'];

const COLORS = {
  'LDSup':'#4A90D9','LDOPS':'#A8D5E2','Coach':'#7BC67E','Support':'#F5A623',
  'AOR':'#D5D5D5','Lunch':'#FFE066','DD':'#B8A9C9','MEETING':'#E74C3C','':'#FFFFFF'
};

const PATTERN_NAMES = [
  'Día Normal (Lun, Jue, Vie)',
  'Martes (Reunión Comercial 14:00-16:00)',
  'Miércoles (Leadership Meeting 14:00-16:00)',
  'Sábado',
  'Domingo (apertura)',
];

// Weekly view mapping: [Lunes, Martes, Miércoles, Jueves, Viernes, Sábado] → pattern indices
// Thursday and Friday reuse pattern 0 (Día Normal), same as Monday.
const WEEK_DAYS       = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_PATTERN_IDX = [0, 1, 2, 0, 0, 3]; // [Mon=pat0, Tue=pat1, Wed=pat2, Thu→pat0, Fri→pat0, Sat=pat3]

const SHIFT_OPTIONS_VERANO   = ['07:00-16:00','08:00-17:00','09:00-18:00','10:00-19:00','11:00-20:00','12:00-21:00','12:30-21:30','13:00-22:00'];
const SHIFT_OPTIONS_INVIERNO = ['07:00-16:00','08:00-17:00','09:00-18:00','10:00-19:00','11:00-20:00','12:00-21:00','12:30-21:30','13:00-22:00'];

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS RULES  (single source of truth for all scheduling constraints)
// ═══════════════════════════════════════════════════════════════════════════════
const BUSINESS_RULES = (function() {
  var C = window.CONFIG || {};
  var t = C.tienda || {};
  var p = C.patrones || {};
  var lunch = p.lunch || {};
  var cob = p.cobertura || {};
  var blq = p.bloques || {};
  var reu = p.reuniones || {};
  var ap = p.apertura || {};
  var ci = p.cierre || {};
  var mr = p.managerRol || {};

  return {
    store: {
      openTime:       t.apertura || '09:30',
      closeVerano:    t.cierreVerano || '21:30',
      closeInvierno:  t.cierreInvierno || '21:00',
      firstLeadEntry: t.entradaLeadMin || '07:00',
      lastLeadExit:   '22:00',
      firstMgrEntry:  t.entradaManagerMin || '08:00',
      lastMgrExit:    '22:00',
    },
    shifts: {
      totalHours: 9,
      workHours: 8,
      lunchHours: 1,
      lunchSlots: lunch.duracionSlots || 2,
    },
    weekday: {
      manager: { floorHours: 4, aorHours: 4, lunchHours: 1, floorActivities: ['Coach','Support'] },
      lead:    { floorHours: 5, ldopsHours: 3, lunchHours: 1, floorActivities: ['LDSup'] },
    },
    saturday: {
      manager: { floorHours: 6, aorHours: 2, lunchHours: 1, floorActivities: ['Coach','Support'] },
      lead:    { floorHours: 6, ldopsHours: 2, lunchHours: 1, floorActivities: ['LDSup'] },
    },
    sunday: {
      manager: { floorHours: 5, aorHours: 3, lunchHours: 1, floorActivities: ['Coach','Support'] },
      lead:    { floorHours: 5, ldopsHours: 3, lunchHours: 1, floorActivities: ['LDSup'] },
    },
    coverage: {
      normal:     { support: cob.managersFloorMinimo || 2, coach: cob.coachMinimo || 2, totalFloor: cob.floorMinimo || 4 },
      lunchTrans: { support: Math.max((cob.managersFloorMinimo || 2) - 1, 1), coach: 1, totalFloor: Math.max((cob.floorMinimo || 4) - 2, 2) },
      minMgrsOnFloor: cob.managersFloorMinimo || 2,
      maxMgrsOnFloor: cob.managersFloorMaximo || 6,
      minCoach:   cob.coachMinimo || 2,
      maxCoach:   cob.coachMaximo || 5,
      floorObjetivo: cob.floorObjetivo || cob.floorHoraPunta || 6,
      floorMaximo: cob.floorMaximo || 10,
      peakFloor:  cob.floorHoraPunta || 6,
      cierreInvierno: cob.cierreInvierno || '21:00',
      cierreVerano: cob.cierreVerano || '21:30',
      ldopsAorMinStartInvierno: cob.ldopsAorMinStartInvierno || '21:00',
      ldopsAorMinStartVerano: cob.ldopsAorMinStartVerano || '21:30',
      excedenteParaLDOPS: cob.excedenteParaLDOPS || { minSupport: 4, minCoach: 1 },
      peakHours: (cob.horasPunta || ['12:00-14:00', '17:00-21:00']).map(function(range) {
        var parts = typeof range === 'string' ? range.split('-') : [];
        return { start: parts[0] || '', end: parts[1] || '' };
      }),
    },
    lunch: {
      windowStart:     lunch.ventanaDesde || '11:00',
      windowEnd:       lunch.ventanaHasta || '17:00',
      durationSlots:   lunch.duracionSlots || 2,
      maxSimultaneous: lunch.maxSimultaneo || 3,
      rule: 'Quien entra primero come primero (escalonado)',
    },
    dd: {
      time: '09:15',
      durationMin: 15,
      onlyMorningShifts: false,
    },
    blocks: {
      minFloorBlockSlots: blq.floorMinimoSlots || 4,
      maxAorBlocks:       blq.aorMaxBloques || 2,
    },
    // staffing stays hardcoded (depends on team size, not a simple config)
    staffing: {
      0: { leads: 4, managers: 10, name: 'Día Normal' },
      1: { leads: 4, managers: 10, name: 'Martes' },
      2: { leads: 5, managers: 10, name: 'Miércoles' },
      3: { leads: 3, managers: 7, minTotal: 12, name: 'Sábado', firstShift: '08:00' },
      4: { leads: 3, managers: 7, minTotal: 10, name: 'Domingo', firstShift: '09:00' },
    },
    meetings: {
      martes: {
        name: (reu.martes && reu.martes.nombre) || 'Reunión Comercial',
        start: (reu.martes && reu.martes.hora) ? reu.martes.hora.split('-')[0] : '14:00',
        end:   (reu.martes && reu.martes.hora) ? reu.martes.hora.split('-')[1] : '16:00',
        attendees: 'all',
        exceptions: { mgrSupport: 2, leadFloor: 1 },
        coachSuspended: true,
        countsAs: { manager: 'AOR', lead: 'LDOPS' },
      },
      miercoles: {
        name: (reu.miercoles && reu.miercoles.nombre) || 'Leadership Meeting',
        start: (reu.miercoles && reu.miercoles.hora) ? reu.miercoles.hora.split('-')[0] : '14:00',
        end:   (reu.miercoles && reu.miercoles.hora) ? reu.miercoles.hora.split('-')[1] : '16:00',
        attendees: 'managers',
        exceptions: { mgrFloor: 1 },
        leadsCoverFloor: 3,
        coachSuspended: true,
        countsAs: { manager: 'AOR' },
      },
    },
    opening: {
      minPeople:  ap.minimoPersonas || 2,
      idealRoles: 'Lead',
      activity:   'LDOPS',
    },
    closing: {
      minLeads:    ci.minimoLeads || 2,
      minManagers: ci.minimoManagers || 1,
      activity:    'AOR/LDOPS',
    },
    quietHours: [
      { start: '09:30', end: '11:00' },
      { start: '15:00', end: '16:00' },
    ],
    managerDailyRole: {
      rule: 'Un Manager es Coach O Support todo el día, nunca mezcla',
      coachPerWeek:   mr.coachDiasPorSemana || [2, 3],
      supportPerWeek: mr.supportDiasPorSemana || [2, 3],
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// ORIGINAL PATTERN DATA  (4 Leads + 10 Managers = 14 personas)
// ═══════════════════════════════════════════════════════════════════════════════
const ORIGINAL_PATTERNS = [
  // ── Pattern 0: Día Normal ──────────────────────────────────────────────────
  [
    {role:'Lead',shift:'07:00-16:00',acts:['LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','','','','','','','','','','','','']},
    {role:'Lead',shift:'08:00-17:00',acts:['','','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','','','','','','','','','','','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','AOR','AOR','AOR','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'09:00-18:00',acts:['','','','','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','AOR','AOR','AOR','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','AOR','AOR','AOR','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','AOR','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','','','','','','','','']},
    {role:'Manager',shift:'11:00-20:00',acts:['','','','','','','','','','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','','','','','','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','AOR','Lunch','Lunch','AOR','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Support','AOR','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','AOR','Support','Support','Support','Support','Support','Support','Support','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','AOR','AOR','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','AOR','']}
  ],
  // ── Pattern 1: Martes (Meeting 14:00-16:00 = indices 15-18) ────────────────
  [
    {role:'Lead',shift:'07:00-16:00',acts:['LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','','','','','','','','','','','','']},
    {role:'Lead',shift:'08:00-17:00',acts:['','','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','MEETING','MEETING','MEETING','MEETING','LDOPS','LDOPS','','','','','','','','','','','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','MEETING','MEETING','MEETING','MEETING','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','MEETING','MEETING','MEETING','MEETING','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','MEETING','MEETING','MEETING','MEETING','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'09:00-18:00',acts:['','','','','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','AOR','AOR','AOR','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','AOR','MEETING','MEETING','MEETING','MEETING','Coach','Coach','Coach','Coach','AOR','','','','','','','','']},
    {role:'Manager',shift:'11:00-20:00',acts:['','','','','','','','','','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','','','','','','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','AOR','Lunch','Lunch','AOR','Support','Support','Support','Support','Support','Support','Support','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']}
  ],
  // ── Pattern 2: Miércoles (Leadership Meeting 14:00-16:00, only Managers) ───
  [
    {role:'Lead',shift:'07:00-16:00',acts:['LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','','','','','','','','','','','','']},
    {role:'Lead',shift:'08:00-17:00',acts:['','','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','','','','','','','','','','','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','MEETING','MEETING','MEETING','MEETING','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'09:00-18:00',acts:['','','','','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','AOR','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','AOR','MEETING','MEETING','MEETING','MEETING','Coach','Coach','Coach','Coach','AOR','','','','','','','','']},
    {role:'Manager',shift:'11:00-20:00',acts:['','','','','','','','','','AOR','AOR','AOR','AOR','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','Support','Support','Support','Support','Support','AOR','AOR','','','','','','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Lunch','Lunch','MEETING','MEETING','MEETING','MEETING','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','AOR','Lunch','Lunch','AOR','Support','Support','Support','Support','Support','Support','Support','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','MEETING','MEETING','MEETING','MEETING','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']}
  ],
  // ── Pattern 3: Sábado ──────────────────────────────────────────────────────
  [
    {role:'Lead',shift:'08:00-17:00',acts:['','','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','','','','','','','','','','','']},
    {role:'Lead',shift:'08:00-17:00',acts:['','','LDOPS','LDOPS','LDOPS','DD','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','','','','','','','','','','','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Lead',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'08:00-17:00',acts:['','','AOR','AOR','AOR','DD','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','','','','','','','','','','','']},
    {role:'Manager',shift:'09:00-18:00',acts:['','','','','AOR','DD','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','','','','','','','']},
    {role:'Manager',shift:'10:00-19:00',acts:['','','','','','','','AOR','AOR','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','','','','','','','']},
    {role:'Manager',shift:'11:00-20:00',acts:['','','','','','','','','','AOR','AOR','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','','','','','','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Coach','Coach','Coach','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Support','Support','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','Support','Support','Support','Support','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','']},
    {role:'Manager',shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','AOR','AOR','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','AOR','']}
  ],
  // ── Pattern 4: Domingo (apertura) ─────────────────────────────────────────
  // Tienda 11:00-21:30 (verano) / 11:00-21:00 (invierno).
  // 3 Leads + 7 Managers. Los días libres de quien trabaja este domingo
  // DEBEN ser consecutivos en la semana (regla sagrada).
  // Late leads and managers (13:00-22:00) ensure closing coverage.
  [
    {role:'Lead',    shift:'09:00-18:00',acts:['','','','','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDOPS','','','','','','','','','']},
    {role:'Lead',    shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Lead',    shift:'13:00-22:00',acts:['','','','','','','','','','','','','','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','LDSup','Lunch','Lunch','LDSup','LDSup','LDSup','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','LDOPS','']},
    {role:'Manager', shift:'09:00-18:00',acts:['','','','','AOR','AOR','AOR','AOR','AOR','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager', shift:'09:00-18:00',acts:['','','','','AOR','AOR','AOR','AOR','AOR','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','','','','','','','','','']},
    {role:'Manager', shift:'11:00-20:00',acts:['','','','','','','','','','AOR','AOR','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','AOR','AOR','','','','','']},
    {role:'Manager', shift:'11:00-20:00',acts:['','','','','','','','','','Support','Support','Support','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','AOR','','','','','']},
    {role:'Manager', shift:'12:00-21:00',acts:['','','','','','','','','','','','AOR','Coach','Coach','Coach','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','AOR','AOR','AOR','','','']},
    {role:'Manager', shift:'13:00-22:00',acts:['','','','','','','','','','','','','','AOR','AOR','AOR','AOR','AOR','AOR','Lunch','Lunch','Coach','Coach','Coach','Coach','Coach','Coach','Coach','Coach','AOR','AOR','']},
    {role:'Manager', shift:'13:00-22:00',acts:['','','','','','','','','','','','','','Support','AOR','AOR','AOR','AOR','Lunch','Lunch','Support','Support','Support','Support','Support','Support','Support','AOR','AOR','AOR','AOR','']}
  ]
];

// ═══════════════════════════════════════════════════════════════════════════════
// WINTER PATTERNS  (derived from summer: 13:00-22:00 → 12:30-21:30, close at 21:00)
// Closing shift starts 30 min earlier in winter and ends 30 min earlier.
// ═══════════════════════════════════════════════════════════════════════════════
function deriveWinterPatterns(summer) {
  const idx1230 = TIME_SLOTS.indexOf('12:30'); // 12
  const idx1300 = TIME_SLOTS.indexOf('13:00'); // 13
  const idx2130 = TIME_SLOTS.indexOf('21:30'); // 30
  const idx2200 = TIME_SLOTS.indexOf('22:00'); // 31
  return summer.map(pat => pat.map(row => {
    const r = {role: row.role, shift: row.shift, acts: [...row.acts]};
    if (row.shift === '13:00-22:00') {
      r.shift = '12:30-21:30';
      // Start 30 min earlier: fill 12:30 slot with same activity as 13:00
      if (idx1230 >= 0 && idx1300 >= 0) {
        r.acts[idx1230] = row.acts[idx1300] || (row.role === 'Lead' ? 'LDSup' : 'AOR');
      }
      // Remove last two slots: store closes at 21:00 in winter
      if (idx2200 >= 0) r.acts[idx2200] = '';
      if (idx2130 >= 0) r.acts[idx2130] = '';
    }
    return r;
  }));
}
const ORIGINAL_WINTER_PATTERNS = deriveWinterPatterns(ORIGINAL_PATTERNS);

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════
const LS_KEY_PATTERNS  = 'schedule_patterns_v2';
const LS_KEY_RULES     = 'schedule_rules';
const LS_KEY_SEASON    = 'schedule_season';
const LS_KEY_THEME     = 'app_theme';
const LS_KEY_TEAM      = 'schedule_team';

function deepClone(patterns) {
  return patterns.map(pat => pat.map(row => {
    const r = {role:row.role, shift:row.shift, acts:[...row.acts]};
    if (row.assignedId !== undefined) r.assignedId = row.assignedId;
    return r;
  }));
}

function loadAllState() {
  try {
    const saved = localStorage.getItem(LS_KEY_PATTERNS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.verano && parsed.invierno) {
        // Ensure Sunday pattern (index 4) exists — migrate if first time loading new version
        if (!parsed.verano[4])   parsed.verano[4]   = deepClone([ORIGINAL_PATTERNS[4]])[0];
        if (!parsed.invierno[4]) parsed.invierno[4] = deepClone([ORIGINAL_WINTER_PATTERNS[4]])[0];
        return parsed;
      }
    }
    // Migrate from old format (v1 stored flat array as 'schedule_patterns')
    const oldSaved = localStorage.getItem('schedule_patterns');
    if (oldSaved) {
      const oldParsed = JSON.parse(oldSaved);
      if (Array.isArray(oldParsed)) {
        return { verano: oldParsed, invierno: deriveWinterPatterns(oldParsed) };
      }
    }
  } catch(e) {}
  return { verano: deepClone(ORIGINAL_PATTERNS), invierno: deepClone(ORIGINAL_WINTER_PATTERNS) };
}

function saveState() {
  try {
    allSeasonState[activeSeason] = currentState;
    localStorage.setItem(LS_KEY_PATTERNS, JSON.stringify(allSeasonState));
  } catch(e) {}
}

function loadRules() {
  try {
    const saved = localStorage.getItem(LS_KEY_RULES);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [
    {day:'Todos', text:'🔴 REGLA DE ORO: La cobertura mínima de floor NO es negociable. Si no cuadra, añadir más personas, nunca reducir.', highlight:true},
    {day:'Todos', text:'Cobertura mínima en floor: ' + BUSINESS_RULES.coverage.normal.totalFloor + ' personas (' + BUSINESS_RULES.coverage.normal.support + ' Support + ' + BUSINESS_RULES.coverage.normal.coach + ' Coach). Transición/Lunch: mín ' + BUSINESS_RULES.coverage.lunchTrans.totalFloor + '.', highlight:true},
    {day:'Todos', text:'Mínimo 2 Coach simultáneos en floor en todo momento. Mínimo ' + BUSINESS_RULES.coverage.minMgrsOnFloor + ' Managers en floor.', highlight:true},
    {day:'Todos', text:'Manager es Coach O Support TODO EL DÍA — nunca mezcla. ~2-3 días Coach + ~2-3 días Support por semana.', highlight:true},
    {day:'Todos', text:'Lunch: ' + BUSINESS_RULES.lunch.windowStart + '-' + BUSINESS_RULES.lunch.windowEnd + ' (puede empezar hasta las 17:00). Simultáneo OK si no viola cobertura.', highlight:false},
    {day:'Todos', text:'DD (Daily Download) a las ' + BUSINESS_RULES.dd.time + ' para TODOS los que estén en turno. Turno tarde: sin DD.', highlight:false},
    {day:'Todos', text:'Apertura: mín 2 personas (idealmente 2 Leads) desde el primer turno. Hacen LDOPS/AOR hasta apertura tienda.', highlight:true},
    {day:'Todos', text:'Cierre: mín 2 Leads + 1 Manager haciendo AOR/LDOPS después de cierre tienda (21:30 verano / 21:00 invierno).', highlight:true},
    {day:'Todos', text:'Horas pico: 12:00-14:00 y 17:00-21:00. Franjas tranquilas: 09:30-11:00 y 15:00-16:00 (buen momento para AOR/Lunch).', highlight:false},
    {day:'Todos', text:'AOR/LDOPS: idealmente en 1 bloque, aceptable en 2 bloques máx. Bloques floor mínimo 2h seguidas.', highlight:false},
    {day:'Todos', text:'Verano: cierre 21:30. Invierno: cierre 21:00. Turno tarde invierno: 12:30-21:30.', highlight:true},
    {day:'Martes', text:'Reunión Comercial ' + BUSINESS_RULES.meetings.martes.start + '-' + BUSINESS_RULES.meetings.martes.end + '. Todos a reunión excepto ' + BUSINESS_RULES.meetings.martes.exceptions.mgrSupport + ' Mgr Support + ' + BUSINESS_RULES.meetings.martes.exceptions.leadFloor + ' Lead en floor. Puede ser CUALQUIER Lead y cualquier Mgr. Coach suspendido.', highlight:true},
    {day:'Miércoles', text:'Leadership Meeting ' + BUSINESS_RULES.meetings.miercoles.start + '-' + BUSINESS_RULES.meetings.miercoles.end + '. Solo Managers a reunión. ' + BUSINESS_RULES.meetings.miercoles.exceptions.mgrFloor + ' Manager se queda en floor. ' + BUSINESS_RULES.meetings.miercoles.leadsCoverFloor + '+ Leads cubren floor. Coach suspendido.', highlight:true},
    {day:'Sábado', text:'Tienda abre a las 08:00 — NO hay turno de 07:00. Primer turno: 08:00. Mín 12 personas (3-4 Leads + 7-8 Managers).', highlight:true},
    {day:'Sábado', text:'Más tiempo en floor: ' + BUSINESS_RULES.saturday.manager.floorHours + 'h floor + ' + BUSINESS_RULES.saturday.manager.aorHours + 'h AOR por Manager, ' + BUSINESS_RULES.saturday.lead.floorHours + 'h floor + ' + BUSINESS_RULES.saturday.lead.ldopsHours + 'h LDOPS por Lead.', highlight:false},
    {day:'Domingo', text:'Solo en fechas indicadas en el calendario. Primera persona 09:00 (verano: 10:00). Tienda 11:00-21:00 (verano: 12:00-20:00). Mín 10 personas (3 Leads + 7 Managers).', highlight:true},
    {day:'Domingo', text:'🔑 REGLA: Los días libres de Managers y Leads que trabajan en domingo SIEMPRE deben ser consecutivos (paquete). Ej: Lun+Mar, Jue+Vie, o Vie+Sáb libres.', highlight:true},
    {day:'L-V', text:'Manager: ' + BUSINESS_RULES.weekday.manager.floorHours + 'h floor + ' + BUSINESS_RULES.weekday.manager.aorHours + 'h AOR. Lead: ' + BUSINESS_RULES.weekday.lead.floorHours + 'h floor + ' + BUSINESS_RULES.weekday.lead.ldopsHours + 'h LDOPS.', highlight:false},
  ];
}

function saveRules() {
  try { localStorage.setItem(LS_KEY_RULES, JSON.stringify(rules)); } catch(e) {}
}

let activeSeason = 'verano';
try { activeSeason = localStorage.getItem(LS_KEY_SEASON) || 'verano'; } catch(e) {}

let allSeasonState = loadAllState();
let currentState = allSeasonState[activeSeason];
let rules = loadRules();
let activePattern = 0;
let openDropdownEl = null;

// ── Cell Drag & Drop state ───────────────────────────────────────────────────
let cellDragData = null; // {patIdx, rowIdx, colIdx, activity}

// ── Undo / Redo state ────────────────────────────────────────────────────────
const MAX_UNDO = 50;
const undoHistory = { 0: [], 1: [], 2: [], 3: [], 4: [] };
const redoHistory = { 0: [], 1: [], 2: [], 3: [], 4: [] };

// ── AI Advisor state ─────────────────────────────────────────────────────────
let aiSuggestions   = [];
let aiActiveTab     = 'tactical';
let aiPreviewState  = null;
let aiDismissed     = new Set();
let aiAnalysisTimer = null;

// ── AI Advisor constants ──────────────────────────────────────────────────────
const MIN_SWAP_SLOTS    = 4;   // minimum shared floor slots to suggest a Manager role swap
const FRAGILITY_THRESHOLD = 0.5; // fraction of critical persons that makes a pattern "fragile"
const HOURS_PER_SHIFT   = 8;   // standard working hours per shift (for staffing math)
const SLOTS_PER_HOUR    = 2;   // 30-minute slots per hour

function pushUndo(patIdx) {
  const snapshot = currentState[patIdx].map(row => ({ role: row.role, shift: row.shift, acts: [...row.acts], assignedId: row.assignedId }));
  undoHistory[patIdx].push(snapshot);
  if (undoHistory[patIdx].length > MAX_UNDO) undoHistory[patIdx].shift();
  redoHistory[patIdx] = []; // new change invalidates redo stack
  updateUndoRedoButtons();
}

function undo() {
  const stack = undoHistory[activePattern];
  if (!stack.length) return;
  const snapshot = currentState[activePattern].map(row => ({ role: row.role, shift: row.shift, acts: [...row.acts], assignedId: row.assignedId }));
  redoHistory[activePattern].push(snapshot);
  currentState[activePattern] = stack.pop();
  saveState();
  render(activePattern);
  showUndoToast(`↩️ Cambio deshecho (quedan ${stack.length})`);
  updateUndoRedoButtons();
}

function redo() {
  const stack = redoHistory[activePattern];
  if (!stack.length) return;
  const snapshot = currentState[activePattern].map(row => ({ role: row.role, shift: row.shift, acts: [...row.acts], assignedId: row.assignedId }));
  undoHistory[activePattern].push(snapshot);
  if (undoHistory[activePattern].length > MAX_UNDO) undoHistory[activePattern].shift();
  currentState[activePattern] = stack.pop();
  saveState();
  render(activePattern);
  showUndoToast(`↪️ Cambio rehecho (quedan ${stack.length})`);
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  if (btnUndo) btnUndo.disabled = undoHistory[activePattern].length === 0;
  if (btnRedo) btnRedo.disabled = redoHistory[activePattern].length === 0;
}

let undoToastTimer = null;
function showUndoToast(msg) {
  const toast = document.getElementById('undo-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  // Flash the schedule table (void tw.offsetWidth forces a reflow to restart the animation)
  const tw = document.querySelector('.table-wrapper');
  if (tw) {
    tw.classList.remove('undo-flash');
    void tw.offsetWidth;
    tw.classList.add('undo-flash');
    setTimeout(() => tw.classList.remove('undo-flash'), 350);
  }
  if (undoToastTimer) clearTimeout(undoToastTimer);
  undoToastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
}

// ── Team data ────────────────────────────────────────────────────────────────
function loadTeam() {
  try {
    const saved = localStorage.getItem(LS_KEY_TEAM);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.leads) && Array.isArray(parsed.managers)) return parsed;
    }
  } catch(e) {}
  return { leads: [], managers: [] };
}

function saveTeam() {
  try { localStorage.setItem(LS_KEY_TEAM, JSON.stringify(teamData)); } catch(e) {}
}

let teamData = loadTeam();
let teamDraft = null;
let activeAssignDropdown = null;

function getOpenEnd() { return activeSeason === 'invierno' ? OPEN_END_INVIERNO : OPEN_END_VERANO; }
function getOpenStart(patIdx) {
  if (patIdx === 3) return TIME_SLOTS.indexOf('08:00');
  if (patIdx === 4) return TIME_SLOTS.indexOf('09:00');
  return OPEN_START;
}
function getSeasonLabel() { return activeSeason === 'invierno' ? '❄️ Invierno' : '☀️ Verano'; }
function getCloseTime() {
  return activeSeason === 'invierno'
    ? BUSINESS_RULES.store.closeInvierno
    : BUSINESS_RULES.store.closeVerano;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════
function getColor(act) { return COLORS.hasOwnProperty(act) ? COLORS[act] : '#FFFFFF'; }

// XSS-safe HTML escape
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function textColor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#333';
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (.299*r+.587*g+.114*b)>160?'#333':'#fff';
}

function shiftIndices(shift) {
  const [s,e] = shift.split('-');
  let si = TIME_SLOTS.indexOf(s), ei = TIME_SLOTS.indexOf(e);
  if (si<0) si=0; if (ei<0) ei=TIME_SLOTS.length-1;
  return [si, ei];
}

// Returns the floor role a row performs that day: 'LDSup' for Leads,
// 'Coach' or 'Support' for Managers (first one found), or null if none.
function getFloorRoleForRow(row) {
  if (!row) return null;
  if (row.role === 'Lead') return 'LDSup';
  for (const a of row.acts) {
    if (a === 'Coach')   return 'Coach';
    if (a === 'Support') return 'Support';
  }
  return null;
}

// Abbreviates a shift string to "HH-HH" (e.g. "08:00-17:00" → "08-17").
function shiftShort(shift) {
  if (!shift) return '—';
  const parts = shift.split('-');
  if (parts.length < 2) return shift;
  return parts[0].slice(0, 2) + '-' + parts[1].slice(0, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function makeShortName(name) {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function openTeamModal() {
  teamDraft = {
    leads:    teamData.leads.map(m => ({...m})),
    managers: teamData.managers.map(m => ({...m}))
  };
  renderTeamModal();
  document.getElementById('modal-team').classList.add('open');
}

function closeTeamModal() {
  teamDraft = null;
  document.getElementById('modal-team').classList.remove('open');
}

function renderTeamModal() {
  const body = document.getElementById('team-modal-body');
  if (!body || !teamDraft) return;
  const shiftOpts = activeSeason === 'invierno' ? SHIFT_OPTIONS_INVIERNO : SHIFT_OPTIONS_VERANO;

  let h = '<div class="team-section-title">👤 Leads</div>';
  teamDraft.leads.forEach((m, i) => {
    h += `<div class="team-member-row">
      <input type="text" placeholder="Nombre del Lead" value="${escAttr(m.name || '')}"
        oninput="teamDraft.leads[${i}].name=this.value;teamDraft.leads[${i}].shortName=makeShortName(this.value)">
      <select onchange="teamDraft.leads[${i}].defaultShift=this.value">
        ${shiftOpts.map(s => `<option value="${escAttr(s)}"${s===m.defaultShift?' selected':''}>${esc(s)}</option>`).join('')}
      </select>
      <button class="del-team-btn" onclick="removeTeamMember('leads',${i})">🗑️</button>
    </div>`;
    h += `<div class="team-extra-fields">
      <div class="team-extra-row"><label>Días libres:</label><div class="team-daysoff-checks">
        ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d,idx)=>`<label class="team-daysoff-check"><input type="checkbox" ${(Array.isArray(m.daysOff)&&m.daysOff.includes(idx))?'checked':''} onchange="toggleDayOff('leads',${i},${idx})"> ${d}</label>`).join('')}
      </div></div>
      <div class="team-extra-row"><label>Máx cierres/sem:</label><input type="number" min="0" max="6" value="${typeof m.maxClosings==='number'?m.maxClosings:2}" style="width:50px" onchange="teamDraft.leads[${i}].maxClosings=parseInt(this.value)||0"></div>
      <div class="team-extra-row"><label>Máx aperturas/sem:</label><input type="number" min="0" max="6" value="${typeof m.maxOpenings==='number'?m.maxOpenings:2}" style="width:50px" onchange="teamDraft.leads[${i}].maxOpenings=parseInt(this.value)||0"></div>
      <div class="team-extra-row"><label>Prefiere mañana:</label><input type="checkbox" ${m.preferMorning?' checked':''} onchange="teamDraft.leads[${i}].preferMorning=this.checked"> <span style="font-size:.76rem;color:var(--text-muted)">Activo = turno mañana</span></div>
      <div class="team-extra-row"><label>Notas:</label><input type="text" value="${escAttr(m.notes||'')}" placeholder="Notas libres" style="flex:1" onchange="teamDraft.leads[${i}].notes=this.value"></div>
    </div>`;
  });
  h += `<button class="btn-add-member" onclick="addTeamMember('leads')">+ Añadir Lead</button>`;

  h += '<div class="team-section-title">👔 Managers</div>';
  teamDraft.managers.forEach((m, i) => {
    h += `<div class="team-member-row">
      <input type="text" placeholder="Nombre del Manager" value="${escAttr(m.name || '')}"
        oninput="teamDraft.managers[${i}].name=this.value;teamDraft.managers[${i}].shortName=makeShortName(this.value)">
      <select onchange="teamDraft.managers[${i}].defaultShift=this.value">
        ${shiftOpts.map(s => `<option value="${escAttr(s)}"${s===m.defaultShift?' selected':''}>${esc(s)}</option>`).join('')}
      </select>
      <select onchange="teamDraft.managers[${i}].defaultRole=this.value">
        <option value="Coach"${m.defaultRole==='Coach'?' selected':''}>Coach</option>
        <option value="Support"${m.defaultRole==='Support'?' selected':''}>Support</option>
        <option value="Ambos"${m.defaultRole==='Ambos'?' selected':''}>Ambos</option>
      </select>
      <button class="del-team-btn" onclick="removeTeamMember('managers',${i})">🗑️</button>
    </div>`;
    h += `<div class="team-extra-fields">
      <div class="team-extra-row"><label>Días libres:</label><div class="team-daysoff-checks">
        ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d,idx)=>`<label class="team-daysoff-check"><input type="checkbox" ${(Array.isArray(m.daysOff)&&m.daysOff.includes(idx))?'checked':''} onchange="toggleDayOff('managers',${i},${idx})"> ${d}</label>`).join('')}
      </div></div>
      <div class="team-extra-row"><label>Máx cierres/sem:</label><input type="number" min="0" max="6" value="${typeof m.maxClosings==='number'?m.maxClosings:2}" style="width:50px" onchange="teamDraft.managers[${i}].maxClosings=parseInt(this.value)||0"></div>
      <div class="team-extra-row"><label>Máx aperturas/sem:</label><input type="number" min="0" max="6" value="${typeof m.maxOpenings==='number'?m.maxOpenings:2}" style="width:50px" onchange="teamDraft.managers[${i}].maxOpenings=parseInt(this.value)||0"></div>
      <div class="team-extra-row"><label>Prefiere mañana:</label><input type="checkbox" ${m.preferMorning?' checked':''} onchange="teamDraft.managers[${i}].preferMorning=this.checked"> <span style="font-size:.76rem;color:var(--text-muted)">Activo = turno mañana</span></div>
      <div class="team-extra-row"><label>Notas:</label><input type="text" value="${escAttr(m.notes||'')}" placeholder="Notas libres" style="flex:1" onchange="teamDraft.managers[${i}].notes=this.value"></div>
    </div>`;
  });
  h += `<button class="btn-add-member" onclick="addTeamMember('managers')">+ Añadir Manager</button>`;

  body.innerHTML = h;
}

function addTeamMember(role) {
  const id = (role === 'leads' ? 'L' : 'M') + Date.now();
  const defaultShift = activeSeason === 'invierno' ? SHIFT_OPTIONS_INVIERNO[0] : SHIFT_OPTIONS_VERANO[0];
  if (role === 'leads') {
    teamDraft.leads.push({ id, name: '', shortName: '', defaultShift });
  } else {
    teamDraft.managers.push({ id, name: '', shortName: '', defaultShift, defaultRole: 'Coach' });
  }
  renderTeamModal();
}

function removeTeamMember(role, idx) {
  teamDraft[role].splice(idx, 1);
  renderTeamModal();
}

function saveTeamModal() {
  // Filter out blank entries, ensure shortName is generated
  teamDraft.leads    = teamDraft.leads.filter(m => m.name && m.name.trim());
  teamDraft.managers = teamDraft.managers.filter(m => m.name && m.name.trim());
  teamDraft.leads.forEach(m    => { if (!m.shortName) m.shortName = makeShortName(m.name); });
  teamDraft.managers.forEach(m => { if (!m.shortName) m.shortName = makeShortName(m.name); });
  teamData = teamDraft;
  saveTeam();
  closeTeamModal();
  // Auto-assign on all patterns with the updated team data
  for (let i = 0; i < 5; i++) autoAssignNames(i);
  saveState();
  render(activePattern);
}

// ── Name auto-assignment ─────────────────────────────────────────────────────
function autoAssignNames(patIdx) {
  const rows = currentState[patIdx];
  // Build sets of already-used IDs (to avoid double-assigning same person)
  const usedLeadIds = new Set(rows.filter(r => r.role === 'Lead'    && r.assignedId).map(r => r.assignedId));
  const usedMgrIds  = new Set(rows.filter(r => r.role === 'Manager' && r.assignedId).map(r => r.assignedId));
  for (const row of rows) {
    if (row.assignedId) continue; // respect existing manual assignments
    const isLead  = row.role === 'Lead';
    const members = isLead ? teamData.leads : teamData.managers;
    const usedIds = isLead ? usedLeadIds : usedMgrIds;
    const match = members.find(m => m.defaultShift === row.shift && !usedIds.has(m.id));
    if (match) { row.assignedId = match.id; usedIds.add(match.id); }
  }
}

// ── Name cell rendering ──────────────────────────────────────────────────────
function escAttr(str) {
  return esc(str).replace(/"/g, '&quot;');
}

// Returns the display name for a team member (shortName if set, otherwise full name).
function memberShortDisplay(member) {
  return member.shortName || member.name || '';
}

function renderNameCell(row) {
  if (!row.assignedId) return esc(row.role);
  const isLead = row.role === 'Lead';
  const member = isLead
    ? teamData.leads.find(m => m.id === row.assignedId)
    : teamData.managers.find(m => m.id === row.assignedId);
  if (!member) return esc(row.role);
  const roleCls = isLead ? 'role-lead' : 'role-mgr';
  return `<span class="name-short" title="${escAttr(member.name)}">${esc(memberShortDisplay(member))}</span>`
       + `<span class="name-role-label ${roleCls}">${esc(row.role)}</span>`;
}

// ── Manual assignment dropdown ────────────────────────────────────────────────
function openAssignDropdown(e, patIdx, rowIdx) {
  e.stopPropagation();
  closeAssignDropdown();
  const row     = currentState[patIdx][rowIdx];
  const isLead  = row.role === 'Lead';
  const members = isLead ? teamData.leads : teamData.managers;
  if (members.length === 0) return; // no team configured — nothing to show

  const drop = document.createElement('div');
  drop.className = 'assign-dropdown';

  let inner = `<div class="assign-dropdown-item unassign" onclick="assignPerson(${patIdx},${rowIdx},null)">— Sin asignar —</div>`;
  for (const m of members) {
    const active = row.assignedId === m.id ? ' active-assign' : '';
    // Use data attribute for id to avoid any escaping issues in inline handler
    inner += `<div class="assign-dropdown-item${active}" data-mid="${escAttr(m.id)}"
      onclick="assignPerson(${patIdx},${rowIdx},this.dataset.mid)">${esc(memberShortDisplay(m))}</div>`;
  }
  drop.innerHTML = inner;

  const rect = e.currentTarget.getBoundingClientRect();
  drop.style.top  = (rect.bottom + window.scrollY + 2) + 'px';
  drop.style.left = (rect.left   + window.scrollX) + 'px';
  document.body.appendChild(drop);
  activeAssignDropdown = drop;
  setTimeout(() => document.addEventListener('click', _closeAssignOnOutside, {once: true}), 50);
}

function _closeAssignOnOutside(e) {
  if (activeAssignDropdown && !activeAssignDropdown.contains(e.target)) closeAssignDropdown();
}

function closeAssignDropdown() {
  if (activeAssignDropdown) { activeAssignDropdown.remove(); activeAssignDropdown = null; }
}

function assignPerson(patIdx, rowIdx, memberId) {
  closeAssignDropdown();
  const row = currentState[patIdx][rowIdx];
  if (!memberId) {
    delete row.assignedId;
  } else {
    row.assignedId = memberId;
  }
  saveState();
  // Update only the affected col-role cell without full re-render
  const roleCell = document.querySelector(`tr[data-pat="${patIdx}"][data-row="${rowIdx}"] td.col-role`);
  if (roleCell) roleCell.innerHTML = renderNameCell(row);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS / VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
function getActiveRows(patIdx) {
  const rows = currentState[patIdx];
  return rows;
}

function validatePattern(patIdx) {
  const rows = getActiveRows(patIdx);
  const n = TIME_SLOTS.length;
  const alerts = [];
  const openEnd = getOpenEnd();
  const openStart = getOpenStart(patIdx);
  const BR = BUSINESS_RULES;

  // ── Build counts per slot ──────────────────────────────
  const counts = {
    Coach:      new Array(n).fill(0),
    Support:    new Array(n).fill(0),
    LDSup:      new Array(n).fill(0),
    Lunch:      new Array(n).fill(0),
    MEETING:    new Array(n).fill(0),
    Floor:      new Array(n).fill(0),
    MgrsOnFloor: new Array(n).fill(0),
  };

  for (const row of rows) {
    const isMgr = row.role === 'Manager';
    for (let c = 0; c < n; c++) {
      const a = row.acts[c];
      if (a === 'Coach')   { counts.Coach[c]++; counts.Floor[c]++; if (isMgr) counts.MgrsOnFloor[c]++; }
      if (a === 'Support') { counts.Support[c]++; counts.Floor[c]++; if (isMgr) counts.MgrsOnFloor[c]++; }
      if (a === 'LDSup')   { counts.LDSup[c]++; counts.Floor[c]++; }
      if (a === 'Lunch')   counts.Lunch[c]++;
      if (a === 'MEETING') counts.MEETING[c]++;
    }
  }

  // ── Peak hour indices ──────────────────────────────────
  const peakIndices = new Set();
  for (const ph of BR.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start);
    const e = TIME_SLOTS.indexOf(ph.end);
    if (s >= 0 && e >= 0) for (let i = s; i <= e; i++) peakIndices.add(i);
  }

  // ── Meeting slot indices (for Martes/Miércoles) ────────
  const meetingStart14 = TIME_SLOTS.indexOf('14:00');
  const meetingEnd16   = TIME_SLOTS.indexOf('16:00');
  const isMeetingPat   = patIdx === 1 || patIdx === 2;
  const meetingIndices = new Set();
  if (isMeetingPat && meetingStart14 >= 0 && meetingEnd16 >= 0) {
    for (let i = meetingStart14; i < meetingEnd16; i++) meetingIndices.add(i);
  }

  // ── Opening: min 2 people at first shift slot ─────────
  const openingCheckSlot = patIdx === 3 ? TIME_SLOTS.indexOf('08:00') : (patIdx === 4 ? TIME_SLOTS.indexOf('09:00') : TIME_SLOTS.indexOf('07:00'));
  const peopleAtOpening  = rows.filter(r => r.acts[openingCheckSlot] !== '').length;
  if (peopleAtOpening < BR.opening.minPeople) {
    alerts.push({type:'red', msg:`🔴 Apertura (${TIME_SLOTS[openingCheckSlot]}): solo ${peopleAtOpening} personas — mín ${BR.opening.minPeople}`});
  }

  // ── Closing: min 2 Leads + 1 Manager at store close ──
  const closeSlot = openEnd;
  const leadsAtClose = rows.filter(r => r.role === 'Lead' && r.acts[closeSlot] !== '').length;
  const mgrsAtClose  = rows.filter(r => r.role === 'Manager' && r.acts[closeSlot] !== '').length;
  if (leadsAtClose < BR.closing.minLeads || mgrsAtClose < BR.closing.minManagers) {
    alerts.push({type:'red', msg:`🔴 Cierre (${TIME_SLOTS[closeSlot]}): ${leadsAtClose} Leads + ${mgrsAtClose} Mgr — mín ${BR.closing.minLeads} Leads + ${BR.closing.minManagers} Mgr`});
  }

  // ── Slot-by-slot validation during opening ─────────────
  const ddSlot = TIME_SLOTS.indexOf(BR.dd.time);  // 09:15 — everyone does DD, no floor coverage expected
  for (let c = openStart; c <= openEnd; c++) {
    if (c === ddSlot) continue;  // skip DD slot: no floor coverage expected (whole team does DD)
    const inMeeting   = meetingIndices.has(c);
    const floorVal    = counts.Floor[c];
    const mgrsOnFloor = counts.MgrsOnFloor[c];

    // 🔴 Floor = 0
    if (floorVal === 0) {
      alerts.push({type:'red', msg:`🚨 Sin cobertura en floor a las ${TIME_SLOTS[c]}`});
    }
    // 🔴 Floor < 4 (minimum absolute)
    else if (floorVal < BR.coverage.lunchTrans.totalFloor) {
      alerts.push({type:'red', msg:`⚠️ Floor muy bajo (${floorVal}) a las ${TIME_SLOTS[c]} — mín absoluto ${BR.coverage.lunchTrans.totalFloor}`});
    }

    // 🔴 Managers en floor < 2
    if (!inMeeting && mgrsOnFloor < BR.coverage.minMgrsOnFloor) {
      alerts.push({type:'red', msg:`👔 Solo ${mgrsOnFloor} Manager(s) en floor a las ${TIME_SLOTS[c]} — mín ${BR.coverage.minMgrsOnFloor}`});
    }

    // 🔴 Menos de 2 Coach en floor (fuera de reuniones)
    if (!inMeeting && counts.Coach[c] < 2) {
      alerts.push({type:'red', msg:`🎓 Solo ${counts.Coach[c]} Coach en floor a las ${TIME_SLOTS[c]} — mín 2`});
    }

    // 🟠 Peak hour floor < 6
    if (peakIndices.has(c) && !inMeeting && floorVal < BR.coverage.normal.totalFloor) {
      alerts.push({type:'orange', msg:`⏰ Hora pico con floor bajo (${floorVal}) a las ${TIME_SLOTS[c]} — recomendado ${BR.coverage.normal.totalFloor}`});
    }

    // 🟠 Lunch > maxSimultaneous
    if (counts.Lunch[c] > BR.lunch.maxSimultaneous) {
      alerts.push({type:'orange', msg:`🍽️ ${counts.Lunch[c]} personas en Lunch a las ${TIME_SLOTS[c]} — máx ${BR.lunch.maxSimultaneous}`});
    }
  }

  // ── Per-person validation ──────────────────────────────
  const lunchWinStart = TIME_SLOTS.indexOf(BR.lunch.windowStart);
  const lunchWinEnd   = TIME_SLOTS.indexOf(BR.lunch.windowEnd);

  for (const row of rows) {
    const [si, ei] = shiftIndices(row.shift);
    const isLead = row.role === 'Lead';
    const floorActs = isLead ? ['LDSup'] : ['Coach', 'Support'];
    const mgmtActs  = isLead ? ['LDOPS'] : ['AOR'];

    // 🔴 Activity outside shift
    for (let c = 0; c < n; c++) {
      const a = row.acts[c];
      if (a !== '' && (c < si || c >= ei)) {
        alerts.push({type:'red', msg:`⛔ ${row.role} (${row.shift}) tiene actividad "${a}" fuera de su turno a las ${TIME_SLOTS[c]}`});
      }
    }

    // 🔴 No lunch
    const lunchSlots = [];
    for (let c = si; c < ei; c++) { if (row.acts[c] === 'Lunch') lunchSlots.push(c); }
    if (lunchSlots.length === 0) {
      alerts.push({type:'red', msg:`🍽️ ${row.role} (${row.shift}) no tiene Lunch asignado`});
    }

    // 🟠 Lunch outside window 11:00-17:00 (firstLunch must be within window)
    if (lunchSlots.length > 0) {
      const firstLunch = Math.min(...lunchSlots);
      if (firstLunch < lunchWinStart || firstLunch > lunchWinEnd) {
        alerts.push({type:'orange', msg:`⏰ ${row.role} (${row.shift}) tiene Lunch fuera de la ventana ${BR.lunch.windowStart}-${BR.lunch.windowEnd}`});
      }
    }

    // 🔴 Manager mezcla Coach y Support en el mismo día
    if (row.role === 'Manager') {
      let hasCoach = false, hasSupport = false;
      for (let c = si; c < ei; c++) {
        if (row.acts[c] === 'Coach') hasCoach = true;
        if (row.acts[c] === 'Support') hasSupport = true;
      }
      if (hasCoach && hasSupport) {
        alerts.push({type:'red', msg:`⚠️ Manager (${row.shift}) mezcla Coach y Support en el mismo día`});
      }
    }

    // 🟡 Short floor blocks (<2h = <4 consecutive slots)
    let floorBlock = 0, maxFloorBlock = 0;
    for (let c = si; c < ei; c++) {
      if (floorActs.includes(row.acts[c])) { floorBlock++; maxFloorBlock = Math.max(maxFloorBlock, floorBlock); }
      else floorBlock = 0;
    }
    if (maxFloorBlock > 0 && maxFloorBlock < BR.blocks.minFloorBlockSlots) {
      alerts.push({type:'yellow', msg:`🧱 ${row.role} (${row.shift}) tiene bloque de floor corto (${maxFloorBlock / 2}h) — mín ${BR.blocks.minFloorBlockSlots / 2}h`});
    }

    // 🟡 AOR/LDOPS fragmented in >2 blocks
    let mgmtBlocks = 0, inMgmtBlock = false;
    for (let c = si; c < ei; c++) {
      const isMgmtSlot = mgmtActs.includes(row.acts[c]) || row.acts[c] === 'MEETING';
      if (isMgmtSlot && !inMgmtBlock) { mgmtBlocks++; inMgmtBlock = true; }
      else if (!isMgmtSlot) inMgmtBlock = false;
    }
    if (mgmtBlocks > BR.blocks.maxAorBlocks) {
      const actName = isLead ? 'LDOPS' : 'AOR';
      alerts.push({type:'yellow', msg:`📦 ${row.role} (${row.shift}) tiene ${actName} fragmentado en ${mgmtBlocks} bloques — máx ${BR.blocks.maxAorBlocks}`});
    }
  }

  // ── Staffing validation ────────────────────────────────
  const staffRule = BR.staffing[patIdx];
  if (staffRule) {
    const actualLeads = rows.filter(r => r.role === 'Lead').length;
    const actualMgrs  = rows.filter(r => r.role === 'Manager').length;
    const minLeads = Array.isArray(staffRule.leads) ? staffRule.leads[0] : staffRule.leads;
    const minMgrs  = Array.isArray(staffRule.managers) ? staffRule.managers[0] : staffRule.managers;
    if (actualLeads < minLeads) {
      alerts.push({type:'orange', msg:`👥 Leads insuficientes: ${actualLeads} (mín ${minLeads}) para ${staffRule.name}`});
    }
    if (actualMgrs < minMgrs) {
      alerts.push({type:'orange', msg:`👥 Managers insuficientes: ${actualMgrs} (mín ${minMgrs}) para ${staffRule.name}`});
    }
    if (staffRule.minTotal && (actualLeads + actualMgrs) < staffRule.minTotal) {
      alerts.push({type:'orange', msg:`👥 Personal insuficiente: ${actualLeads + actualMgrs} personas (mín ${staffRule.minTotal}) para ${staffRule.name}`});
    }
  }

  // ── Meeting alignment ──────────────────────────────────
  const meetingSlotMap = {};
  for (const row of rows) {
    const mySlots = [];
    for (let c = 0; c < n; c++) { if (row.acts[c] === 'MEETING') mySlots.push(c); }
    if (mySlots.length > 0) {
      const key = mySlots.join(',');
      meetingSlotMap[key] = (meetingSlotMap[key] || 0) + 1;
    }
  }
  if (Object.keys(meetingSlotMap).length > 1) {
    alerts.push({type:'red', msg:'⏰ Las reuniones no están a la misma hora para todos los asistentes'});
  }

  // ── Meeting exceptions validation ─────────────────────
  if (isMeetingPat && meetingStart14 >= 0) {
    if (patIdx === 1) {
      const mgrSupportInFloor = rows.filter(r => r.role === 'Manager' && ['Coach','Support'].includes(r.acts[meetingStart14])).length;
      const leadOnFloor       = rows.filter(r => r.role === 'Lead' && r.acts[meetingStart14] === 'LDSup').length;
      if (mgrSupportInFloor < BR.meetings.martes.exceptions.mgrSupport) {
        alerts.push({type:'orange', msg:`📋 Martes: solo ${mgrSupportInFloor} Mgr en floor durante reunión — deben ser ${BR.meetings.martes.exceptions.mgrSupport}`});
      }
      if (leadOnFloor < BR.meetings.martes.exceptions.leadFloor) {
        alerts.push({type:'orange', msg:`📋 Martes: solo ${leadOnFloor} Lead en floor durante reunión — debe ser ${BR.meetings.martes.exceptions.leadFloor}`});
      }
    }
    if (patIdx === 2) {
      const leadsOnFloor = rows.filter(r => r.role === 'Lead' && r.acts[meetingStart14] === 'LDSup').length;
      if (leadsOnFloor < BR.meetings.miercoles.leadsCoverFloor) {
        alerts.push({type:'orange', msg:`📋 Miércoles: solo ${leadsOnFloor} Lead(s) en floor durante reunión — deben ser ${BR.meetings.miercoles.leadsCoverFloor}+`});
      }
      // 🔴 Miércoles: 1 Manager debe quedarse en floor durante la reunión
      const mgrOnFloor = rows.filter(r => r.role === 'Manager' && ['Coach','Support'].includes(r.acts[meetingStart14])).length;
      if (mgrOnFloor < BR.meetings.miercoles.exceptions.mgrFloor) {
        alerts.push({type:'red', msg:`🔴 Miércoles: no hay Manager en floor durante Leadership Meeting — debe haber ${BR.meetings.miercoles.exceptions.mgrFloor}`});
      }
    }
  }

  return alerts;
}

let alertDrawerOpen = false;

function toggleAlertDrawer() {
  alertDrawerOpen = !alertDrawerOpen;
  const drawer = document.getElementById('alert-drawer');
  const btn    = document.getElementById('alert-drawer-btn');
  if (drawer) drawer.classList.toggle('open', alertDrawerOpen);
  if (btn) btn.textContent = alertDrawerOpen ? '▲' : '▼';
}

function renderAlerts(patIdx) {
  const allAlerts = validatePattern(patIdx);
  const badge   = document.getElementById('alerts-badge');
  const summary = document.getElementById('alert-drawer-summary');
  const list    = document.getElementById('alert-drawer-list');
  const n        = allAlerts.length;
  const critical = allAlerts.filter(a => a.type === 'red').length;
  const warnings = allAlerts.filter(a => a.type === 'orange').length;
  const info     = n - critical - warnings;
  // Badge
  if (badge) { badge.textContent = n; badge.className = 'alert-badge' + (n === 0 ? ' ok' : ''); }
  // Summary bar
  if (summary) {
    if (n === 0) {
      summary.innerHTML = '✅ <strong>Sin alertas</strong> — el patrón cumple todas las reglas';
      summary.style.color = 'var(--green)';
    } else {
      const parts = [];
      if (critical > 0) parts.push(`<span style="color:var(--red);font-weight:800">🔴 ${critical} crítica${critical>1?'s':''}</span>`);
      if (warnings > 0) parts.push(`<span style="color:var(--orange);font-weight:700">🟠 ${warnings} aviso${warnings>1?'s':''}</span>`);
      if (info > 0)     parts.push(`<span style="color:var(--yellow);font-weight:600">🟡 ${info} info</span>`);
      const hint = alertDrawerOpen ? 'ocultar' : 'ver detalles';
      summary.innerHTML = `🔔 <strong>${n} alerta${n>1?'s':''}</strong>: ${parts.join(' · ')} <em style="font-size:.75rem;color:var(--text-muted);margin-left:8px">— clic para ${hint}</em>`;
      summary.style.color = 'var(--text)';
    }
  }
  // List
  if (list) {
    list.innerHTML = allAlerts.map(a =>
      `<div class="alert alert-${a.type}">${a.msg}<button class="dismiss" onclick="this.closest('.alert').remove()">✕</button></div>`
    ).join('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════════════
function buildScheduleTable(patIdx) {
  const rows = currentState[patIdx];
  const leads = rows.filter(r=>r.role==='Lead');
  const mgrs = rows.filter(r=>r.role==='Manager');
  const totalCols = 1 + 1 + 1 + TIME_SLOTS.length + 1 + 1; // drag+role+shift+slots+hours+actions
  let h = '<div class="table-wrapper"><table id="sched-table"><thead><tr class="header-row">';
  h += '<th class="col-drag"></th><th class="col-role">Rol</th><th class="col-shift">Turno ✏️</th>';
  for (const t of TIME_SLOTS) h += `<th class="time-slot"><div class="rw"><span>${t}</span></div></th>`;
  h += '<th class="col-hours">Horas</th><th class="col-actions"></th>';
  h += '</tr></thead><tbody>';
  h += '<tr class="apertura-row"><td class="col-drag"></td><td class="col-role">Horario</td><td class="col-shift">Apertura</td>';
  for (let i=0;i<TIME_SLOTS.length;i++) h += i>=getOpenStart(patIdx)&&i<=getOpenEnd()?'<td class="open-slot">▶</td>':'<td></td>';
  h += '<td class="col-hours"></td><td class="col-actions"></td></tr>';
  h += `<tr class="group-label-row"><td colspan="${totalCols}">👤 Leads (${leads.length})</td></tr>`;
  leads.forEach(row => { h += buildPersonRow(patIdx, rows.indexOf(row), row, 'lead-row'); });
  h += `<tr class="section-sep"><td colspan="${totalCols}"></td></tr>`;
  h += `<tr class="group-label-row"><td colspan="${totalCols}">👔 Managers (${mgrs.length})</td></tr>`;
  mgrs.forEach(row => { h += buildPersonRow(patIdx, rows.indexOf(row), row, 'mgr-row'); });
  h += '</tbody></table></div>';
  return h;
}

function calcPersonHours(row) {
  const [si, ei] = shiftIndices(row.shift);
  let coach = 0, support = 0, ldSup = 0, ldops = 0, aor = 0, lunch = 0;
  for (let c = si; c < ei; c++) {
    const a = row.acts[c];
    if (a === 'Coach')   coach++;
    else if (a === 'Support') support++;
    else if (a === 'LDSup') ldSup++;
    else if (a === 'LDOPS') ldops++;
    else if (a === 'AOR')  aor++;
    else if (a === 'Lunch') lunch++;
  }
  return { coach:coach*.5, support:support*.5, ldSup:ldSup*.5, ldops:ldops*.5, aor:aor*.5, lunch:lunch*.5 };
}

function buildHoursCell(row) {
  const h = calcPersonHours(row);
  const isLead = row.role === 'Lead';
  let out = '';
  if (isLead) {
    if (h.ldSup > 0) out += `<span class="hours-badge hours-floor">${h.ldSup}h LDSup</span><br>`;
    if (h.ldops > 0) out += `<span class="hours-badge hours-mgmt">${h.ldops}h LDOPS</span>`;
  } else {
    if (h.coach > 0)   out += `<span class="hours-badge hours-floor">${h.coach}h Coach</span><br>`;
    if (h.support > 0) out += `<span class="hours-badge hours-floor">${h.support}h Sup</span><br>`;
    if (h.aor > 0)     out += `<span class="hours-badge hours-mgmt">${h.aor}h AOR</span>`;
  }
  return out || `<span style="color:var(--text-light);font-size:9px">–</span>`;
}

function buildPersonRow(patIdx, rowIdx, row, cls) {
  let h = `<tr class="${cls}" data-pat="${patIdx}" data-row="${rowIdx}" draggable="true" ondragstart="onDragStart(event,${patIdx},${rowIdx})" ondragover="onDragOver(event)" ondrop="onDrop(event,${patIdx},${rowIdx})" ondragleave="onDragLeave(event)">`;
  h += `<td class="col-drag"><span class="drag-handle" title="Arrastrar para reordenar">⠿</span></td>`;
  h += `<td class="col-role name-cell-wrap" onclick="openAssignDropdown(event,${patIdx},${rowIdx})" title="Clic para asignar nombre">${renderNameCell(row)}<button class="drill-btn" onclick="event.stopPropagation();openPersonDrilldown(${patIdx},${rowIdx})" title="Ver detalle de esta persona" aria-label="Ver detalle">ℹ</button></td>`;
  h += `<td class="col-shift" onclick="openShiftEdit(event,${patIdx},${rowIdx})" title="Clic para editar turno"><span class="shift-text">${esc(row.shift)}</span><span class="shift-edit-icon">✏️</span></td>`;
  for (let c=0;c<TIME_SLOTS.length;c++) {
    const a=row.acts[c], bg=getColor(a), fg=textColor(bg);
    const draggable = a ? ' draggable="true"' : '';
    h += `<td class="act-cell"${draggable} data-pat="${patIdx}" data-row="${rowIdx}" data-col="${c}" style="background:${bg};color:${fg}" onclick="cellClick(event,${patIdx},${rowIdx},${c})">${esc(a)}</td>`;
  }
  h += `<td class="col-hours" data-hours-row="${rowIdx}">${buildHoursCell(row)}</td>`;
  h += `<td class="col-actions"><button class="del-btn" title="Eliminar persona" onclick="deletePerson(${patIdx},${rowIdx})">✕</button></td>`;
  return h+'</tr>';
}

// ── Summary ──────────────────────────────────────────────────────────────────
function calcSummaryForRows(rows) {
  const n = TIME_SLOTS.length;
  const c = {LDSup:new Array(n).fill(0),LDOPS:new Array(n).fill(0),Coach:new Array(n).fill(0),MgrSup:new Array(n).fill(0),AOR:new Array(n).fill(0),Lunch:new Array(n).fill(0),DD:new Array(n).fill(0),MEETING:new Array(n).fill(0)};
  for (const row of rows) {
    for (let i=0;i<n;i++) {
      const a=row.acts[i];
      if (a==='LDSup') c.LDSup[i]++;
      else if (a==='LDOPS') c.LDOPS[i]++;
      else if (a==='Coach') c.Coach[i]++;
      else if (a==='Support'&&row.role==='Manager') c.MgrSup[i]++;
      else if (a==='AOR') c.AOR[i]++;
      else if (a==='Lunch') c.Lunch[i]++;
      else if (a==='DD') c.DD[i]++;
      else if (a==='MEETING') c.MEETING[i]++;
    }
  }
  const TotalSupport = c.LDSup.map((v,i)=>v+c.MgrSup[i]);
  const TotalFloor = TotalSupport.map((v,i)=>v+c.Coach[i]);
  const MgrsOnFloor = c.Coach.map((v,i)=>v+c.MgrSup[i]);
  const hasMeeting = c.MEETING.some(v=>v>0);
  return {counts:c, TotalSupport, TotalFloor, MgrsOnFloor, hasMeeting};
}

function calcSummary(patIdx) {
  return calcSummaryForRows(getActiveRows(patIdx));
}

function buildSummaryTable(patIdx) {
  const {counts:c, TotalSupport, TotalFloor, MgrsOnFloor, hasMeeting} = calcSummary(patIdx);
  const n = TIME_SLOTS.length;
  function heatCls(v, max) {
    if (v===0) return '';
    const pct = max>0 ? v/max : 0;
    if (pct<=0.25) return 'sum-heat-low';
    if (pct<=0.5) return 'sum-heat-med';
    if (pct<=0.75) return 'sum-heat-high';
    return 'sum-heat-max';
  }
  function mkRow(label, arr, extra='', heat=false) {
    const mx = heat ? Math.max(...arr) : 0;
    let r = `<tr class="${extra}"><td class="sum-label">${label}</td>`;
    for (let i=0;i<n;i++) {
      const v=arr[i];
      let cls = v===0?'sum-zero':'sum-pos';
      if (extra==='sum-total' && v===0 && i>=getOpenStart(patIdx) && i<=getOpenEnd()) cls='sum-alert';
      if (heat && v>0) cls += ' ' + heatCls(v, mx);
      r += `<td class="sum-val ${cls}">${v===0?'':v}</td>`;
    }
    return r+'</tr>';
  }
  let h = '<div class="summary-section"><h3>📊 Resumen · ' + getSeasonLabel() + '</h3><table class="summary-table"><thead><tr>';
  h += '<th class="sum-label">Actividad</th>';
  for (const t of TIME_SLOTS) h += `<th>${t}</th>`;
  h += '</tr></thead><tbody>';
  h += mkRow('LDSup (Leads)',c.LDSup,'',true);
  h += mkRow('LDOPS',c.LDOPS);
  h += mkRow('Coach',c.Coach,'',true);
  h += mkRow('MGR Support',c.MgrSup,'',true);
  h += mkRow('AOR',c.AOR);
  h += mkRow('Lunch',c.Lunch);
  h += mkRow('DD',c.DD);
  if (hasMeeting) h += mkRow('MEETING',c.MEETING);
  h += `<tr class="sum-sep"><td class="sum-label"></td>${'<td></td>'.repeat(n)}</tr>`;
  h += mkRow('Total Support (LDSup+MGR)',TotalSupport,'sum-total',true);
  h += mkRow('Total Coach',c.Coach,'sum-total',true);
  h += mkRow('Total Floor (Sup+Coach)',TotalFloor,'sum-total',true);
  h += mkRow('Mgrs on Floor (Coach+Sup)',MgrsOnFloor,'sum-total',true);
  h += '</tbody></table></div>';
  return h;
}

// ── Coverage Chart ───────────────────────────────────────────────────────────
function buildCoverageChart(patIdx) {
  const { counts: c, TotalFloor } = calcSummary(patIdx);
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const n         = TIME_SLOTS.length;
  const CHART_H   = 200;

  // Max Y: highest floor value during open hours + 2
  let peakFloor = 0;
  for (let i = openStart; i <= openEnd; i++) {
    if (TotalFloor[i] > peakFloor) peakFloor = TotalFloor[i];
  }
  const maxFloor = peakFloor + 2;

  // Meeting zone (Martes patIdx=1, Miércoles patIdx=2): 14:00–15:30 slots (indices 15–18, exclusive end at index 19 = 16:00)
  const meetingZoneStart = TIME_SLOTS.indexOf('14:00'); // idx 15
  const meetingZoneEnd   = TIME_SLOTS.indexOf('16:00'); // idx 19, exclusive boundary
  const isMeetingPat     = patIdx === 1 || patIdx === 2;
  const meetingIndices   = new Set();
  if (isMeetingPat && meetingZoneStart >= 0 && meetingZoneEnd >= 0) {
    for (let i = meetingZoneStart; i < meetingZoneEnd; i++) meetingIndices.add(i);
  }
  const firstMeetingIdx = meetingIndices.size > 0 ? Math.min(...meetingIndices) : -1;

  // Reference line positions (bottom offset in px)
  const minAbsVal   = BUSINESS_RULES.coverage.lunchTrans.totalFloor;
  const objetivoVal = BUSINESS_RULES.coverage.floorObjetivo || BUSINESS_RULES.coverage.normal.totalFloor;
  const maxVal      = BUSINESS_RULES.coverage.floorMaximo || 0;
  const px = v => maxFloor > 0 ? Math.round((v / maxFloor) * CHART_H) : 0;
  const minAbsBot  = px(minAbsVal);
  const normBot    = px(objetivoVal);
  const maxBot     = maxVal > 0 ? px(maxVal) : -1;

  // Y-axis ticks (every 2 units)
  let yAxisHtml = '';
  for (let v = 0; v <= maxFloor; v += 2) {
    yAxisHtml += `<div class="chart-y-tick" style="bottom:${px(v)}px">${v}</div>`;
  }

  // Bars
  let barsHtml = '';
  for (let i = 0; i < n; i++) {
    const ldsup   = c.LDSup[i];
    const support = c.MgrSup[i];
    const coach   = c.Coach[i];
    const total   = ldsup + support + coach;
    const isOut   = i < openStart || i > openEnd;
    const isMtg   = meetingIndices.has(i);

    const ldsupPx   = px(ldsup);
    const supportPx = px(support);
    const coachPx   = px(coach);

    // Meeting zone: diagonal-stripe overlay + label on first slot
    const mtgOverlay = isMtg
      ? `<div class="chart-meeting-overlay"></div>`
      : '';
    const mtgLabel = (isMtg && i === firstMeetingIdx)
      ? `<div class="chart-meeting-label">📋 Reunión</div>`
      : '';

    barsHtml += `<div class="chart-bar${isOut ? ' outside-hours' : ''}"` +
      ` data-time="${esc(TIME_SLOTS[i])}" data-ldsup="${ldsup}" data-support="${support}" data-coach="${coach}" data-total="${total}"` +
      ` style="height:${CHART_H}px"` +
      ` onmouseenter="showChartTooltip(event,this)" onmouseleave="hideChartTooltip()" onmousemove="moveChartTooltip(event)">` +
      mtgLabel + mtgOverlay +
      (coachPx   > 0 ? `<div class="bar-segment bar-coach"   style="height:${coachPx}px"></div>` : '') +
      (supportPx > 0 ? `<div class="bar-segment bar-support" style="height:${supportPx}px"></div>` : '') +
      (ldsupPx   > 0 ? `<div class="bar-segment bar-ldsup"   style="height:${ldsupPx}px"></div>` : '') +
      `</div>`;
  }

  // X-axis labels
  let xHtml = '';
  for (const t of TIME_SLOTS) {
    xHtml += `<div class="chart-x-label"><span>${esc(t)}</span></div>`;
  }

  // Reference lines (absolute positioned inside .chart-bars)
  const refLines =
    `<div style="position:absolute;left:0;right:0;bottom:${minAbsBot}px;height:0;border-top:2px dashed #E53E3E;z-index:4;pointer-events:none">` +
    `<span style="position:absolute;right:2px;top:-10px;font-size:9px;font-weight:700;color:#E53E3E">mín ${minAbsVal}</span></div>` +
    `<div style="position:absolute;left:0;right:0;bottom:${normBot}px;height:0;border-top:2px dashed #DD6B20;z-index:4;pointer-events:none">` +
    `<span style="position:absolute;right:2px;top:-10px;font-size:9px;font-weight:700;color:#DD6B20">objetivo ${objetivoVal}</span></div>` +
    (maxBot > 0 ? `<div style="position:absolute;left:0;right:0;bottom:${maxBot}px;height:0;border-top:2px dashed #38a169;z-index:4;pointer-events:none">` +
    `<span style="position:absolute;right:2px;top:-10px;font-size:9px;font-weight:700;color:#38a169">máx ${maxVal}</span></div>` : '');

  return `<div class="coverage-chart">
    <h3>📊 Cobertura Visual</h3>
    <div class="chart-wrap">
      <div class="chart-y-axis" style="height:${CHART_H}px">${yAxisHtml}</div>
      <div class="chart-scroll">
        <div class="chart-area chart-area-fill">
          <div class="chart-bars" style="height:${CHART_H}px">${refLines}${barsHtml}</div>
          <div class="chart-x-axis">${xHtml}</div>
        </div>
      </div>
    </div>
    <div class="chart-legend">
      <div class="chart-legend-item"><div class="chart-legend-swatch" style="background:#4A90D9"></div><span>LDSup</span></div>
      <div class="chart-legend-item"><div class="chart-legend-swatch" style="background:#F5A623"></div><span>Support</span></div>
      <div class="chart-legend-item"><div class="chart-legend-swatch" style="background:#7BC67E"></div><span>Coach</span></div>
      <div class="chart-legend-item"><span style="color:#E53E3E;font-size:11px">- - mín ${minAbsVal} (absoluto)</span></div>
      <div class="chart-legend-item"><span style="color:#DD6B20;font-size:11px">- - objetivo ${objetivoVal}</span></div>
      ${maxVal > 0 ? `<div class="chart-legend-item"><span style="color:#38a169;font-size:11px">- - máx ${maxVal}</span></div>` : ''}
    </div>
  </div>`;
}

// ── Chart Tooltip helpers ────────────────────────────────────────────────────
function showChartTooltip(e, bar) {
  const tt = document.getElementById('chart-tooltip-box');
  if (!tt) return;
  const time    = bar.dataset.time;
  const ldsup   = +bar.dataset.ldsup;
  const support = +bar.dataset.support;
  const coach   = +bar.dataset.coach;
  const total   = +bar.dataset.total;
  const minAbs  = BUSINESS_RULES.coverage.lunchTrans.totalFloor;
  const minNorm = BUSINESS_RULES.coverage.normal.totalFloor;
  const icon    = total < minAbs ? '🔴' : (total < minNorm ? '⚠️' : '✅');
  tt.innerHTML =
    `<div class="chart-tooltip-time">${esc(time)}</div>` +
    `<div class="chart-tooltip-div"></div>` +
    `<div>LDSup: ${ldsup}</div>` +
    `<div>Support: ${support}</div>` +
    `<div>Coach: ${coach}</div>` +
    `<div class="chart-tooltip-div"></div>` +
    `<div class="chart-tooltip-total">Total Floor: ${total} ${icon}</div>`;
  tt.classList.add('visible');
  moveChartTooltip(e);
}

function hideChartTooltip() {
  const tt = document.getElementById('chart-tooltip-box');
  if (tt) tt.classList.remove('visible');
}

function moveChartTooltip(e) {
  const tt = document.getElementById('chart-tooltip-box');
  if (!tt || !tt.classList.contains('visible')) return;
  tt.style.left = (e.clientX + 14) + 'px';
  tt.style.top  = (e.clientY - 10) + 'px';
}

function buildLegend() {
  let h = '<div class="legend">';
  for (const [act,color] of Object.entries(COLORS)) {
    h += `<div class="legend-item"><div class="legend-swatch" style="background:${color}"></div><span>${act===''?'(vacío)':act}</span></div>`;
  }
  return h+'</div>';
}

function buildRulesSection() {
  let h = '<div class="rules-section"><h3>📋 Reglas y Notas</h3>';
  if (rules.length===0) { h += '<p class="no-rules">No hay reglas definidas. Usa el botón "📋 Reglas" para añadir.</p>'; }
  else {
    rules.forEach((r,i) => {
      h += `<div class="rule-card ${r.highlight?'highlighted':''}">
        <span class="rule-day">${esc(r.day)}</span>
        <span class="rule-text">${esc(r.text)}</span>
        <button class="rule-delete" onclick="deleteRule(${i})">✕</button>
      </div>`;
    });
  }
  return h+'</div>';
}

// ── Score de Cobertura ────────────────────────────────────────────────────────
function calculateScoreForRows(rows, patIdx) {
  const n = TIME_SLOTS.length;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const BR = BUSINESS_RULES;

  // Build counts per slot
  const counts = {
    Coach:      new Array(n).fill(0),
    Support:    new Array(n).fill(0),
    LDSup:      new Array(n).fill(0),
    Lunch:      new Array(n).fill(0),
    Floor:      new Array(n).fill(0),
    MgrsOnFloor: new Array(n).fill(0),
  };
  for (const row of rows) {
    const isMgr = row.role === 'Manager';
    for (let c = 0; c < n; c++) {
      const a = row.acts[c];
      if (a === 'Coach')   { counts.Coach[c]++; counts.Floor[c]++; if (isMgr) counts.MgrsOnFloor[c]++; }
      if (a === 'Support') { counts.Support[c]++; counts.Floor[c]++; if (isMgr) counts.MgrsOnFloor[c]++; }
      if (a === 'LDSup')   { counts.LDSup[c]++; counts.Floor[c]++; }
      if (a === 'Lunch')   counts.Lunch[c]++;
    }
  }

  // Peak hour indices
  const peakIndices = new Set();
  for (const ph of BR.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start);
    const e = TIME_SLOTS.indexOf(ph.end);
    if (s >= 0 && e >= 0) for (let i = s; i <= e; i++) peakIndices.add(i);
  }

  const numOpenSlots = openEnd - openStart + 1;
  const maxSlotPoints = 6 * numOpenSlots;
  if (numOpenSlots === 0) return { score: 0, obtained: 0, max: 0, details: [] };

  // Per-slot scoring
  let slotPointsObtained = 0;
  let coverageOk = 0, coachOk = 0, mgrsFloorOk = 0, lunchesOk = 0;
  let zeroFloorSlots = 0, peakLowSlots = 0;

  for (let c = openStart; c <= openEnd; c++) {
    const floor  = counts.Floor[c];
    const coach  = counts.Coach[c];
    const mgrs   = counts.MgrsOnFloor[c];
    const lunches = counts.Lunch[c];

    // Floor coverage: +2 if >= 6, +1 if 4-5, 0 if < 4
    if (floor >= BR.coverage.normal.totalFloor)       { slotPointsObtained += 2; coverageOk++; }
    else if (floor >= BR.coverage.lunchTrans.totalFloor) slotPointsObtained += 1;

    // Coach: +2 if >= 2, +1 if == 1, 0 if 0
    if (coach >= 2)      { slotPointsObtained += 2; coachOk++; }
    else if (coach === 1)  slotPointsObtained += 1;

    // Managers on floor: +1 if >= 2
    if (mgrs >= BR.coverage.minMgrsOnFloor) { slotPointsObtained += 1; mgrsFloorOk++; }

    // Lunches: +1 if <= max simultaneous
    if (lunches <= BR.lunch.maxSimultaneous) { slotPointsObtained += 1; lunchesOk++; }

    if (floor === 0)                                                      zeroFloorSlots++;
    if (peakIndices.has(c) && floor < BR.coverage.normal.totalFloor)     peakLowSlots++;
  }

  // Bonuses
  let bonusPoints = 0;
  const openingCheckSlot = patIdx === 3 ? TIME_SLOTS.indexOf('08:00') : (patIdx === 4 ? TIME_SLOTS.indexOf('09:00') : TIME_SLOTS.indexOf('07:00'));
  const peopleAtOpening  = rows.filter(r => r.acts[openingCheckSlot] !== '').length;
  const openingOk = peopleAtOpening >= BR.opening.minPeople;
  if (openingOk) bonusPoints += 5;

  const leadsAtClose = rows.filter(r => r.role === 'Lead'    && r.acts[openEnd] !== '').length;
  const mgrsAtClose  = rows.filter(r => r.role === 'Manager' && r.acts[openEnd] !== '').length;
  const closingOk = leadsAtClose >= BR.closing.minLeads && mgrsAtClose >= BR.closing.minManagers;
  if (closingOk) bonusPoints += 5;

  let mixingManagers = 0, consistentManagers = 0;
  for (const row of rows) {
    if (row.role !== 'Manager') continue;
    const [si, ei] = shiftIndices(row.shift);
    let hasCoach = false, hasSupport = false;
    for (let c = si; c < ei; c++) {
      if (row.acts[c] === 'Coach')   hasCoach   = true;
      if (row.acts[c] === 'Support') hasSupport = true;
    }
    if (hasCoach && hasSupport) { mixingManagers++; }
    else { consistentManagers++; bonusPoints += 3; }
  }

  const lunchWinStart = TIME_SLOTS.indexOf(BR.lunch.windowStart);
  const lunchWinEnd   = TIME_SLOTS.indexOf(BR.lunch.windowEnd);
  let lunchesInWindow = true;
  for (const row of rows) {
    const [si, ei] = shiftIndices(row.shift);
    const lunchSlots = [];
    for (let c = si; c < ei; c++) { if (row.acts[c] === 'Lunch') lunchSlots.push(c); }
    if (lunchSlots.length > 0) {
      const firstLunch = Math.min(...lunchSlots);
      if (firstLunch < lunchWinStart || firstLunch > lunchWinEnd) { lunchesInWindow = false; break; }
    }
  }
  if (lunchesInWindow) bonusPoints += 2;

  // Penalties
  let penaltyPoints = 0;
  penaltyPoints += zeroFloorSlots * 10;
  if (mixingManagers > 0) penaltyPoints += 5;
  penaltyPoints += peakLowSlots * 3;

  const obtained = slotPointsObtained + bonusPoints - penaltyPoints;
  const score    = Math.min(100, Math.max(0, Math.round(obtained / maxSlotPoints * 100)));

  // Build details array for tooltip
  const details = [];
  const coveragePct = numOpenSlots > 0 ? Math.round(coverageOk / numOpenSlots * 100) : 0;
  const mgrsFloorBad = numOpenSlots - mgrsFloorOk;

  details.push({ ok: coverageOk === numOpenSlots, warn: coverageOk < numOpenSlots,
    text: `Cobertura slots: ${coverageOk}/${numOpenSlots} (${coveragePct}%)` });
  details.push({ ok: coachOk === numOpenSlots, warn: coachOk < numOpenSlots,
    text: `Coach mínimo: ${coachOk}/${numOpenSlots} slots OK` });
  details.push({ ok: mgrsFloorBad === 0, warn: mgrsFloorBad > 0,
    text: `Managers en floor: ${mgrsFloorOk}/${numOpenSlots}${mgrsFloorBad > 0 ? ` (${mgrsFloorBad} bajo)` : ''}` });
  details.push({ ok: openingOk, warn: false,
    text: `Apertura ${openingOk ? 'correcta' : `insuficiente (${peopleAtOpening}/${BR.opening.minPeople})`}` });
  details.push({ ok: closingOk, warn: false,
    text: `Cierre ${closingOk ? 'correcto' : `insuficiente (${leadsAtClose}L/${mgrsAtClose}M)`}` });
  if (mixingManagers > 0) {
    details.push({ ok: false, warn: false, text: `${mixingManagers} Mgr mezcla roles (-5)` });
  } else {
    details.push({ ok: true, warn: false, text: 'Managers consistentes en roles' });
  }
  details.push({ ok: lunchesInWindow, warn: false,
    text: `Lunches ${lunchesInWindow ? 'en ventana horaria' : 'fuera de ventana'}` });
  if (zeroFloorSlots > 0)
    details.push({ ok: false, warn: false,
      text: `${zeroFloorSlots} slot${zeroFloorSlots > 1 ? 's' : ''} sin cobertura (-${zeroFloorSlots * 10})` });
  if (peakLowSlots > 0)
    details.push({ ok: false, warn: false,
      text: `${peakLowSlots} slot${peakLowSlots > 1 ? 's' : ''} hora pico bajo mínimo (-${peakLowSlots * 3})` });

  return { score, obtained, max: maxSlotPoints, details };
}

function calculateScore(patIdx) {
  return calculateScoreForRows(getActiveRows(patIdx), patIdx);
}

function scoreColor(score) {
  if (score >= 90) return 'var(--green)';
  if (score >= 70) return 'var(--orange)';
  return 'var(--red)';
}

function toggleScoreTooltip(id) {
  const tt = document.getElementById(id);
  if (!tt) return;
  const wasVisible = tt.classList.contains('visible');
  document.querySelectorAll('.score-tooltip.visible').forEach(t => t.classList.remove('visible'));
  if (!wasVisible) tt.classList.add('visible');
}

// ── Quick Stats ──────────────────────────────────────────────────────────────
function buildQuickStats(patIdx) {
  const rows = getActiveRows(patIdx);
  const leads = rows.filter(r=>r.role==='Lead').length;
  const mgrs = rows.filter(r=>r.role==='Manager').length;
  const {TotalFloor, TotalSupport} = calcSummary(patIdx);
  const openEnd = getOpenEnd();
  let floorSum=0, floorCount=0, minFloor=Infinity, peakFloor=0;
  for (let i=getOpenStart(patIdx); i<=openEnd; i++) {
    floorSum += TotalFloor[i]; floorCount++;
    if (TotalFloor[i] < minFloor) minFloor = TotalFloor[i];
    if (TotalFloor[i] > peakFloor) peakFloor = TotalFloor[i];
  }
  const avgFloor = floorCount>0 ? (floorSum/floorCount).toFixed(1) : '0';
  if (minFloor === Infinity) minFloor = 0;
  const alertsData = validatePattern(patIdx);
  const alertCount = alertsData.length;
  const criticalCount = alertsData.filter(a => a.type === 'red').length;
  // Coach / Support peak across open hours
  const {counts:smry} = calcSummary(patIdx);
  let maxCoach = 0, maxSupport = 0;
  for (let i = getOpenStart(patIdx); i <= getOpenEnd(); i++) {
    if (smry.Coach[i]  > maxCoach)   maxCoach   = smry.Coach[i];
    if (smry.MgrSup[i] > maxSupport) maxSupport = smry.MgrSup[i];
  }
  // Score card
  const { score, obtained, max: scoreMax, details } = calculateScore(patIdx);
  const sColor = scoreColor(score);
  const tooltipId = `score-tooltip-${patIdx}`;
  const detailsHtml = details.map(d => {
    const cls = d.ok ? 'score-detail-ok' : (d.warn ? 'score-detail-warn' : 'score-detail-bad');
    const icon = d.ok ? '✅' : (d.warn ? '⚠️' : '🔴');
    return `<div class="${cls}">${icon} ${esc(d.text)}</div>`;
  }).join('');
  const scoreCardHtml = `
    <div class="stat-card score-card" tabindex="0" role="button" aria-label="Score de Cobertura: ${score}%" onclick="toggleScoreTooltip('${tooltipId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleScoreTooltip('${tooltipId}')}">
      <div class="stat-value" style="color:${sColor}">${score}%</div>
      <div class="stat-label">Score Cobertura</div>
      <div class="score-progress-bar"><div class="score-progress-fill" style="width:${score}%;background:${sColor}"></div></div>
      <div class="score-tooltip" id="${tooltipId}">
        <div class="score-tooltip-header">Score: ${obtained}/${scoreMax}</div>
        <div class="score-tooltip-divider"></div>
        ${detailsHtml}
      </div>
    </div>`;
  return `
    <div class="stat-card"><div class="stat-value">${leads}</div><div class="stat-label">Leads</div></div>
    <div class="stat-card"><div class="stat-value">${mgrs}</div><div class="stat-label">Managers</div></div>
    <div class="stat-card"><div class="stat-value">${leads+mgrs}</div><div class="stat-label">Total</div></div>
    <div class="stat-card"><div class="stat-value">${avgFloor}</div><div class="stat-label">Media Floor</div></div>
    <div class="stat-card"><div class="stat-value${minFloor===0?' danger':''}">${minFloor}</div><div class="stat-label">Mín Floor</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--green)">${maxCoach}</div><div class="stat-label">Pico Coach</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--orange)">${maxSupport}</div><div class="stat-label">Pico Support</div></div>
    <div class="stat-card"><div class="stat-value${criticalCount > 0 ? ' danger' : ''}">${alertCount}</div><div class="stat-label">${criticalCount > 0 ? '⚠️' : '✅'} Alertas</div></div>
    <div class="stat-card"><div class="stat-value" style="font-size:1rem">${getSeasonLabel()}</div><div class="stat-label">Cierre ${getCloseTime()}</div></div>
    ${scoreCardHtml}
  `;
}

// ── Main render ──────────────────────────────────────────────────────────────
function render(patIdx) {
  closeDropdown();
  const seasonTag = activeSeason === 'invierno' ? ' · ❄️ Invierno' : ' · ☀️ Verano';
  const subtitle = document.getElementById('subtitle');
  if (subtitle) subtitle.textContent = PATTERN_NAMES[patIdx] + seasonTag;
  renderAlerts(patIdx);
  document.getElementById('quick-stats').innerHTML = buildQuickStats(patIdx);
  if (typeof renderKPISection === 'function') renderKPISection(patIdx);
  document.getElementById('schedule-container').innerHTML =
    buildScheduleTable(patIdx) + buildSummaryTable(patIdx) + buildCoverageChart(patIdx) + buildLegend() + buildRulesSection();
  scheduleAIAnalysis(patIdx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activePattern = parseInt(btn.dataset.pat);
    render(activePattern);
    updateUndoRedoButtons();
  });
});

// Close score tooltip when clicking outside a score card
document.addEventListener('click', e => {
  if (!e.target.closest('.score-card')) {
    document.querySelectorAll('.score-tooltip.visible').forEach(t => t.classList.remove('visible'));
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CELL EDITING
// ═══════════════════════════════════════════════════════════════════════════════
function closeDropdown() {
  if (openDropdownEl) {
    const cell = openDropdownEl.closest('td.act-cell');
    openDropdownEl.remove();
    openDropdownEl = null;
    if (cell) {
      const p=+cell.dataset.pat, r=+cell.dataset.row, c=+cell.dataset.col;
      const a=currentState[p][r].acts[c], bg=getColor(a), fg=textColor(bg);
      cell.style.background=bg; cell.style.color=fg; cell.textContent=a;
    }
  }
}

function cellClick(evt, patIdx, rowIdx, colIdx) {
  evt.stopPropagation();
  if (openDropdownEl) {
    const ex=openDropdownEl.closest('td');
    if (ex&&+ex.dataset.row===rowIdx&&+ex.dataset.col===colIdx&&+ex.dataset.pat===patIdx) { closeDropdown(); return; }
    closeDropdown();
  }
  const cell=evt.currentTarget, curAct=currentState[patIdx][rowIdx].acts[colIdx];
  const wrap=document.createElement('div'); wrap.className='act-select-wrap';
  const sel=document.createElement('select'); sel.className='act-select';
  for (const opt of ACTIVITY_OPTIONS) {
    const o=document.createElement('option'); o.value=opt; o.textContent=opt===''?'(vacío)':opt;
    if (opt===curAct) o.selected=true; sel.appendChild(o);
  }
  sel.addEventListener('change', e => {
    const nw=e.target.value;
    pushUndo(patIdx);
    currentState[patIdx][rowIdx].acts[colIdx]=nw;
    const bg=getColor(nw), fg=textColor(bg);
    cell.style.background=bg; cell.style.color=fg; cell.textContent=nw;
    closeDropdown();
    saveState();
    // Refresh hours cell for this row
    const hcell = document.querySelector(`td.col-hours[data-hours-row="${rowIdx}"]`);
    if (hcell) hcell.innerHTML = buildHoursCell(currentState[patIdx][rowIdx]);
    // Re-render summary, chart & alerts
    const sc=document.querySelector('.summary-section');
    if (sc) { const t=document.createElement('div'); t.innerHTML=buildSummaryTable(patIdx); sc.replaceWith(t.firstChild); }
    const cc=document.querySelector('.coverage-chart');
    if (cc) { const t2=document.createElement('div'); t2.innerHTML=buildCoverageChart(patIdx); cc.replaceWith(t2.firstChild); }
    renderAlerts(patIdx);
    // Refresh quick stats
    document.getElementById('quick-stats').innerHTML = buildQuickStats(patIdx);
  });
  sel.addEventListener('blur', ()=>setTimeout(closeDropdown,120));
  wrap.appendChild(sel);
  cell.style.position='relative'; cell.style.overflow='visible';
  cell.appendChild(wrap);
  openDropdownEl=wrap;
  sel.focus();
}

document.addEventListener('click', e => { if (openDropdownEl&&!openDropdownEl.contains(e.target)) closeDropdown(); });

// Close export dropdown when clicking outside it (clicking the toggle button itself is
// excluded because it is a child of .export-dropdown and the toggle onclick handles that).
document.addEventListener('click', e => {
  const dd = document.querySelector('.export-dropdown.open');
  if (dd && !dd.contains(e.target)) dd.classList.remove('open');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEASON TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
function switchSeason(season) {
  if (season === activeSeason) return;
  // Save current state for current season
  allSeasonState[activeSeason] = currentState;
  try { localStorage.setItem(LS_KEY_PATTERNS, JSON.stringify(allSeasonState)); } catch(e) {}
  // Switch
  activeSeason = season;
  currentState = allSeasonState[activeSeason];
  try { localStorage.setItem(LS_KEY_SEASON, season); } catch(e) {}
  // Update button UI
  document.querySelectorAll('.season-btn').forEach(b => b.classList.toggle('active', b.dataset.season === season));
  // Clear undo/redo history when switching season (includes Sunday pattern 4)
  for (let i = 0; i < 5; i++) { undoHistory[i] = []; redoHistory[i] = []; }
  updateUndoRedoButtons();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════════════════════════════════════════
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  try { localStorage.setItem(LS_KEY_THEME, isDark ? 'dark' : 'light'); } catch(e) {}
  document.getElementById('theme-toggle').textContent = isDark ? '☀️ Claro' : '🌙 Oscuro';
}
// Restore theme on load
(function() {
  try {
    if (localStorage.getItem(LS_KEY_THEME) === 'dark') {
      document.body.classList.add('dark');
      document.getElementById('theme-toggle').textContent = '☀️ Claro';
    }
  } catch(e) {}
})();

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE PERSON
// ═══════════════════════════════════════════════════════════════════════════════
function deletePerson(patIdx, rowIdx) {
  const row = currentState[patIdx][rowIdx];
  if (!row) return;
  if (!confirm(`¿Eliminar ${row.role} (${row.shift}) de este patrón?`)) return;
  pushUndo(patIdx);
  currentState[patIdx].splice(rowIdx, 1);
  saveState();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════════
function openAddFigure()  { document.getElementById('modal-add').classList.add('open'); }
function openGenerate()   { document.getElementById('modal-gen').classList.add('open'); }
function openRules()      { document.getElementById('modal-rules').classList.add('open'); }
function closeModal(id)   { document.getElementById(id).classList.remove('open'); }

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target===ov) ov.classList.remove('open'); });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADD FIGURE
// ═══════════════════════════════════════════════════════════════════════════════
function addFigure() {
  const role  = document.getElementById('add-role').value;
  const shift = document.getElementById('add-shift').value;
  const [si,ei] = shiftIndices(shift);
  const acts = new Array(TIME_SLOTS.length).fill('');
  // Fill defaults
  for (let i=si; i<ei && i<TIME_SLOTS.length; i++) {
    if (TIME_SLOTS[i]==='09:15') acts[i]='DD';
    else acts[i] = role==='Lead'?'LDSup':'AOR';
  }
  pushUndo(activePattern);
  currentState[activePattern].push({role, shift, acts});
  saveState();
  closeModal('modal-add');
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE PATTERN
// ═══════════════════════════════════════════════════════════════════════════════
function generatePattern() {
  pushUndo(activePattern);
  const rows = currentState[activePattern];
  const n = TIME_SLOTS.length;
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(activePattern);

  // Collect existing meetings to preserve
  const meetingMap = rows.map(row => {
    const slots = [];
    for (let c = 0; c < n; c++) if (row.acts[c] === 'MEETING') slots.push(c);
    return slots;
  });

  // Sort indices by shift start (morning first) for lunch staggering
  const sortedIndices = rows.map((_, i) => i).sort((a, b) => {
    const [sa] = shiftIndices(rows[a].shift);
    const [sb] = shiftIndices(rows[b].shift);
    return sa - sb;
  });

  // Lunch window indices
  const lunchWinStart = TIME_SLOTS.indexOf(BR.lunch.windowStart);  // 11:00
  const lunchWinEnd   = TIME_SLOTS.indexOf(BR.lunch.windowEnd);    // 17:00 (puede empezar hasta las 17:00)
  const ddSlot        = TIME_SLOTS.indexOf(BR.dd.time);            // 09:15

  // Track simultaneous lunches per slot to stagger
  const lunchAssigned = new Array(n).fill(0);

  // Assign consistent daily role (Coach or Support) to each Manager
  const mgrDailyRoles = new Map();
  let coachIdx = 0;
  sortedIndices.forEach(ri => {
    if (rows[ri].role === 'Manager') {
      mgrDailyRoles.set(ri, coachIdx % 2 === 0 ? 'Coach' : 'Support');
      coachIdx++;
    }
  });

  // Ensure minimum 2 coaches on floor at every open slot:
  // when there are few managers working (e.g. early Saturday), the alternating
  // Coach/Support assignment can leave only 1 coach. Promote Support→Coach if needed.
  const _openEnd = getOpenEnd();
  for (let c = openStart; c <= _openEnd; c++) {
    const mgrsHere = sortedIndices.filter(ri => {
      if (rows[ri].role !== 'Manager') return false;
      const [si, ei] = shiftIndices(rows[ri].shift);
      return c >= si && c < ei;
    });
    let coachCnt = mgrsHere.filter(ri => mgrDailyRoles.get(ri) === 'Coach').length;
    for (const ri of mgrsHere) {
      if (coachCnt >= 2) break;
      if (mgrDailyRoles.get(ri) === 'Support') {
        mgrDailyRoles.set(ri, 'Coach');
        coachCnt++;
      }
    }
  }

  sortedIndices.forEach(ri => {
    const row = rows[ri];
    const [si, ei] = shiftIndices(row.shift);
    const isLead   = row.role === 'Lead';
    const hasMtg   = meetingMap[ri].length > 0;
    const isSat    = activePattern === 3;
    const isSun    = activePattern === 4;

    // Target hours per role/day from BUSINESS_RULES
    const dayRules  = isSat ? BR.saturday : (isSun ? BR.sunday : BR.weekday);
    const roleRules = isLead ? dayRules.lead : dayRules.manager;
    const mgmtSlots = (isLead ? roleRules.ldopsHours : roleRules.aorHours) * 2;
    const edgeLen   = Math.floor(mgmtSlots / 2);

    // Determine shift type based on when it ends:
    // Afternoon (tarde): ends at 21:00, 21:30 or 22:00 (ei >= 29)
    // Morning  (mañana): ends at 16:00 or 17:00 (ei <= 21)
    // Mid: anything else
    const AFTERNOON_THRESHOLD = TIME_SLOTS.indexOf('21:00'); // 29
    const MORNING_THRESHOLD   = TIME_SLOTS.indexOf('17:00'); // 21
    const isAfternoonShift = ei >= AFTERNOON_THRESHOLD;
    const isMorningShift   = ei <= MORNING_THRESHOLD;

    // Reset all
    for (let c = 0; c < n; c++) row.acts[c] = '';

    // DD at 09:15 for ALL personas en turno a esa hora
    if (ddSlot >= si && ddSlot < ei) {
      row.acts[ddSlot] = 'DD';
    }

    // Preserve meetings
    if (hasMtg) meetingMap[ri].forEach(c => { row.acts[c] = 'MEETING'; });

    // Find best lunch slot in window 11:00-17:00 (staggered, morning-first)
    // si+4 = don't start lunch in first 2h of shift; ei-2 = keep at least 1h after lunch
    const lunchOptions = [];
    for (let c = Math.max(si + 4, lunchWinStart); c <= Math.min(ei - 2, lunchWinEnd); c++) {
      if (row.acts[c] === '' && row.acts[c + 1] === '') lunchOptions.push(c);
    }
    let bestLunch = -1, bestCount = Infinity;
    for (const c of lunchOptions) {
      const cnt = lunchAssigned[c] + lunchAssigned[c + 1];
      if (cnt < bestCount) { bestCount = cnt; bestLunch = c; }
    }
    if (bestLunch >= 0) {
      row.acts[bestLunch] = 'Lunch';
      row.acts[bestLunch + 1] = 'Lunch';
      lunchAssigned[bestLunch]++;
      lunchAssigned[bestLunch + 1]++;
    }

    // Pass 1: fill shift edges with management activity (AOR/LDOPS).
    // Strategy:
    //   - Afternoon shifts (ending 21:00+): AOR at the START so the last hours
    //     (17:00-close) are floor. This maximises peak-hour coverage.
    //   - Morning shifts (ending ≤17:00): AOR at the END so core morning hours
    //     have maximum floor coverage.
    //   - Mid shifts: AOR at start (default, same as before).
    const storeCloseIdx = getOpenEnd(); // e.g. 30 for 21:30, 29 for 21:00

    for (let c = si; c < ei && c < n; c++) {
      if (row.acts[c] !== '') continue;
      const fromStart = c - si;
      const fromEnd   = ei - 1 - c;  // 0 = last slot before ei
      let assignMgmt  = false;

      if (isAfternoonShift) {
        // AOR/LDOPS at the very START so 17:00+ is floor
        assignMgmt = fromStart < edgeLen;
      } else if (isMorningShift) {
        // AOR/LDOPS at the very END so morning floor hours are maximised
        assignMgmt = fromEnd < edgeLen;
      } else {
        // Mid shifts: AOR at start; cap trailing edge after store closes
        const trailEdgeStart = Math.max(si + edgeLen + 1, storeCloseIdx);
        assignMgmt = (fromStart < edgeLen) || (c >= trailEdgeStart);
      }

      if (assignMgmt) {
        row.acts[c] = isLead ? 'LDOPS' : 'AOR';
      }
    }

    // Pass 2: fill center with floor activity (Manager: consistent Coach or Support all day)
    for (let c = si; c < ei && c < n; c++) {
      if (row.acts[c] !== '') continue;
      if (isLead) {
        row.acts[c] = 'LDSup';
      } else {
        row.acts[c] = mgrDailyRoles.get(ri) || 'Coach';
      }
    }
  });

  // ── Repair pass: ensure peak-hour (17:00-close) floor coverage ──────────────
  // Count floor per slot. If below peakFloor target, convert AOR→floor for
  // afternoon-shift people who still have AOR in those slots.
  const peakFloorTarget = BR.coverage.peakFloor;
  const peakStartSlot   = TIME_SLOTS.indexOf('17:00'); // 21
  const peakEndSlot     = getOpenEnd();                // 29 or 30

  // Build per-slot floor counts
  const floorCount = new Array(n).fill(0);
  for (const row of rows) {
    const [, ei] = shiftIndices(row.shift);
    for (let c = peakStartSlot; c <= peakEndSlot && c < ei; c++) {
      const a = row.acts[c];
      if (a === 'LDSup' || a === 'Coach' || a === 'Support') floorCount[c]++;
    }
  }

  // For any slot below target, look for afternoon-shift people with AOR there
  for (let c = peakStartSlot; c <= peakEndSlot; c++) {
    if (floorCount[c] >= peakFloorTarget) continue;
    for (let ri = 0; ri < rows.length; ri++) {
      if (floorCount[c] >= peakFloorTarget) break;
      const row = rows[ri];
      const [si, ei] = shiftIndices(row.shift);
      if (c < si || c >= ei) continue;          // not working this slot
      if (row.acts[c] !== 'AOR' && row.acts[c] !== 'LDOPS') continue; // not AOR
      // Convert to appropriate floor activity
      const floorAct = row.role === 'Lead'
        ? 'LDSup'
        : (mgrDailyRoles.get(ri) || 'Support');
      row.acts[c] = floorAct;
      floorCount[c]++;
    }
  }

  // ── Regla: no AOR/LDOPS antes del cierre salvo excedente ───────────────────
  const minStart = activeSeason === 'invierno'
    ? BR.coverage.ldopsAorMinStartInvierno
    : BR.coverage.ldopsAorMinStartVerano;
  const minStartIdx = TIME_SLOTS.indexOf(minStart);
  const excedente = BR.coverage.excedenteParaLDOPS || { minSupport: 4, minCoach: 1 };
  const minSupEx = Number(excedente.minSupport || 4);
  const minCoachEx = Number(excedente.minCoach || 1);
  if (minStartIdx >= 0) {
    for (let c = openStart; c < minStartIdx; c++) {
      let supportLike = 0, coachCnt = 0;
      for (const row of rows) {
        if (row.acts[c] === 'LDSup' || row.acts[c] === 'Support') supportLike++;
        if (row.acts[c] === 'Coach') coachCnt++;
      }
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        const a = row.acts[c];
        if (a !== 'AOR' && a !== 'LDOPS') continue;
        const hasBaseCoverage = supportLike >= minSupEx && coachCnt >= minCoachEx;
        const hasExtra = (supportLike + coachCnt) > (minSupEx + minCoachEx);
        if (hasBaseCoverage && hasExtra) continue;
        const floorAct = row.role === 'Lead'
          ? 'LDSup'
          : (mgrDailyRoles.get(ri) || 'Support');
        row.acts[c] = floorAct;
        if (floorAct === 'LDSup' || floorAct === 'Support') supportLike++;
        if (floorAct === 'Coach') coachCnt++;
      }
    }
  }

  saveState();
  closeModal('modal-gen');
  // Re-assign names after generation (clear existing assignments first, then auto-assign)
  const rows2 = currentState[activePattern];
  rows2.forEach(r => { delete r.assignedId; });
  autoAssignNames(activePattern);
  saveState();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════════
function addRule() {
  const day  = document.getElementById('rule-day').value;
  const text = document.getElementById('rule-text').value.trim();
  const highlight = document.getElementById('rule-highlight').checked;
  if (!text) return;
  rules.push({day, text, highlight});
  saveRules();
  document.getElementById('rule-text').value='';
  document.getElementById('rule-highlight').checked=false;
  closeModal('modal-rules');
  render(activePattern);
}

function deleteRule(idx) {
  if (!confirm('¿Eliminar esta regla?')) return;
  rules.splice(idx,1);
  saveRules();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════════════════════════
function exportCSV() {
  const rows = currentState[activePattern];
  const header = ['Role','Shift',...TIME_SLOTS].join(';');
  const lines = rows.map(r => {
    let roleName = r.role;
    if (r.assignedId) {
      const isLead = r.role === 'Lead';
      const member = isLead
        ? teamData.leads.find(m => m.id === r.assignedId)
        : teamData.managers.find(m => m.id === r.assignedId);
      if (member) roleName = member.name;
    }
    return [roleName, r.shift, ...r.acts].join(';');
  });
  const csv = [header,...lines].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = PATTERN_NAMES[activePattern].replace(/[^a-zA-Z0-9]/g,'_');
  a.href=url; a.download=`patron_${activeSeason}_${activePattern}_${safeName}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════
function resetPattern() {
  const label = PATTERN_NAMES[activePattern] + (activeSeason==='invierno'?' (Invierno)':' (Verano)');
  if (!confirm(`¿Restaurar el patrón "${label}" a los datos originales?`)) return;
  pushUndo(activePattern);
  const originals = activeSeason === 'invierno' ? ORIGINAL_WINTER_PATTERNS : ORIGINAL_PATTERNS;
  currentState[activePattern] = originals[activePattern].map(row => ({role:row.role, shift:row.shift, acts:[...row.acts]}));
  saveState();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAG & DROP ROW REORDER
// ═══════════════════════════════════════════════════════════════════════════════
let dragSrcPat = -1, dragSrcRow = -1;

function onDragStart(e, pat, row) {
  // If the drag originated on an act-cell, let the cell DnD handler take over
  if (e.target.closest && e.target.closest('td.act-cell[draggable]')) return;
  dragSrcPat = pat; dragSrcRow = row;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(row));
  // Slight delay so style applies after DnD snapshot
  setTimeout(() => { const el = document.querySelector(`tr[data-pat="${pat}"][data-row="${row}"]`); if (el) el.classList.add('dragging'); }, 0);
}

function onDragOver(e) {
  if (cellDragData) return; // Cell drag in progress — skip row highlight
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('tr.drag-over').forEach(el => el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  if (cellDragData) return; // Cell drag in progress
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e, pat, targetRow) {
  if (cellDragData) return; // Cell drag in progress — skip row drop
  e.preventDefault();
  document.querySelectorAll('tr.drag-over, tr.dragging').forEach(el => { el.classList.remove('drag-over'); el.classList.remove('dragging'); });
  if (dragSrcPat !== pat || dragSrcRow === targetRow) { dragSrcPat = -1; dragSrcRow = -1; return; }
  const arr = currentState[pat];
  // Only allow reorder within same role group
  if (arr[dragSrcRow] && arr[targetRow] && arr[dragSrcRow].role !== arr[targetRow].role) { dragSrcPat = -1; dragSrcRow = -1; return; }
  pushUndo(pat);
  const moved = arr.splice(dragSrcRow, 1)[0];
  const dest  = dragSrcRow < targetRow ? targetRow - 1 : targetRow;
  arr.splice(dest, 0, moved);
  dragSrcPat = -1; dragSrcRow = -1;
  saveState();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT EDITING
// ═══════════════════════════════════════════════════════════════════════════════
let activeShiftPopover = null;

function openShiftEdit(e, patIdx, rowIdx) {
  e.stopPropagation();
  closeShiftPopover();
  const row = currentState[patIdx][rowIdx];
  const parts = row.shift.split('-');
  const curStart = parts[0], curEnd = parts[1];
  // Use all time slots as start/end options (excluding 22:00 as a start time)
  // This allows any half-hour time like 12:30 to be used as a shift start/end
  const starts = TIME_SLOTS.filter(t => t !== '22:00');
  const ends   = TIME_SLOTS.filter(t => t !== '07:00' && t !== '07:30');

  const pop = document.createElement('div');
  pop.className = 'shift-popover';
  pop.innerHTML = `
    <h4>✏️ Editar turno</h4>
    <div class="sp-row"><label>Entrada</label><select id="sp-start">${starts.map(t=>`<option value="${t}"${t===curStart?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="sp-row"><label>Salida</label><select id="sp-end">${ends.map(t=>`<option value="${t}"${t===curEnd?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="sp-actions">
      <button class="sp-cancel" onclick="closeShiftPopover()">Cancelar</button>
      <button class="sp-ok" onclick="confirmShiftEdit(${patIdx},${rowIdx})">✓ Aplicar</button>
    </div>`;
  const rect = e.currentTarget.getBoundingClientRect();
  pop.style.top  = (rect.bottom + window.scrollY + 6) + 'px';
  pop.style.left = (rect.left  + window.scrollX)      + 'px';
  document.body.appendChild(pop);
  activeShiftPopover = pop;
  setTimeout(() => document.addEventListener('click', _closeShiftOnOutside, {once:true}), 50);
}

function _closeShiftOnOutside(e) {
  if (activeShiftPopover && !activeShiftPopover.contains(e.target)) closeShiftPopover();
}

function closeShiftPopover() {
  if (activeShiftPopover) { activeShiftPopover.remove(); activeShiftPopover = null; }
}

function confirmShiftEdit(patIdx, rowIdx) {
  const startEl = document.getElementById('sp-start');
  const endEl   = document.getElementById('sp-end');
  if (!startEl || !endEl) return;
  const newShift = startEl.value + '-' + endEl.value;
  const row = currentState[patIdx][rowIdx];
  closeShiftPopover();
  if (newShift === row.shift) return;
  pushUndo(patIdx);
  const [si, ei] = shiftIndices(newShift);
  // Clear activities outside new shift
  for (let c = 0; c < TIME_SLOTS.length; c++) {
    if (row.acts[c] !== '' && (c < si || c >= ei)) row.acts[c] = '';
  }
  // Add/keep DD at 09:15 if covered
  const ddSlot = TIME_SLOTS.indexOf('09:15');
  if (ddSlot >= si && ddSlot < ei && row.acts[ddSlot] !== 'MEETING') row.acts[ddSlot] = 'DD';
  row.shift = newShift;
  saveState();
  render(activePattern);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY CELL DRAG & DROP  (event delegation on #schedule-container)
// ═══════════════════════════════════════════════════════════════════════════════
(function initCellDragDrop() {
  const container = document.getElementById('schedule-container');
  if (!container) return;

  container.addEventListener('dragstart', function(e) {
    const td = e.target.closest && e.target.closest('td.act-cell[draggable]');
    if (!td) return;

    const pat = +td.dataset.pat;
    const row = +td.dataset.row;
    const col = +td.dataset.col;
    const act = currentState[pat][row].acts[col];
    if (!act) { e.preventDefault(); return; }

    cellDragData = { patIdx: pat, rowIdx: row, colIdx: col, activity: act };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'celldrag');
    setTimeout(() => td.classList.add('cell-dragging'), 0);
  });

  container.addEventListener('dragover', function(e) {
    if (!cellDragData) return;
    const td = e.target.closest && e.target.closest('td.act-cell');
    if (!td) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent row drag-over from also firing
    e.dataTransfer.dropEffect = 'move';

    const pat = +td.dataset.pat;
    const row = +td.dataset.row;
    const col = +td.dataset.col;

    // Same cell: remove indicators
    if (pat === cellDragData.patIdx && row === cellDragData.rowIdx && col === cellDragData.colIdx) {
      td.classList.remove('drag-target-valid', 'drag-target-invalid');
      return;
    }

    // Validate: target col must be within target row's shift
    const rowData = currentState[pat][row];
    const [si, ei] = shiftIndices(rowData.shift);
    const isValid  = col >= si && col < ei;

    document.querySelectorAll('td.act-cell.drag-target-valid, td.act-cell.drag-target-invalid')
      .forEach(el => el.classList.remove('drag-target-valid', 'drag-target-invalid'));
    td.classList.add(isValid ? 'drag-target-valid' : 'drag-target-invalid');
  });

  container.addEventListener('dragleave', function(e) {
    if (!cellDragData) return;
    const td = e.target.closest && e.target.closest('td.act-cell');
    if (!td) return;
    // Only remove if truly leaving the cell (relatedTarget may be null when leaving the viewport)
    if (e.relatedTarget === null || !td.contains(e.relatedTarget)) {
      td.classList.remove('drag-target-valid', 'drag-target-invalid');
    }
  });

  container.addEventListener('drop', function(e) {
    if (!cellDragData) return;
    const td = e.target.closest && e.target.closest('td.act-cell');
    if (!td) { cellDragData = null; return; }

    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('td.act-cell.drag-target-valid, td.act-cell.drag-target-invalid, td.act-cell.cell-dragging')
      .forEach(el => el.classList.remove('drag-target-valid', 'drag-target-invalid', 'cell-dragging'));

    const pat = +td.dataset.pat;
    const row = +td.dataset.row;
    const col = +td.dataset.col;

    // Same cell: no-op
    if (pat === cellDragData.patIdx && row === cellDragData.rowIdx && col === cellDragData.colIdx) {
      cellDragData = null; return;
    }

    // Validate: target col must be within destination row's shift
    const destRowData = currentState[pat][row];
    const [si, ei] = shiftIndices(destRowData.shift);
    if (col < si || col >= ei) { cellDragData = null; return; }

    // Swap activities between source and destination cells
    pushUndo(activePattern);
    const srcRowData = currentState[cellDragData.patIdx][cellDragData.rowIdx];
    const srcAct = srcRowData.acts[cellDragData.colIdx];
    const dstAct = destRowData.acts[col];
    srcRowData.acts[cellDragData.colIdx] = dstAct;
    destRowData.acts[col] = srcAct;

    saveState();
    const savedDest = { pat, row, col };
    cellDragData = null;

    render(activePattern);

    // Flash destination cell after render
    requestAnimationFrame(() => {
      const destTd = document.querySelector(
        `td.act-cell[data-pat="${savedDest.pat}"][data-row="${savedDest.row}"][data-col="${savedDest.col}"]`
      );
      if (destTd) {
        destTd.classList.add('drag-flash');
        setTimeout(() => destTd.classList.remove('drag-flash'), 300);
      }
    });
  });

  container.addEventListener('dragend', function() {
    document.querySelectorAll('td.act-cell.cell-dragging, td.act-cell.drag-target-valid, td.act-cell.drag-target-invalid')
      .forEach(el => el.classList.remove('cell-dragging', 'drag-target-valid', 'drag-target-invalid'));
    cellDragData = null;
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL RENDER
// ═══════════════════════════════════════════════════════════════════════════════
// Restore season button state
document.querySelectorAll('.season-btn').forEach(b => b.classList.toggle('active', b.dataset.season === activeSeason));
// Auto-assign names on startup (only for rows without an existing assignment)
if (teamData.leads.length > 0 || teamData.managers.length > 0) {
  for (let i = 0; i < 5; i++) autoAssignNames(i);
}
render(0);
updateUndoRedoButtons();

// ── Undo/Redo keyboard shortcuts ─────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  // Close person drill-down modal on Esc
  if (e.key === 'Escape') {
    const drillModal = document.getElementById('modal-person-drill');
    if (drillModal && drillModal.classList.contains('open')) {
      if (typeof closePersonDrilldown === 'function') closePersonDrilldown();
      return;
    }
  }
  // Skip if a modal is open or an input/textarea/select has focus
  if (document.querySelector('.modal-overlay.open')) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const ctrl = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (ctrl && !e.shiftKey && key === 'z') { e.preventDefault(); undo(); }
  else if (ctrl && !e.shiftKey && key === 'y') { e.preventDefault(); redo(); }
  else if (ctrl && e.shiftKey && key === 'z') { e.preventDefault(); redo(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI ADVISOR ENGINE  — Fase 2
// ═══════════════════════════════════════════════════════════════════════════════

// ── Panel open/close ──────────────────────────────────────────────────────────
function openAIPanel() {
  document.getElementById('ai-panel').classList.add('open');
  document.getElementById('ai-panel-overlay').classList.add('open');
  renderAIPanel();
}
function closeAIPanel() {
  document.getElementById('ai-panel').classList.remove('open');
  document.getElementById('ai-panel-overlay').classList.remove('open');
  if (aiPreviewState) cancelAIPreview();
}
function switchAITab(level) {
  aiActiveTab = level;
  document.querySelectorAll('.ai-tab').forEach(t => t.classList.toggle('active', t.dataset.level === level));
  renderAIPanelBody();
}

// ── Badge / button update ─────────────────────────────────────────────────────
function updateAIBadge() {
  const active = aiSuggestions.filter(s => !s.dismissed);
  const hasRules = active.some(s => s.level === 'rules');
  const count = active.length;
  const btn = document.getElementById('btn-ai');
  const badge = document.getElementById('ai-badge');
  const panelBadge = document.getElementById('ai-panel-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
    badge.classList.toggle('critical', hasRules);
    if (btn) btn.classList.add('has-suggestions');
  } else {
    badge.style.display = 'none';
    if (btn) btn.classList.remove('has-suggestions');
  }
  if (panelBadge) {
    panelBadge.textContent = count;
    panelBadge.style.display = count > 0 ? '' : 'none';
    panelBadge.classList.toggle('critical', hasRules);
  }
  // Update tab counts
  ['tactical','strategic','rules'].forEach(lv => {
    const el = document.getElementById('tab-count-' + lv);
    if (el) el.textContent = active.filter(s => s.level === lv).length;
  });
  // Apply-all button
  const applyAllBtn = document.getElementById('ai-apply-all-btn');
  if (applyAllBtn) applyAllBtn.disabled = !active.some(s => s.confidence === 'high' && !s.conflictsWith.length);
}

// ── Render panel ──────────────────────────────────────────────────────────────
function renderAIPanel() {
  updateAIBadge();
  renderAIPanelBody();
}
function renderAIPanelBody() {
  const body = document.getElementById('ai-panel-body');
  if (!body) return;
  const filtered = aiSuggestions.filter(s => s.level === aiActiveTab);
  if (filtered.length === 0) {
    body.innerHTML = `<div class="ai-empty-state"><div class="ai-empty-icon">${aiActiveTab==='tactical'?'🔧':aiActiveTab==='strategic'?'🧠':'💡'}</div><div>Sin sugerencias en este nivel</div><div style="margin-top:6px;font-size:.75rem">El patrón está bien optimizado en esta categoría</div></div>`;
    return;
  }
  body.innerHTML = filtered.map(s => renderAICard(s)).join('');
}
function renderAICard(s) {
  const levelLabel = s.level === 'tactical' ? '🔧 TÁCTICO' : s.level === 'strategic' ? '🧠 ESTRATÉGICO' : '💡 REGLA';
  const confIcon   = s.confidence === 'high' ? '✅' : s.confidence === 'medium' ? '⚠️' : '🔴';
  const deltaClass = s.scoreDelta >= 0 ? 'pos' : 'neg';
  const deltaStr   = (s.scoreDelta >= 0 ? '+' : '') + s.scoreDelta + ' pts';
  const dismissedCls = s.dismissed ? ' dismissed' : '';
  const expandedCls  = s._expanded ? ' expanded' : '';
  let btns = '';
  if (!s.dismissed) {
    if (s.changes && s.changes.length) {
      btns += `<button class="ai-card-btn preview" onclick="previewSuggestion('${s.id}')">👀 Preview</button>`;
      btns += `<button class="ai-card-btn apply"   onclick="applySuggestion('${s.id}')">✅ Aplicar</button>`;
    }
    btns += `<button class="ai-card-btn" onclick="dismissSuggestion('${s.id}')">❌ Ignorar</button>`;
  } else {
    btns += `<button class="ai-card-btn" onclick="undismissSuggestion('${s.id}')">↩️ Restaurar</button>`;
  }
  return `<div class="ai-card level-${s.level}${dismissedCls}${expandedCls}" id="ai-card-${s.id}">
  <div class="ai-card-header" onclick="toggleAICard('${s.id}')">
    <span class="ai-card-level-tag">${levelLabel}</span>
    <span class="ai-card-title">${esc(s.title)}</span>
    <span class="ai-card-delta ${deltaClass}">${deltaStr}</span>
    <span class="ai-card-confidence" title="Confianza">${confIcon}</span>
    <span class="ai-card-chevron">▼</span>
  </div>
  <div class="ai-card-body">
    <div class="ai-card-desc">${esc(s.description)}</div>
    <div class="ai-card-impact">${esc(s.impact)}</div>
    <div class="ai-card-btns">${btns}</div>
  </div>
</div>`;
}
function toggleAICard(id) {
  const s = aiSuggestions.find(x => x.id === id);
  if (!s) return;
  s._expanded = !s._expanded;
  const card = document.getElementById('ai-card-' + id);
  if (card) card.classList.toggle('expanded', s._expanded);
}

// ── Suggestion actions ────────────────────────────────────────────────────────
function dismissSuggestion(id) {
  const s = aiSuggestions.find(x => x.id === id);
  if (!s) return;
  s.dismissed = true;
  aiDismissed.add(id);
  renderAIPanel();
}
function undismissSuggestion(id) {
  const s = aiSuggestions.find(x => x.id === id);
  if (!s) return;
  s.dismissed = false;
  aiDismissed.delete(id);
  renderAIPanel();
}

function previewSuggestion(id) {
  const s = aiSuggestions.find(x => x.id === id);
  if (!s || !s.changes || !s.changes.length) return;
  if (aiPreviewState) cancelAIPreview();
  const patIdx = activePattern;
  const original = currentState[patIdx].map(r => ({ role:r.role, shift:r.shift, acts:[...r.acts], assignedId:r.assignedId }));
  aiPreviewState = { patIdx, original, suggestionId: id };
  // Apply changes temporarily
  applyChangesToState(patIdx, s.changes);
  render(patIdx);
  // Highlight affected cells
  setTimeout(() => {
    if (s.affectedSlots && s.affectedRows) {
      s.affectedRows.forEach(ri => {
        s.affectedSlots.forEach(ci => {
          const td = document.querySelector(`td.act-cell[data-pat="${patIdx}"][data-row="${ri}"][data-col="${ci}"]`);
          if (td) td.classList.add('ai-preview');
        });
      });
    }
  }, 50);
  // Show preview banner
  const banner = document.getElementById('ai-preview-banner');
  const msg = document.getElementById('ai-preview-msg');
  if (banner) {
    if (msg) msg.textContent = `Previsualizando: ${s.title}`;
    banner.classList.add('visible');
  }
}

function cancelAIPreview() {
  if (!aiPreviewState) return;
  const { patIdx, original } = aiPreviewState;
  currentState[patIdx] = original;
  aiPreviewState = null;
  render(patIdx);
  document.querySelectorAll('td.ai-preview').forEach(td => td.classList.remove('ai-preview'));
  const banner = document.getElementById('ai-preview-banner');
  if (banner) banner.classList.remove('visible');
}

function confirmAIPreview() {
  if (!aiPreviewState) return;
  const { patIdx, suggestionId } = aiPreviewState;
  const original = aiPreviewState.original;
  // Restore original first, then apply with undo
  currentState[patIdx] = original;
  aiPreviewState = null;
  // Ensure the suggestion is applied to the pattern that was previewed
  activePattern = patIdx;
  applySuggestion(suggestionId);
  // If the active tab showed a different pattern, sync the tab-btn highlight to patIdx
  if (patIdx !== parseInt(document.querySelector('.tab-btn.active')?.dataset.pat ?? NaN)) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.pat === String(patIdx)));
  }
  document.querySelectorAll('td.ai-preview').forEach(td => td.classList.remove('ai-preview'));
  const banner = document.getElementById('ai-preview-banner');
  if (banner) banner.classList.remove('visible');
}

function applySuggestion(id) {
  const s = aiSuggestions.find(x => x.id === id);
  if (!s || !s.changes || !s.changes.length) return;
  const patIdx = activePattern;
  pushUndo(patIdx);
  applyChangesToState(patIdx, s.changes);
  saveState();
  render(patIdx);
  s.dismissed = true; // hide after applying
  scheduleAIAnalysis(patIdx);
  renderAIPanel();
  showUndoToast('✅ Sugerencia aplicada');
}

function applyChangesToState(patIdx, changes) {
  for (const ch of changes) {
    const row = currentState[patIdx][ch.rowIdx];
    if (row && ch.colIdx >= 0 && ch.colIdx < row.acts.length) {
      row.acts[ch.colIdx] = ch.to;
    }
  }
}

function applyAllSafe() {
  const safe = aiSuggestions.filter(s => !s.dismissed && s.confidence === 'high' && !s.conflictsWith.length);
  if (!safe.length) return;
  let applied = 0;
  const patIdx = activePattern;
  pushUndo(patIdx);
  // Apply in order of impact
  const sorted = [...safe].sort((a,b) => b.scoreDelta - a.scoreDelta);
  for (const s of sorted) {
    if (!s.changes || !s.changes.length) continue;
    applyChangesToState(patIdx, s.changes);
    s.dismissed = true;
    applied++;
  }
  saveState();
  render(patIdx);
  scheduleAIAnalysis(patIdx);
  renderAIPanel();
  showUndoToast(`⚡ ${applied} sugerencias aplicadas`);
}

// ── Debounced analysis trigger ────────────────────────────────────────────────
function scheduleAIAnalysis(patIdx) {
  clearTimeout(aiAnalysisTimer);
  aiAnalysisTimer = setTimeout(() => {
    aiSuggestions = runAIAnalysis(patIdx != null ? patIdx : activePattern);
    updateAIBadge();
    const panel = document.getElementById('ai-panel');
    if (panel && panel.classList.contains('open')) renderAIPanelBody();
  }, 500);
}
function triggerAIAnalysis() {
  const body = document.getElementById('ai-panel-body');
  if (body) body.innerHTML = '<div class="ai-loading">⏳ Analizando patrón…</div>';
  clearTimeout(aiAnalysisTimer);
  aiAnalysisTimer = setTimeout(() => {
    aiSuggestions = runAIAnalysis(activePattern);
    updateAIBadge();
    renderAIPanelBody();
  }, 100);
}

// ── Core: runAIAnalysis ───────────────────────────────────────────────────────
function runAIAnalysis(patIdx) {
  const t0 = performance.now();
  const allSuggestions = [
    ...analyzeLunches(patIdx),
    ...analyzeOffFloor(patIdx),
    ...analyzeShifts(patIdx),
    ...analyzeDD(patIdx),
    ...analyzePairSwaps(patIdx),
    ...analyzeSupplyDemand(patIdx),
    ...analyzePersonEfficiency(patIdx),
    ...analyzeRoleDistribution(patIdx),
    ...analyzeResilience(patIdx),
    ...analyzeCrossPattern(),
    ...questionCoverageMins(patIdx),
    ...questionPeakHours(),
    ...questionRoleHours(),
    ...questionStaffing(patIdx),
    ...questionMeetings(patIdx),
  ];
  const result = deduplicateAndSort(allSuggestions);
  // Restore dismissed status
  result.forEach(s => { if (aiDismissed.has(s.id)) s.dismissed = true; });
  const t1 = performance.now();
  console.debug(`[AI] Analysis: ${result.length} suggestions in ${(t1-t0).toFixed(1)}ms`);
  return result;
}

function deduplicateAndSort(suggestions) {
  const seen = new Set();
  const unique = suggestions.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  return unique.sort((a,b) => b.scoreDelta - a.scoreDelta);
}

// ── Helper: build counts for a patIdx ────────────────────────────────────────
function buildCounts(rows) {
  const n = TIME_SLOTS.length;
  const counts = { Floor: new Array(n).fill(0), Coach: new Array(n).fill(0), Support: new Array(n).fill(0), LDSup: new Array(n).fill(0), Lunch: new Array(n).fill(0), AOR: new Array(n).fill(0), Mgrs: new Array(n).fill(0) };
  for (const row of rows) {
    const isMgr = row.role === 'Manager';
    for (let c = 0; c < n; c++) {
      const a = row.acts[c];
      if (a === 'Coach')   { counts.Coach[c]++; counts.Floor[c]++; if (isMgr) counts.Mgrs[c]++; }
      if (a === 'Support') { counts.Support[c]++; counts.Floor[c]++; if (isMgr) counts.Mgrs[c]++; }
      if (a === 'LDSup')   { counts.LDSup[c]++; counts.Floor[c]++; }
      if (a === 'Lunch')   counts.Lunch[c]++;
      if (a === 'AOR' || a === 'LDOPS') counts.AOR[c]++;
    }
  }
  return counts;
}

function scoreDelta(patIdx, changes) {
  // Calculate score before and after changes
  const rows = currentState[patIdx];
  const before = calculateScoreForRows(rows, patIdx).score;
  // Clone and apply
  const cloned = rows.map(r => ({ ...r, acts: [...r.acts] }));
  for (const ch of changes) { if (cloned[ch.rowIdx]) cloned[ch.rowIdx].acts[ch.colIdx] = ch.to; }
  const after = calculateScoreForRows(cloned, patIdx).score;
  return after - before;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — TACTICAL ANALYZERS
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeLunches(patIdx) {
  const rows = currentState[patIdx];
  const BR = BUSINESS_RULES;
  const n = TIME_SLOTS.length;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const suggestions = [];

  const lunchWinStart = TIME_SLOTS.indexOf(BR.lunch.windowStart);
  const lunchWinEnd   = TIME_SLOTS.indexOf(BR.lunch.windowEnd);

  // Peak hours set
  const peakSet = new Set();
  for (const ph of BR.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start), e = TIME_SLOTS.indexOf(ph.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) peakSet.add(i);
  }

  // Quiet hours set
  const quietSet = new Set();
  for (const qh of (BR.quietHours||[])) {
    const s = TIME_SLOTS.indexOf(qh.start), e = TIME_SLOTS.indexOf(qh.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) quietSet.add(i);
  }

  // Count lunches per slot
  const counts = buildCounts(rows);
  const currentScore = calculateScoreForRows(rows, patIdx).score;

  rows.forEach((row, rowIdx) => {
    const [si, ei] = shiftIndices(row.shift);
    const lunchSlots = [];
    for (let c=si; c<ei; c++) if (row.acts[c]==='Lunch') lunchSlots.push(c);
    if (!lunchSlots.length) return;

    const firstLunch = Math.min(...lunchSlots);
    const lastLunch  = Math.max(...lunchSlots);

    // Lunch in peak hour?
    if (peakSet.has(firstLunch)) {
      // Try to find a quiet slot to move lunch to
      let bestSlot = -1;
      for (let c = lunchWinStart; c <= lunchWinEnd - 1; c++) {
        if (!peakSet.has(c) && c >= si && c + lunchSlots.length - 1 < ei) {
          // Check target slots are within shift and not reserved
          let ok = true;
          for (let k=0; k<lunchSlots.length; k++) {
            const tgt = c + k;
            if (row.acts[tgt] === 'Lunch') continue; // already lunch
            // Reject empty (outside shift) or DD slots — can't place lunch there
            if (row.acts[tgt] === '' || row.acts[tgt] === 'DD') { ok = false; break; }
          }
          if (ok && counts.Lunch[c] < BR.lunch.maxSimultaneous) {
            bestSlot = c; break;
          }
        }
      }
      if (bestSlot >= 0) {
        const changes = [];
        for (let k=0; k<lunchSlots.length; k++) {
          changes.push({ rowIdx, colIdx: lunchSlots[k], from:'Lunch', to: row.role==='Manager' ? (getFloorRoleForRow(row)||'Support') : 'LDSup' });
          changes.push({ rowIdx, colIdx: bestSlot+k, from: row.acts[bestSlot+k], to:'Lunch' });
        }
        const delta = scoreDelta(patIdx, changes);
        if (delta >= 0) {
          suggestions.push({
            id: `lunch-peak-${rowIdx}`,
            level: 'tactical', category: 'lunch',
            title: `Mover Lunch de ${row.role} ${rowIdx+1} fuera de hora pico`,
            description: `El lunch a las ${TIME_SLOTS[firstLunch]} cae en hora pico. Moverlo a las ${TIME_SLOTS[bestSlot]} (franja tranquila) mejora la cobertura en los slots más críticos.`,
            impact: `📊 Score: ${currentScore}% → ${currentScore + delta}%\n✅ Floor ${TIME_SLOTS[firstLunch]}: +${lunchSlots.length} personas`,
            confidence: delta >= 2 ? 'high' : 'medium',
            scoreDelta: delta,
            currentScore,
            projectedScore: currentScore + delta,
            affectedSlots: [...lunchSlots, ...lunchSlots.map((_,k)=>bestSlot+k)],
            affectedRows: [rowIdx],
            changes,
            conflictsWith: [],
            dismissed: false,
          });
        }
      }
    }

    // Too many lunches at the same time?
    for (const ls of lunchSlots) {
      if (counts.Lunch[ls] > BR.lunch.maxSimultaneous) {
        suggestions.push({
          id: `lunch-simultaneous-${ls}`,
          level: 'tactical', category: 'lunch',
          title: `${counts.Lunch[ls]} lunches simultáneos a las ${TIME_SLOTS[ls]}`,
          description: `Hay ${counts.Lunch[ls]} personas en Lunch al mismo tiempo en el slot ${TIME_SLOTS[ls]}, superando el máximo recomendado de ${BR.lunch.maxSimultaneous}. Esto puede dejar la tienda con cobertura insuficiente.`,
          impact: `⚠️ Máximo simultáneo: ${BR.lunch.maxSimultaneous} — actual: ${counts.Lunch[ls]}\n✅ Escalonar los lunches mejora la cobertura`,
          confidence: 'medium',
          scoreDelta: 2,
          currentScore,
          projectedScore: currentScore + 2,
          affectedSlots: [ls],
          affectedRows: [],
          changes: [],
          conflictsWith: [],
          dismissed: false,
        });
        break; // one suggestion per excess cluster
      }
    }

    // Lunch out of window?
    if (firstLunch < lunchWinStart || firstLunch > lunchWinEnd) {
      suggestions.push({
        id: `lunch-window-${rowIdx}`,
        level: 'tactical', category: 'lunch',
        title: `Lunch de ${row.role} ${rowIdx+1} fuera de ventana horaria`,
        description: `El lunch empieza a las ${TIME_SLOTS[firstLunch]}, fuera de la ventana permitida (${BR.lunch.windowStart}–${BR.lunch.windowEnd}). Esto penaliza el score.`,
        impact: `🔴 Ventana: ${BR.lunch.windowStart}–${BR.lunch.windowEnd} — actual: ${TIME_SLOTS[firstLunch]}`,
        confidence: 'high',
        scoreDelta: 3,
        currentScore,
        projectedScore: currentScore + 3,
        affectedSlots: lunchSlots,
        affectedRows: [rowIdx],
        changes: [],
        conflictsWith: [],
        dismissed: false,
      });
    }
  });

  return suggestions;
}

function analyzeOffFloor(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const counts = buildCounts(rows);
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const minFloor  = BR.coverage.lunchTrans.totalFloor;

  const peakSet = new Set();
  for (const ph of BR.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start), e = TIME_SLOTS.indexOf(ph.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) peakSet.add(i);
  }

  rows.forEach((row, rowIdx) => {
    if (row.role !== 'Manager') return;
    const [si, ei] = shiftIndices(row.shift);
    // AOR during peak when floor is low?
    for (let c=si; c<ei; c++) {
      if ((row.acts[c]==='AOR') && peakSet.has(c) && counts.Floor[c] < minFloor) {
        const floorRole = getFloorRoleForRow(row) || 'Support';
        const changes = [{ rowIdx, colIdx: c, from:'AOR', to: floorRole }];
        const delta = scoreDelta(patIdx, changes);
        if (delta > 0) {
          suggestions.push({
            id: `aor-peak-${rowIdx}-${c}`,
            level: 'tactical', category: 'aor',
            title: `${row.role} ${rowIdx+1} en AOR durante hora pico (${TIME_SLOTS[c]})`,
            description: `${row.role} ${rowIdx+1} está haciendo AOR a las ${TIME_SLOTS[c]} cuando el floor tiene solo ${counts.Floor[c]} personas (mínimo: ${minFloor}). Cambiar a ${floorRole} mejora la cobertura.`,
            impact: `📊 Floor ${TIME_SLOTS[c]}: ${counts.Floor[c]} → ${counts.Floor[c]+1} (+1)\n✅ Score estimado: +${delta} pts`,
            confidence: delta >= 2 ? 'high' : 'medium',
            scoreDelta: delta,
            currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
            projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + delta,
            affectedSlots: [c],
            affectedRows: [rowIdx],
            changes,
            conflictsWith: [],
            dismissed: false,
          });
          break; // one suggestion per person
        }
      }
    }
  });

  return suggestions;
}

function analyzeShifts(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const counts = buildCounts(rows);
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();

  // Check for coverage gap between morning and afternoon shifts
  let gapSlots = [];
  for (let c=openStart; c<=openEnd; c++) {
    if (counts.Floor[c] === 0) gapSlots.push(c);
  }
  if (gapSlots.length > 0) {
    suggestions.push({
      id: `shifts-gap-${patIdx}`,
      level: 'tactical', category: 'shifts',
      title: `Sin cobertura en ${gapSlots.length} slot(s) dentro del horario`,
      description: `Los slots ${gapSlots.map(c=>TIME_SLOTS[c]).join(', ')} no tienen nadie en floor durante el horario de apertura. Esto genera una penalización grave en el score.`,
      impact: `🔴 ${gapSlots.length} slots sin cobertura — penalización: -${gapSlots.length*10} pts\n✅ Cubrir estos slots podría mejorar el score significativamente`,
      confidence: 'high',
      scoreDelta: gapSlots.length * 8,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + gapSlots.length*8,
      affectedSlots: gapSlots,
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  // Check closing shift coverage
  const leadsAtClose = rows.filter(r => r.role==='Lead'    && r.acts[openEnd]!=='').length;
  const mgrsAtClose  = rows.filter(r => r.role==='Manager' && r.acts[openEnd]!=='').length;
  if (leadsAtClose < BR.closing.minLeads || mgrsAtClose < BR.closing.minManagers) {
    suggestions.push({
      id: `shifts-closing-${patIdx}`,
      level: 'tactical', category: 'shifts',
      title: `Cobertura de cierre insuficiente`,
      description: `Al cierre (${TIME_SLOTS[openEnd]}) hay ${leadsAtClose} Lead(s) y ${mgrsAtClose} Mgr(s). Se necesitan mínimo ${BR.closing.minLeads} Leads y ${BR.closing.minManagers} Mgr.`,
      impact: `🔴 Cierre: ${leadsAtClose}/${BR.closing.minLeads} Leads, ${mgrsAtClose}/${BR.closing.minManagers} Mgr\n✅ Añadir un turno de tarde o extender turnos existentes`,
      confidence: 'high',
      scoreDelta: 4,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + 4,
      affectedSlots: [openEnd],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function analyzeDD(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const ddSlot = TIME_SLOTS.indexOf(BUSINESS_RULES.dd.time); // 09:15
  if (ddSlot < 0) return suggestions;

  rows.forEach((row, rowIdx) => {
    const [si, ei] = shiftIndices(row.shift);
    const inTurnAtDD = si <= ddSlot && ddSlot < ei;
    const hasDD = row.acts[ddSlot] === 'DD';
    // Morning shift without DD
    if (inTurnAtDD && !hasDD && row.acts[ddSlot] !== '') {
      suggestions.push({
        id: `dd-missing-${rowIdx}`,
        level: 'tactical', category: 'dd',
        title: `${row.role} ${rowIdx+1} en turno a las 09:15 sin DD`,
        description: `${row.role} ${rowIdx+1} (turno ${row.shift}) tiene ${row.acts[ddSlot]} a las 09:15 en lugar de DD. Todos los que están en turno a esa hora deben hacer el Daily Download.`,
        impact: `⚠️ Actividad actual a las 09:15: ${row.acts[ddSlot] || '(vacío)'}\n✅ Cambiar a DD para cumplir la regla`,
        confidence: 'high',
        scoreDelta: 1,
        currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
        projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + 1,
        affectedSlots: [ddSlot],
        affectedRows: [rowIdx],
        changes: [{ rowIdx, colIdx: ddSlot, from: row.acts[ddSlot], to:'DD' }],
        conflictsWith: [],
        dismissed: false,
      });
    }
    // Afternoon/late shift WITH DD (shouldn't have DD)
    if (!inTurnAtDD && hasDD) {
      suggestions.push({
        id: `dd-wrong-${rowIdx}`,
        level: 'tactical', category: 'dd',
        title: `${row.role} ${rowIdx+1} tiene DD fuera de turno`,
        description: `${row.role} ${rowIdx+1} (turno ${row.shift}) no empieza hasta las ${TIME_SLOTS[si]} pero tiene DD marcado a las 09:15 — fuera de su turno.`,
        impact: `🔴 DD a las 09:15 pero turno empieza a ${TIME_SLOTS[si]}\n✅ Eliminar DD de este slot`,
        confidence: 'high',
        scoreDelta: 1,
        currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
        projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + 1,
        affectedSlots: [ddSlot],
        affectedRows: [rowIdx],
        changes: [{ rowIdx, colIdx: ddSlot, from:'DD', to:'' }],
        conflictsWith: [],
        dismissed: false,
      });
    }
  });
  return suggestions;
}

function analyzePairSwaps(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const BR = BUSINESS_RULES;

  // For each pair of Managers, check if swapping their floor role improves Coach count
  const mgrs = rows.map((r,i)=>({...r,rowIdx:i})).filter(r=>r.role==='Manager');
  for (let a=0; a<mgrs.length; a++) {
    for (let b=a+1; b<mgrs.length; b++) {
      const mA = mgrs[a], mB = mgrs[b];
      const [siA,eiA] = shiftIndices(mA.shift);
      const [siB,eiB] = shiftIndices(mB.shift);
      // Find overlapping floor slots
      const sharedSlots = [];
      for (let c=Math.max(siA,siB); c<Math.min(eiA,eiB); c++) {
        if ((mA.acts[c]==='Coach'||mA.acts[c]==='Support') && (mB.acts[c]==='Coach'||mB.acts[c]==='Support') && mA.acts[c]!==mB.acts[c]) {
          sharedSlots.push(c);
        }
      }
      if (sharedSlots.length < MIN_SWAP_SLOTS) continue; // swap only meaningful full-role-day swaps
      const changes = sharedSlots.flatMap(c => [
        { rowIdx: mA.rowIdx, colIdx: c, from: mA.acts[c], to: mB.acts[c] },
        { rowIdx: mB.rowIdx, colIdx: c, from: mB.acts[c], to: mA.acts[c] },
      ]);
      const delta = scoreDelta(patIdx, changes);
      if (delta > 0) {
        suggestions.push({
          id: `swap-roles-${mA.rowIdx}-${mB.rowIdx}`,
          level: 'tactical', category: 'swap',
          title: `Intercambiar roles Coach/Support entre Mgr ${mA.rowIdx+1} y Mgr ${mB.rowIdx+1}`,
          description: `Intercambiar los roles de Coach y Support entre estos dos Managers en sus slots compartidos mejora el balance de cobertura.`,
          impact: `📊 Score estimado: +${delta} pts\n✅ ${sharedSlots.length} slots mejorados`,
          confidence: 'medium',
          scoreDelta: delta,
          currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
          projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + delta,
          affectedSlots: sharedSlots,
          affectedRows: [mA.rowIdx, mB.rowIdx],
          changes,
          conflictsWith: [],
          dismissed: false,
        });
      }
    }
  }
  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — STRATEGIC ANALYZERS
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeSupplyDemand(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const counts = buildCounts(rows);
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const normFloor = BR.coverage.normal.totalFloor;
  const minFloor  = BR.coverage.lunchTrans.totalFloor;

  const peakSet = new Set();
  for (const ph of BR.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start), e = TIME_SLOTS.indexOf(ph.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) peakSet.add(i);
  }

  // Identify over/under supply clusters
  let underSlots = [], overSlots = [];
  for (let c=openStart; c<=openEnd; c++) {
    if (counts.Floor[c] < minFloor) underSlots.push(c);
    else if (counts.Floor[c] >= normFloor + 3) overSlots.push(c);
  }

  if (underSlots.length > 0 && overSlots.length > 0) {
    suggestions.push({
      id: `supply-demand-imbalance-${patIdx}`,
      level: 'strategic', category: 'supply',
      title: `Desequilibrio oferta/demanda: sub-cobertura en ${underSlots.length} slots y exceso en ${overSlots.length}`,
      description: `Hay slots con cobertura insuficiente (${underSlots.map(c=>TIME_SLOTS[c]).join(', ')}) y otros con exceso de 3+ personas (${overSlots.map(c=>TIME_SLOTS[c]).join(', ')}). Reasignar personas de los slots con exceso a los deficitarios mejoraría el patrón globalmente.`,
      impact: `🔴 Sub-cobertura: ${underSlots.length} slots (floor < ${minFloor})\n📈 Exceso: ${overSlots.length} slots (floor ≥ ${normFloor+3})\n✅ Redistribuir puede añadir +${Math.min(underSlots.length*2, 15)} pts`,
      confidence: 'medium',
      scoreDelta: Math.min(underSlots.length * 2, 15),
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + Math.min(underSlots.length*2, 15),
      affectedSlots: [...underSlots, ...overSlots],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  // Check lunch clustering (4+ lunches at same time causing dip)
  const lunchClusters = [];
  for (let c=openStart; c<=openEnd; c++) {
    if (counts.Lunch[c] >= 4) lunchClusters.push({ slot: c, count: counts.Lunch[c] });
  }
  if (lunchClusters.length > 0) {
    suggestions.push({
      id: `lunch-cluster-${patIdx}`,
      level: 'strategic', category: 'supply',
      title: `Caída drástica de cobertura por ${lunchClusters.length} cluster(s) de lunches`,
      description: `${lunchClusters.map(l=>`A las ${TIME_SLOTS[l.slot]}: ${l.count} lunches simultáneos`).join('; ')}. Escalonar los lunches en ±30 minutos reduciría el impacto en la cobertura.`,
      impact: `⚠️ Clusters de lunch detectados: ${lunchClusters.map(l=>TIME_SLOTS[l.slot]).join(', ')}\n✅ Escalonar lunches puede añadir +${lunchClusters.length*3} pts de score`,
      confidence: 'medium',
      scoreDelta: lunchClusters.length * 3,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + lunchClusters.length*3,
      affectedSlots: lunchClusters.map(l=>l.slot),
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function analyzePersonEfficiency(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const BR = BUSINESS_RULES;
  const isSat = patIdx === 3;
  const isSun = patIdx === 4;
  const expectedFloorH = isSat ? BR.saturday.manager.floorHours : (isSun ? BR.sunday.manager.floorHours : BR.weekday.manager.floorHours);
  const expectedAorH   = isSat ? BR.saturday.manager.aorHours   : (isSun ? BR.sunday.manager.aorHours   : BR.weekday.manager.aorHours);

  rows.forEach((row, rowIdx) => {
    if (row.role !== 'Manager') return;
    const [si, ei] = shiftIndices(row.shift);
    let floorSlots=0, aorSlots=0, emptySlots=0;
    for (let c=si; c<ei; c++) {
      const a = row.acts[c];
      if (a==='Coach'||a==='Support') floorSlots++;
      else if (a==='AOR'||a==='LDOPS') aorSlots++;
      else if (a===''||a==='MEETING') {}
      // DD/Lunch are neither
    }
    const floorH = floorSlots * 0.5;
    const aorH   = aorSlots * 0.5;

    if (floorH < expectedFloorH - 1) {
      suggestions.push({
        id: `efficiency-floor-low-${rowIdx}`,
        level: 'strategic', category: 'efficiency',
        title: `Manager ${rowIdx+1} con poco tiempo en floor (${floorH}h vs ${expectedFloorH}h esperadas)`,
        description: `Manager ${rowIdx+1} (${row.shift}) tiene solo ${floorH}h de floor cuando la regla indica ${expectedFloorH}h. Tiene ${aorH}h de AOR — podría convertir ${(expectedFloorH-floorH).toFixed(1)}h de AOR en floor.`,
        impact: `📊 Floor actual: ${floorH}h — objetivo: ${expectedFloorH}h\n⚠️ AOR actual: ${aorH}h (puede reducirse ${(expectedFloorH-floorH).toFixed(1)}h)`,
        confidence: 'medium',
        scoreDelta: Math.round((expectedFloorH - floorH) * 2),
        currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
        projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + Math.round((expectedFloorH-floorH)*2),
        affectedSlots: [],
        affectedRows: [rowIdx],
        changes: [],
        conflictsWith: [],
        dismissed: false,
      });
    }
  });

  return suggestions;
}

function analyzeRoleDistribution(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const counts = buildCounts(rows);
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();

  // Check slots where Coach >> Support or vice versa
  const imbalanced = [];
  for (let c=openStart; c<=openEnd; c++) {
    const coach   = counts.Coach[c];
    const support = counts.Support[c];
    if ((coach+support) < 2) continue;
    if (coach > 0 && support === 0 && coach >= 3) imbalanced.push({ slot:c, type:'too-coach', coach, support });
    if (support > 0 && coach === 0 && support >= 3) imbalanced.push({ slot:c, type:'no-coach', coach, support });
  }

  if (imbalanced.length > 0) {
    const noCoach = imbalanced.filter(x=>x.type==='no-coach');
    if (noCoach.length > 0) {
      suggestions.push({
        id: `roles-no-coach-${patIdx}`,
        level: 'strategic', category: 'roles',
        title: `Sin Coach en ${noCoach.length} slot(s) — solo Support`,
        description: `En los slots ${noCoach.map(x=>TIME_SLOTS[x.slot]).join(', ')} hay 0 Coaches en floor y ${noCoach[0].support}+ Support. Se necesitan mínimo 2 Coach en floor siempre. Revisar el rol diario de los Managers en esos horarios.`,
        impact: `🔴 Coach mínimo (2) incumplido en ${noCoach.length} slots\n✅ Cambiar al menos 2 Support a Coach en esos slots`,
        confidence: 'high',
        scoreDelta: noCoach.length * 2,
        currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
        projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + noCoach.length*2,
        affectedSlots: noCoach.map(x=>x.slot),
        affectedRows: [],
        changes: [],
        conflictsWith: [],
        dismissed: false,
      });
    }
  }

  return suggestions;
}

function analyzeResilience(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const minFloor  = BR.coverage.lunchTrans.totalFloor;

  let criticalPeople = [];
  for (let rowIdx=0; rowIdx<rows.length; rowIdx++) {
    const without = rows.filter((_,i)=>i!==rowIdx);
    const cWithout = buildCounts(without);
    let breaksMin = false;
    for (let c=openStart; c<=openEnd; c++) {
      if (cWithout.Floor[c] < minFloor) { breaksMin = true; break; }
    }
    if (breaksMin) criticalPeople.push(rowIdx);
  }

  const resilScore = Math.round((1 - criticalPeople.length/rows.length)*100);

  if (criticalPeople.length > rows.length * FRAGILITY_THRESHOLD) {
    suggestions.push({
      id: `resilience-fragile-${patIdx}`,
      level: 'strategic', category: 'resilience',
      title: `Patrón frágil: ${criticalPeople.length}/${rows.length} personas son críticas`,
      description: `Si falta cualquiera de las ${criticalPeople.length} personas críticas (posiciones: ${criticalPeople.map(i=>`${rows[i].role} ${i+1}`).join(', ')}), la cobertura mínima no se cumple. El índice de resiliencia es ${resilScore}%.`,
      impact: `⚠️ Índice de resiliencia: ${resilScore}%\n🔴 ${criticalPeople.length} personas sin sustituto funcional\n✅ Distribuir mejor las horas de floor aumenta la resiliencia`,
      confidence: 'medium',
      scoreDelta: 0,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      affectedSlots: [],
      affectedRows: criticalPeople,
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function analyzeCrossPattern() {
  const suggestions = [];
  const scores = [0,1,2,3].map(idx => calculateScoreForRows(currentState[idx], idx).score);
  const avg = scores.reduce((a,b)=>a+b,0)/4;

  // Find worst pattern
  const worstIdx = scores.indexOf(Math.min(...scores));
  const bestIdx  = scores.indexOf(Math.max(...scores));
  if (scores[bestIdx] - scores[worstIdx] > 15) {
    suggestions.push({
      id: `cross-pattern-gap`,
      level: 'strategic', category: 'cross',
      title: `Gran diferencia entre patrones: ${PATTERN_NAMES[worstIdx]} (${scores[worstIdx]}%) vs ${PATTERN_NAMES[bestIdx]} (${scores[bestIdx]}%)`,
      description: `El patrón "${PATTERN_NAMES[worstIdx]}" tiene ${scores[worstIdx]}% de score mientras que "${PATTERN_NAMES[bestIdx]}" tiene ${scores[bestIdx]}%. Una diferencia de ${scores[bestIdx]-scores[worstIdx]} puntos sugiere que el patrón peor tiene problemas estructurales que vale la pena revisar.`,
      impact: `📊 Scores semanales: L/J/V=${scores[0]}%, Mar=${scores[1]}%, Mié=${scores[2]}%, Sáb=${scores[3]}%\n✅ Alinear el peor patrón con las mejores prácticas del mejor`,
      confidence: 'medium',
      scoreDelta: 0,
      currentScore: scores[worstIdx],
      projectedScore: scores[worstIdx],
      affectedSlots: [],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  // Find consistently weak slots across all patterns
  const n = TIME_SLOTS.length;
  const openStart = getOpenStart(0);
  const openEnd   = getOpenEnd();
  const slotProblems = new Array(n).fill(0);
  for (let patIdx=0; patIdx<4; patIdx++) {
    const rows = currentState[patIdx];
    const counts = buildCounts(rows);
    const patOpenStart = getOpenStart(patIdx);
    for (let c=patOpenStart; c<=openEnd; c++) {
      if (counts.Floor[c] < BUSINESS_RULES.coverage.lunchTrans.totalFloor) slotProblems[c]++;
    }
  }
  const worstSlots = [];
  for (let c=openStart; c<=openEnd; c++) {
    if (slotProblems[c] >= 3) worstSlots.push({ slot:c, count:slotProblems[c] });
  }
  if (worstSlots.length > 0) {
    suggestions.push({
      id: `cross-pattern-slots`,
      level: 'strategic', category: 'cross',
      title: `Franjas problemáticas en ${worstSlots.length} slot(s) de forma recurrente`,
      description: `Los slots ${worstSlots.map(x=>TIME_SLOTS[x.slot]).join(', ')} tienen cobertura insuficiente en ${worstSlots[0].count} de 4 patrones. Este es un problema estructural, no puntual.`,
      impact: `🔴 Slots con sub-cobertura recurrente (≥3 patrones): ${worstSlots.map(x=>TIME_SLOTS[x.slot]).join(', ')}\n✅ Añadir personal o reorganizar lunches en esas franjas`,
      confidence: 'high',
      scoreDelta: 0,
      currentScore: avg,
      projectedScore: avg,
      affectedSlots: worstSlots.map(x=>x.slot),
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — RULE QUESTIONING
// ═══════════════════════════════════════════════════════════════════════════════

function questionCoverageMins(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const numOpen   = openEnd - openStart + 1;
  const counts    = buildCounts(rows);

  // How many slots ACTUALLY meet the 6-floor minimum?
  const normFloor = BR.coverage.normal.totalFloor;
  const minFloor  = BR.coverage.lunchTrans.totalFloor;
  let meetsNorm=0, meetsMins=0, total=0;
  for (let c=openStart; c<=openEnd; c++) {
    total++;
    if (counts.Floor[c] >= normFloor) meetsNorm++;
    if (counts.Floor[c] >= minFloor)  meetsMins++;
  }
  const normPct = Math.round(meetsNorm/total*100);
  const minPct  = Math.round(meetsMins/total*100);

  if (normPct < 70) {
    // Calculate theoretical max floor
    let totalFloorSlots = 0;
    for (const row of rows) {
      const [si,ei] = shiftIndices(row.shift);
      for (let c=si;c<ei;c++) {
        if (row.acts[c]==='Coach'||row.acts[c]==='Support'||row.acts[c]==='LDSup') totalFloorSlots++;
      }
    }
    const maxTheoreticalAvg = (totalFloorSlots/numOpen).toFixed(1);
    suggestions.push({
      id: `question-coverage-mins-${patIdx}`,
      level: 'rules', category: 'coverage',
      title: `¿Es realista el mínimo de ${normFloor} personas en floor?`,
      description: `Tu regla exige ${normFloor} personas en floor, pero solo se cumple en el ${normPct}% de los slots. El máximo teórico promedio con el staff actual es ${maxTheoreticalAvg} personas/slot. Considera si el mínimo de ${normFloor} es alcanzable con el equipo disponible, o si debería bajarse a ${normFloor-1} en franjas tranquilas.`,
      impact: `📊 Cumplimiento actual del mínimo (${normFloor}): ${normPct}% de slots\n📈 Máximo teórico: ${maxTheoreticalAvg} personas/slot promedio\n💡 Bajar a ${normFloor-1} en franjas tranquilas podría mejorar el score sin impacto real`,
      confidence: 'low',
      scoreDelta: 5,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + 5,
      affectedSlots: [],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  // Coach minimum (2) — check fulfillment rate
  let coachOk = 0;
  for (let c=openStart; c<=openEnd; c++) if (counts.Coach[c]>=2) coachOk++;
  const coachPct = Math.round(coachOk/total*100);
  if (coachPct < 68) {
    suggestions.push({
      id: `question-coach-min-${patIdx}`,
      level: 'rules', category: 'coverage',
      title: `Mínimo de 2 Coach cumplido solo en ${coachPct}% de los slots`,
      description: `La regla exige 2 Coach en floor en todo momento, pero se cumple en solo ${coachPct}% de los slots. O necesitas más Managers en rol Coach, o deberías revisar si 1 Coach + 3 Support es suficiente en franjas de baja actividad.`,
      impact: `📊 Coach ≥ 2: ${coachPct}% de slots OK\n💡 Considerar 1 Coach suficiente en franjas tranquilas (09:30-11:00, 15:00-16:00)`,
      confidence: 'low',
      scoreDelta: 3,
      currentScore: calculateScoreForRows(currentState[patIdx],patIdx).score,
      projectedScore: calculateScoreForRows(currentState[patIdx],patIdx).score + 3,
      affectedSlots: [],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function questionPeakHours() {
  const suggestions = [];
  const n = TIME_SLOTS.length;
  const openStart = getOpenStart(0);
  const openEnd   = getOpenEnd();

  // Calculate average floor per slot across all patterns
  const avgFloor = new Array(n).fill(0);
  let patCount = 0;
  for (let patIdx=0; patIdx<4; patIdx++) {
    const counts = buildCounts(currentState[patIdx]);
    const os = getOpenStart(patIdx);
    for (let c=os; c<=openEnd; c++) avgFloor[c] += counts.Floor[c];
    patCount++;
  }
  for (let c=0; c<n; c++) avgFloor[c] /= patCount;

  // Get peak slots set from rules
  const peakSet = new Set();
  for (const ph of BUSINESS_RULES.coverage.peakHours) {
    const s = TIME_SLOTS.indexOf(ph.start), e = TIME_SLOTS.indexOf(ph.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) peakSet.add(i);
  }
  const quietSet = new Set();
  for (const qh of (BUSINESS_RULES.quietHours||[])) {
    const s = TIME_SLOTS.indexOf(qh.start), e = TIME_SLOTS.indexOf(qh.end);
    if (s>=0 && e>=0) for (let i=s;i<=e;i++) quietSet.add(i);
  }

  // Check if any "quiet" slot has more floor than a "peak" slot
  let quietHigherThanPeak = [];
  for (const qs of quietSet) {
    for (const ps of peakSet) {
      if (avgFloor[qs] > avgFloor[ps] + 1) {
        quietHigherThanPeak.push({ quiet: qs, peak: ps, qFloor: avgFloor[qs].toFixed(1), pFloor: avgFloor[ps].toFixed(1) });
      }
    }
  }
  if (quietHigherThanPeak.length > 0) {
    const ex = quietHigherThanPeak[0];
    suggestions.push({
      id: `question-peak-hours`,
      level: 'rules', category: 'peak',
      title: `¿Están bien clasificadas las horas pico?`,
      description: `La franja "${TIME_SLOTS[ex.quiet]}" que marcas como "tranquila" tiene de media ${ex.qFloor} personas en floor, mientras que la franja "${TIME_SLOTS[ex.peak]}" que marcas como "pico" tiene solo ${ex.pFloor}. Los datos reales no coinciden con la clasificación actual. ¿Deberías reclasificar las franjas?`,
      impact: `📊 Franja tranquila ${TIME_SLOTS[ex.quiet]}: ${ex.qFloor} floor promedio\n📊 Franja pico ${TIME_SLOTS[ex.peak]}: ${ex.pFloor} floor promedio\n💡 Reclasificar franjas alinearía las expectativas con la realidad`,
      confidence: 'low',
      scoreDelta: 2,
      currentScore: 0,
      projectedScore: 2,
      affectedSlots: [ex.quiet, ex.peak],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function questionRoleHours() {
  const suggestions = [];
  const BR = BUSINESS_RULES;

  // Check if increasing manager floor time would help
  for (let patIdx=0; patIdx<5; patIdx++) {
    const rows = currentState[patIdx];
    if (!rows) continue;
    const openStart = getOpenStart(patIdx);
    const openEnd   = getOpenEnd();
    const counts    = buildCounts(rows);
    const isSat = patIdx === 3;
    const isSun = patIdx === 4;

    let underFloorSlots = 0;
    for (let c=openStart; c<=openEnd; c++) {
      if (counts.Floor[c] < BR.coverage.normal.totalFloor) underFloorSlots++;
    }
    if (underFloorSlots < 3) continue;

    const floorH  = isSat ? BR.saturday.manager.floorHours  : (isSun ? BR.sunday.manager.floorHours  : BR.weekday.manager.floorHours);
    const aorH    = isSat ? BR.saturday.manager.aorHours    : (isSun ? BR.sunday.manager.aorHours    : BR.weekday.manager.aorHours);

    if (aorH >= 3) {
      suggestions.push({
        id: `question-role-hours-${patIdx}`,
        level: 'rules', category: 'role-hours',
        title: `¿${floorH}h floor / ${aorH}h AOR es la distribución óptima para ${PATTERN_NAMES[patIdx]}?`,
        description: `El patrón "${PATTERN_NAMES[patIdx]}" tiene ${underFloorSlots} slots con cobertura insuficiente. Si los Managers hicieran ${floorH+1}h floor / ${aorH-1}h AOR, podrías cubrir mejor esos huecos. El impacto en AOR sería -1h/Manager/día pero la cobertura mejoraría significativamente.`,
        impact: `📊 Slots con floor bajo: ${underFloorSlots}\n💡 ${floorH+1}h floor / ${aorH-1}h AOR añadiría ~+${Math.round(underFloorSlots*0.8)} pts al score\n⚠️ AOR se reduciría en ${(rows.filter(r=>r.role==='Manager').length)}h totales/día`,
        confidence: 'low',
        scoreDelta: Math.round(underFloorSlots * 0.8),
        currentScore: calculateScoreForRows(rows, patIdx).score,
        projectedScore: calculateScoreForRows(rows, patIdx).score + Math.round(underFloorSlots * 0.8),
        affectedSlots: [],
        affectedRows: [],
        changes: [],
        conflictsWith: [],
        dismissed: false,
      });
      break; // one suggestion total to avoid spam
    }
  }

  return suggestions;
}

function questionStaffing(patIdx) {
  const rows = currentState[patIdx];
  const suggestions = [];
  const BR = BUSINESS_RULES;
  const openStart = getOpenStart(patIdx);
  const openEnd   = getOpenEnd();
  const numOpen   = openEnd - openStart + 1;
  const normFloor = BR.coverage.normal.totalFloor;

  // Max theoretical floor per slot
  let totalFloorSlots = 0;
  for (const row of rows) {
    const [si,ei] = shiftIndices(row.shift);
    for (let c=si;c<ei;c++) {
      if (row.acts[c]==='Coach'||row.acts[c]==='Support'||row.acts[c]==='LDSup') totalFloorSlots++;
    }
  }
  const maxAvg = totalFloorSlots / numOpen;

  if (maxAvg < normFloor) {
    const needed = Math.ceil(normFloor * numOpen / (HOURS_PER_SHIFT * SLOTS_PER_HOUR)); // rough estimate: (minFloor × openSlots) / (shift_hours × slots_per_hour)
    suggestions.push({
      id: `question-staffing-${patIdx}`,
      level: 'rules', category: 'staffing',
      title: `Staff insuficiente para cumplir todas las reglas en ${PATTERN_NAMES[patIdx]}`,
      description: `Para mantener ${normFloor} personas en floor durante todas las ${numOpen} franjas de apertura, el máximo teórico con el staff actual es solo ${maxAvg.toFixed(1)} personas/slot. Esto significa que el objetivo de ${normFloor} es físicamente imposible de cumplir al 100% con el equipo actual.`,
      impact: `📊 Mínimo requerido: ${normFloor} personas/slot × ${numOpen} slots\n📉 Máximo teórico: ${maxAvg.toFixed(1)} personas/slot\n💡 Añadir ~${Math.max(1, needed - rows.length)} persona(s) al patrón o relajar el mínimo`,
      confidence: 'medium',
      scoreDelta: 0,
      currentScore: calculateScoreForRows(rows, patIdx).score,
      projectedScore: calculateScoreForRows(rows, patIdx).score,
      affectedSlots: [],
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}

function questionMeetings(patIdx) {
  const suggestions = [];
  const BR = BUSINESS_RULES;
  if (patIdx !== 1 && patIdx !== 2) return suggestions; // meetings only on Tue/Wed

  const rows  = currentState[patIdx];
  const mtg   = patIdx===1 ? BR.meetings.martes : BR.meetings.miercoles;
  const mStart = TIME_SLOTS.indexOf(mtg.start);
  const mEnd   = TIME_SLOTS.indexOf(mtg.end);
  if (mStart<0||mEnd<0) return suggestions;

  // How many people are in MEETING during meeting slots?
  const meetingAttendees = rows.filter(r => r.acts[mStart] === 'MEETING' || r.acts[mStart] === 'AOR').length;
  const floorDuringMeeting = [];
  for (let c=mStart; c<mEnd; c++) {
    const cnt = rows.filter(r => r.acts[c]==='Coach'||r.acts[c]==='Support'||r.acts[c]==='LDSup').length;
    floorDuringMeeting.push({ slot:c, count:cnt });
  }
  const minFloorMeeting = Math.min(...floorDuringMeeting.map(x=>x.count));

  if (minFloorMeeting === 0) {
    suggestions.push({
      id: `question-meeting-zero-floor-${patIdx}`,
      level: 'rules', category: 'meetings',
      title: `Reunión de ${mtg.name}: 0 personas en floor durante ${mtg.start}-${mtg.end}`,
      description: `Durante la reunión de ${mtg.name} (${mtg.start}-${mtg.end}), hay slots con CERO personas en floor. La regla dice que debe haber ${patIdx===1?mtg.exceptions.mgrSupport+' Mgr Support + '+mtg.exceptions.leadFloor+' Lead':'al menos '+mtg.exceptions.mgrFloor+' Manager'} en floor. Verificar que las excepciones están correctamente aplicadas.`,
      impact: `🔴 Floor durante reunión: 0 personas en algunos slots\n✅ Asegurar que las excepciones de la reunión están en floor`,
      confidence: 'high',
      scoreDelta: 8,
      currentScore: calculateScoreForRows(rows, patIdx).score,
      projectedScore: calculateScoreForRows(rows, patIdx).score + 8,
      affectedSlots: floorDuringMeeting.filter(x=>x.count===0).map(x=>x.slot),
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  } else if (minFloorMeeting < BUSINESS_RULES.coverage.lunchTrans.totalFloor) {
    suggestions.push({
      id: `question-meeting-low-floor-${patIdx}`,
      level: 'rules', category: 'meetings',
      title: `Reunión ${mtg.name}: floor bajo (${minFloorMeeting}) durante la reunión`,
      description: `Durante ${mtg.name} (${mtg.start}-${mtg.end}) el floor baja a ${minFloorMeeting} personas, por debajo del mínimo de transición (${BUSINESS_RULES.coverage.lunchTrans.totalFloor}). ¿Se podría dividir la reunión en dos bloques de 1h con rotación de asistentes para mantener mejor cobertura?`,
      impact: `⚠️ Floor mínimo durante reunión: ${minFloorMeeting} personas\n💡 Dividir en 2 grupos rotativos mantendría siempre ${Math.ceil(rows.length/2)} personas en floor`,
      confidence: 'low',
      scoreDelta: 3,
      currentScore: calculateScoreForRows(rows, patIdx).score,
      projectedScore: calculateScoreForRows(rows, patIdx).score + 3,
      affectedSlots: floorDuringMeeting.map(x=>x.slot),
      affectedRows: [],
      changes: [],
      conflictsWith: [],
      dismissed: false,
    });
  }

  return suggestions;
}


// ── toggleDayOff helper for team modal ───────────────────────────────────────
function toggleDayOff(role, idx, dayNum) {
  const member = role === 'lead' ? teamData.leads[idx] : teamData.managers[idx];
  if (!member) return;
  const key = dayNum;
  if (!member.daysOff) member.daysOff = [];
  const i = member.daysOff.indexOf(key);
  if (i >= 0) member.daysOff.splice(i, 1);
  else member.daysOff.push(key);
  saveTeam();
  renderTeamModal();
}
// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════
let importedPatternData = null;

function openImportPatterns() {
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('import-preview');
  const err = document.getElementById('import-error');
  const btn = document.getElementById('btn-import-confirm');
  if (preview) preview.style.display = 'none';
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (btn) btn.disabled = true;
  importedPatternData = null;
  document.getElementById('modal-import').classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.addEventListener('change', () => handleImportFileChange(fileInput.files[0]));
});

function handleImportFileChange(file) {
  const preview = document.getElementById('import-preview');
  const err = document.getElementById('import-error');
  const btn = document.getElementById('btn-import-confirm');
  const previewMsg = document.getElementById('import-preview-msg');

  importedPatternData = null;
  if (btn) btn.disabled = true;
  if (preview) preview.style.display = 'none';
  if (err) { err.style.display = 'none'; err.textContent = ''; }

  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let parsed;
      if (ext === 'json') {
        parsed = parseImportJSON(content);
      } else if (ext === 'csv') {
        parsed = parseImportCSV(content);
      } else {
        throw new Error(`Formato no soportado (.${ext}). Usa .json o .csv`);
      }
      importedPatternData = parsed;
      if (preview) preview.style.display = 'block';
      if (previewMsg) previewMsg.textContent = `✅ ${parsed.length} filas detectadas. Listo para importar al patrón "${PATTERN_NAMES[activePattern]}".`;
      if (btn) btn.disabled = false;
    } catch(ex) {
      if (err) { err.textContent = '❌ ' + ex.message; err.style.display = 'block'; }
      importedPatternData = null;
    }
  };
  reader.readAsText(file);
}

function parseImportJSON(content) {
  const data = JSON.parse(content);
  const rows = Array.isArray(data) ? data : (data.rows || data.pattern || data.patrones || null);
  if (!rows || !Array.isArray(rows)) throw new Error('JSON inválido: se esperaba un array de filas o { rows: [...] }');
  return normalizeImportRows(rows);
}

function parseImportCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV vacío o sin datos');
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const roleIdx  = header.findIndex(h => /^rol(e)?$/i.test(h));
  const shiftIdx = header.findIndex(h => /^(shift|turno)$/i.test(h));
  if (roleIdx < 0 || shiftIdx < 0) throw new Error('CSV: cabeceras requeridas: role (o rol) y shift (o turno)');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (!cols[roleIdx]) continue;
    const actsRaw = cols.slice(Math.max(roleIdx, shiftIdx) + 1).join(',');
    let acts = [];
    try { acts = JSON.parse(actsRaw); } catch(e) {
      acts = actsRaw ? actsRaw.split('|').map(a => a.trim()) : [];
    }
    rows.push({ role: cols[roleIdx], shift: cols[shiftIdx] || '', acts });
  }
  if (rows.length === 0) throw new Error('CSV sin filas de datos válidas');
  return normalizeImportRows(rows);
}

function normalizeImportRows(rows) {
  const validRoles = ['Lead', 'Manager'];
  const n = TIME_SLOTS.length;
  return rows.map((row, idx) => {
    const role = row.role || row.rol || 'Manager';
    if (!validRoles.includes(role)) throw new Error(`Fila ${idx + 1}: rol inválido "${role}". Usa Lead o Manager.`);
    const shift = row.shift || row.turno || '';
    let acts = row.acts || row.actividades || [];
    if (!Array.isArray(acts)) acts = [];
    while (acts.length < n) acts.push('');
    acts = acts.slice(0, n);
    const r = { role, shift, acts };
    if (row.assignedId) r.assignedId = row.assignedId;
    return r;
  });
}

function confirmImportPatterns() {
  if (!importedPatternData) return;
  pushUndo(activePattern);
  currentState[activePattern] = importedPatternData;
  saveState();
  closeModal('modal-import');
  importedPatternData = null;
  render(activePattern);
  showToast(`✅ Patrón importado correctamente (${currentState[activePattern].length} filas)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLICATE PATTERN
// ═══════════════════════════════════════════════════════════════════════════════
function openReplicatePattern() {
  const select = document.getElementById('replicate-target-select');
  if (select) select.value = (activePattern + 1) % 5;
  document.getElementById('modal-replicate').classList.add('open');
}

function confirmReplicatePattern() {
  const select = document.getElementById('replicate-target-select');
  if (!select) return;
  const targetIdx = parseInt(select.value);
  if (isNaN(targetIdx) || targetIdx === activePattern) {
    showToast('⚠️ Selecciona un patrón de destino diferente al actual');
    return;
  }
  pushUndo(targetIdx);
  currentState[targetIdx] = currentState[activePattern].map(row => ({
    role: row.role, shift: row.shift, acts: [...row.acts], assignedId: row.assignedId
  }));
  saveState();
  closeModal('modal-replicate');
  showToast(`✅ Patrón replicado a "${PATTERN_NAMES[targetIdx]}"`);
}

// ── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, duration) {
  const el = document.getElementById('undo-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  if (el._toastTimer) clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(() => el.classList.remove('visible'), duration || 2500);
}
