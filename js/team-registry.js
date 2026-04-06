/* ===== team-registry.js — Fuente única de identidad del equipo ===== */
/* Exposes window.TEAM_REGISTRY used by vacaciones.js and planificador.js */
(function () {
  'use strict';

  // ── Master list ──────────────────────────────────────────────────────────────
  // Source of truth for team identity/role/section data.
  // NOTE: Constraints (.c) are NOT stored here — they come from
  //       CONFIG.planificador.restriccionesPersonales (set up in Fase 4).
  var MASTER = [
    // Store Leaders
    { id: 'diego',    name: 'Diego Rivero',    role: 'SL',           area: 'Store',        dept: 'Store',        section: 'Store Leaders'   },
    { id: 'jordi',    name: 'Jordi Pajares',   role: 'SL',           area: 'Store',        dept: 'Store',        section: 'Store Leaders'   },
    // Senior Managers
    { id: 'jorge',    name: 'Jorge Gil',       role: 'SM',           area: 'Shopping+Biz', dept: 'Shopping+Biz', section: 'Senior Managers' },
    { id: 'sheila',   name: 'Sheila Yubero',   role: 'SM',           area: 'People',       dept: 'People',       section: 'Senior Managers' },
    { id: 'itziar',   name: 'Itziar Cacho',    role: 'SM',           area: 'Support',      dept: 'Support',      section: 'Senior Managers' },
    { id: 'cris_c',   name: 'Cristina Carcel', role: 'SM',           area: 'Ops',          dept: 'Ops',          section: 'Senior Managers' },
    // Managers
    { id: 'jesus',    name: 'Jesús Pazos',     role: 'MGR',          area: 'Shopping+Biz', dept: 'Shopping+Biz', section: 'Managers'        },
    { id: 'pedro',    name: 'Pedro Borlido',   role: 'MGR',          area: 'Shopping+Biz', dept: 'Shopping+Biz', section: 'Managers'        },
    { id: 'julie',    name: 'Julie Robin',     role: 'MGR',          area: 'Shopping+Biz', dept: 'Shopping+Biz', section: 'Managers'        },
    { id: 'javi_s',   name: 'Javi Sanchez',    role: 'MGR',          area: 'Shopping+Biz', dept: 'Shopping+Biz', section: 'Managers'        },
    { id: 'meri',     name: 'Meri Alvarez',    role: 'MGR',          area: 'People',       dept: 'People',       section: 'Managers'        },
    { id: 'toni',     name: 'Toni Medina',     role: 'MGR',          area: 'People',       dept: 'People',       section: 'Managers'        },
    { id: 'deborah',  name: 'Deborah Ibañez',  role: 'MGR',          area: 'Support',      dept: 'Support',      section: 'Managers'        },
    { id: 'ane',      name: 'Ana Maria Pazos', role: 'MGR',          area: 'Support',      dept: 'Support',      section: 'Managers'        },
    { id: 'ricardo',  name: 'Ricardo Sosa',    role: 'MGR',          area: 'Support',      dept: 'Support',      section: 'Managers'        },
    { id: 'javi_q',   name: 'Javier Quiros',   role: 'MGR',          area: 'Support',      dept: 'Support',      section: 'Managers'        },
    { id: 'cris_u',   name: 'Cristina Uson',   role: 'MGR',          area: 'Ops',          dept: 'Ops',          section: 'Managers'        },
    { id: 'javi_can', name: 'Javi Canfranc',   role: 'MGR',          area: 'Ops',          dept: 'Ops',          section: 'Managers'        },
    { id: 'david',    name: 'David Carrillo',  role: 'MGR',          area: 'Ops',          dept: 'Ops',          section: 'Managers'        },
    // Leads
    { id: 'aurora',   name: 'Aurora Comesaña', role: 'OPS_LEAD',     area: 'Ops',          dept: 'Ops',          section: 'Leads'           },
    { id: 'ruben',    name: 'Rubén Martínez',  role: 'OPS_LEAD',     area: 'Ops',          dept: 'Ops',          section: 'Leads'           },
    { id: 'eva_f',    name: 'Eva Famoso',      role: 'LEAD_GENIUS',  area: 'Genius',       dept: 'Genius',       section: 'Leads'           },
    { id: 'eva_h',    name: 'Eva Hernandez',   role: 'LEAD_GENIUS',  area: 'Genius',       dept: 'Genius',       section: 'Leads'           },
    { id: 'alberto',  name: 'Alberto Ortiz',   role: 'LEAD_SHOPPING',area: 'Shopping',     dept: 'Shopping',     section: 'Leads'           },
    { id: 'clara',    name: 'Clara González',  role: 'LEAD_SHOPPING',area: 'Shopping',     dept: 'Shopping',     section: 'Leads'           },
    { id: 'eli',      name: 'Eli Moreno',      role: 'LEAD_SHOPPING',area: 'Shopping',     dept: 'Shopping',     section: 'Leads'           },
  ];

  // ── Section order (preserved for getSections()) ──────────────────────────────
  var SECTION_ORDER = ['Store Leaders', 'Senior Managers', 'Managers', 'Leads'];

  // ── Merge with localStorage ──────────────────────────────────────────────────
  // Reads equipo_team_data (written by equipo.html) and applies updates on top
  // of the master list.  If no localStorage data exists, the master list is used
  // as-is.  We NEVER remove people from the registry based on localStorage — only
  // add new ones or update existing names/roles.
  function buildPeople() {
    var fromLS = null;
    try {
      var raw = localStorage.getItem('equipo_team_data');
      if (raw) fromLS = JSON.parse(raw);
    } catch (e) {
      fromLS = null;
    }

    // Start from a deep copy of MASTER
    var people = MASTER.map(function (p) {
      return { id: p.id, name: p.name, role: p.role, area: p.area, dept: p.dept, section: p.section };
    });

    if (!fromLS || !Array.isArray(fromLS)) return people;

    fromLS.forEach(function (lsPerson) {
      if (!lsPerson || !lsPerson.id) return;
      var existing = null;
      for (var i = 0; i < people.length; i++) {
        if (people[i].id === lsPerson.id) { existing = people[i]; break; }
      }
      if (existing) {
        // Update identity fields if provided
        if (lsPerson.name) existing.name = lsPerson.name;
        if (lsPerson.role) existing.role = lsPerson.role;
        if (lsPerson.area) existing.area = lsPerson.area;
        if (lsPerson.dept) existing.dept = lsPerson.dept;
        if (lsPerson.section) existing.section = lsPerson.section;
      } else {
        // New person not in master — append
        people.push({
          id:      lsPerson.id,
          name:    lsPerson.name || lsPerson.id,
          role:    lsPerson.role || 'MGR',
          area:    lsPerson.area || '',
          dept:    lsPerson.dept || '',
          section: lsPerson.section || 'Managers',
        });
      }
    });

    return people;
  }

  var people = buildPeople();

  // ── Public API ───────────────────────────────────────────────────────────────
  window.TEAM_REGISTRY = {
    /** Flat array of all people objects {id, name, role, area, dept, section} */
    people: people,

    /** Returns the flat people array (no section separators) */
    getPeople: function () {
      return people;
    },

    /** Returns a person by id, or undefined */
    getById: function (id) {
      for (var i = 0; i < people.length; i++) {
        if (people[i].id === id) return people[i];
      }
      return undefined;
    },

    /**
     * Returns an array interleaved with section-header objects (like the TEAM
     * constant in vacaciones.js):
     *   [ { section: 'Store Leaders' }, { id, name }, ..., { section: 'Managers' }, ... ]
     */
    getSections: function () {
      // Group people by section
      var bySection = {};
      people.forEach(function (p) {
        var sec = p.section || 'Other';
        if (!bySection[sec]) bySection[sec] = [];
        bySection[sec].push({ id: p.id, name: p.name });
      });

      var result = [];

      // Emit sections in canonical order first
      SECTION_ORDER.forEach(function (sec) {
        if (bySection[sec] && bySection[sec].length > 0) {
          result.push({ section: sec });
          bySection[sec].forEach(function (p) { result.push(p); });
          delete bySection[sec];
        }
      });

      // Any extra sections (people added via localStorage with unknown section)
      Object.keys(bySection).forEach(function (sec) {
        if (bySection[sec].length > 0) {
          result.push({ section: sec });
          bySection[sec].forEach(function (p) { result.push(p); });
        }
      });

      return result;
    },
  };
}());
