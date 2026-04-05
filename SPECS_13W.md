# 📋 Especificación Completa — Planificador de 13 Semanas

> **Documento de referencia** con TODAS las reglas de negocio para la generación automática de horarios trimestrales.
> Última actualización: 2026-04-05

---

## 🏪 1. Tienda — Passeig de Gràcia (PDG)

| Parámetro | Valor |
|---|---|
| Apertura tienda | 09:30 (siempre, no cambia) |
| Cierre verano | 21:30 (última persona sale 22:00) |
| Cierre invierno | 21:00 (última persona sale 21:30) |
| Cambio a verano | 1 de junio |
| Cambio a invierno | 1 de octubre |
| Domingos | Cerrado (excepto algunos especiales — ver calendario de aperturas) |
| Festivos | Según calendario de aperturas (pendiente de pasar) |

---

## 👥 2. Equipo Completo

### Store Leaders (2) — NO cuentan para cobertura
| Nombre | Notas |
|---|---|
| Diego Rivero | — |
| Jordi Pajares | — |

### Senior Managers (4)
| Nombre | Área | Horas | Concreción |
|---|---|---|---|
| Jorge Gil | Shopping + Business | 40h | Lun y Mié: 8-17. Cuando mañana prefiere 10-19. Resto disponible |
| Sheila Yubero | People | 40h | — |
| Itziar Cacho | Support | 40h | — |
| Cris Carcel | Ops & T@A | 40h | Lun-Vie de mañana (entre 7 y 17). Inquebrantable |

### Managers (13 + 1 vacante)
| Nombre | Área | Subrol | Horas | Concreción |
|---|---|---|---|---|
| Jesús Pazos | Shopping + Business | Shopping Manager | 40h | — |
| Pedro Borlido | Shopping + Business | Shopping Manager | 40h | — |
| Julie Robin | Shopping + Business | Shopping Manager | 40h | — |
| Javi Sánchez | Shopping + Business | Business Manager | 40h | AOR fijo: Lunes y Viernes (SEM) |
| *(Vacante)* | Shopping + Business | Shopping Manager | — | — |
| Meri Alvarez | People | People Manager | 40h | Lun: 10-cierre (22:00). Mar: 10-19. Mié-Vie: 7-16. Sáb/Dom/Festivos: disponible |
| Toni Medina | People | People Manager | 40h | — |
| Deborah Ibañez | Support | Support Manager | 40h | — |
| Ane Pazos | Support | Support Manager | 40h | Semana A: L-V 7-16, Sáb-Dom descanso. Semana B: libre disposición. W1 Q actual (30 marzo) = Semana A. Alterna: A, B, A, B... |
| Ricardo Sosa | Support | Support Manager | 40h | — |
| Javi Quiros | Support | Support Manager | 40h | — |
| Cris Usón | Ops & T@A | Ops Manager | 40h | — |
| Javi Canfranc | Ops & T@A | Ops Manager | 40h | — |
| David Carrillo | Ops & T@A | T@A Manager | 40h | — |

### Leads (8 + 1 nuevo sin nombre)
| Nombre | Tipo | Horas | Concreción |
|---|---|---|---|
| Aurora Comesaña | Ops Lead | 40h | Siempre abre (7:00) o cierra (22:00/21:30). 3 días LDOPS completos. Cruzada con Rubén |
| Rubén Martínez | Ops Lead (interim) | 40h | Idem Aurora. Cruzado con Aurora |
| Eva Famoso | Lead Genius | 40h | — |
| Eva Hernandez | Lead Genius | 32h | **Siempre mañana** (inquebrantable). Finde sí/finde no (garantizar). Horario: Finde libre: 3×6h + 2×7h. Finde trabajando: 4×6h + 1×8h |
| Alberto Ortiz | Lead Genius | 40h | — |
| Clara González | Lead Shopping | 40h | **Delegada comisiones**: no libra jueves. Horas sindicales jueves 9-13, después se incorpora a turno normal |
| Eli Moreno | Lead Shopping | 40h | **Siempre mañana** (inquebrantable). Finde sí/finde no (garantizar) |
| *(Nuevo lead, sin nombre)* | Lead Shopping | — | — |

---

## 🕐 3. Turnos

| Turno | Horario | Bloque | Rol floor por defecto |
|---|---|---|---|
| Open | 7:00–16:00 | Mañana | Support |
| Early | 8:00–17:00 | Mañana | Coach |
| Early S | 8:00–17:00 | Mañana | Support |
| Early C1 | 8:00–17:00 | Mañana | Coach |
| Early C2 | 8:00–17:00 | Mañana | Coach |
| Mid | 11:00–20:00 | Tarde | Coach |
| Mid S | 11:00–20:00 | Tarde | Support |
| Late | 12:00–21:00 | Tarde | Support |
| Close | 13:00–22:00 | Tarde | Support |
| Close C1 | 13:00–22:00 | Tarde | Coach |
| Close C2 | 13:00–22:00 | Tarde | Coach |

**Invierno**: Close/Close C1/Close C2 = 12:30–21:30

**Clasificación mañana/tarde:**
- **Mañana**: Open, Early, Early S, Early C1, Early C2
- **Tarde**: Mid, Mid S, Late, Close, Close C1, Close C2

---

## 📊 4. Cobertura Mínima de Floor

### Entre semana (L-V)
| Franja | Support | Coach | Total |
|---|---|---|---|
| 09:30–11:00 | 2 | 1 | 3 |
| 11:00–12:00 | 3 | 2 | 5 |
| 12:00–13:00 | 3 | 2 | 5 |
| 13:00–14:00 | 4 | 2 | 6 |
| 14:00–15:00 | 4 | 2 | 6 |
| 15:00–17:00 | 3 | 2 | 5 |
| 17:00–21:00 | 4 | 2 | 6 |
| 21:00–21:30 | 3 | 2 | 5 |

### Sábados
- Ideal: **siempre 4 Support + 2 Coach** en todas las franjas

### Apertura y cierre
| Momento | Personas | Roles |
|---|---|---|
| Apertura 07:00 | 2 | 2 Leads |
| Apertura 08:00 | +2 | 2 Managers |
| Cierre (post-tienda) | 4 | 2 Leads + 2 Managers |

### Personas mínimas por día
| Día | Mínimo total |
|---|---|
| Entre semana (L-V) | ~14 personas |
| Sábado | ~12 personas |

---

## 📋 5. Actividades por Rol

### Managers (L-V)
| Actividad | Horas | Notas |
|---|---|---|
| Floor (Coach O Support) | 4h | **Nunca mezcla** Coach y Support el mismo día |
| AOR | 4h | Gestión oficina |
| Lunch | 1h | Dentro del turno de 9h |

### Managers (Sábado)
| Actividad | Horas |
|---|---|
| Floor | 6h |
| AOR | 2h |
| Lunch | 1h |

### Leads y Lead Genius (L-V)
| Actividad | Horas |
|---|---|
| Floor (LDSup) | 5h |
| LDOPS | 3h |
| Lunch | 1h |

### Leads y Lead Genius (Sábado)
| Actividad | Horas |
|---|---|
| Floor (LDSup) | 6h |
| LDOPS | 2h |
| Lunch | 1h |

### Ops Leads (Aurora, Rubén)
| Tipo de día | Floor | LDOPS | Lunch |
|---|---|---|---|
| Día LDOPS (3 días/semana) | 0h | 8h | 1h |
| Día mixto (2 días/semana) | 5h | 3h | 1h |

### Senior Managers
| Actividad | Horas | Notas |
|---|---|---|
| AOR | 2 días fijos: **Lunes y Martes** | Preparación y lanzamiento de semana |
| Floor + AOR | Resto de días | Distribución normal |

### DD (Daily Download)
| Parámetro | Valor |
|---|---|
| Hora | 09:15–09:30 |
| Duración | 15 minutos |
| Asisten | Todos los que estén en turno a las 09:15 |
| Turno tarde (13:00+) | NO tienen DD |

---

## 🔄 6. Reglas de Rotación

### Senior Managers
- **Lunes y Martes**: los 4 SM van de **mañana** (sin excepción)
- **Miércoles a Sábado**: 2 SM mañana + 2 SM tarde (rotando)
- **Finde sí / finde no**: equidad total al final del Q
- **Evitar librar Lun–Mié**
- **AOR**: Lunes y Martes (2 días fijos)

### Managers
- **Semana completa en el mismo turno** (mañana o tarde toda la semana)
- **Balance 50/50** medido por Q completo (total semanas mañana ≈ total semanas tarde)
- **Mix departamental**: no todos los managers del mismo departamento en el mismo turno
  - Departamentos: Shopping+Business, People, Support, Ops & T@A
- **1 día AOR por semana** (salvo Javi Sánchez: Lun + Vie)
- **1 AOR extra entre W1-W3** de cada Q (preparación calibración)
- **Finde sí / finde no**: equidad total al final del Q
- **Evitar librar Martes y Miércoles** (reuniones). Pueden librar **Lunes**

### Ops Leads (Aurora, Rubén)
- **Siempre cruzados**: si uno mañana, el otro tarde
- **Mañana = Open (7:00)**, Tarde = Close (22:00 verano / 21:30 invierno)
- **3 días LDOPS completos** (sin floor) + 2 días mixtos (5h floor + 3h LDOPS)
- Los días LDOPS pueden variar, pero **idealmente no se crucen** para cobertura de área
- Si uno de **vacaciones**, el otro va de **mañana**
- **Nunca coinciden** en el mismo turno (uno mañana, otro tarde)

### Lead Genius (Eva H, Eva F, Alberto)
- **Eva Hernandez**: siempre mañana (inquebrantable), finde sí/no
- **Eva Famoso y Alberto Ortiz**: rotan mañana/tarde con equidad entre ellos

### Lead Shopping (Eli, Clara, nuevo)
- **Eli Moreno**: siempre mañana (inquebrantable), finde sí/no
- **Clara González y nuevo lead**: rotan mañana/tarde con equidad entre ellos
- **Clara**: no libra jueves (horas sindicales 9-13)

---

## 📅 7. Libranzas

### Regla sagrada
> **Nunca se trabaja más de 5 días por semana. NUNCA.**

### Fines de semana
| Grupo | Regla |
|---|---|
| SM y Managers | Finde sí / finde no. Flexible: pueden trabajar 2 seguidos y librar 2. **Equidad total al final del Q** |
| Leads | Fines de semana asignados por PDF/acuerdo. **No más, no menos** |
| Eva H + Eli Moreno | Finde sí / finde no **garantizado** (concreción) |

### Días libres entre semana
- Si trabajan sábado → libran otro día entre semana (días libres separados OK)
- Cuando abran domingos → días libres deben ser **juntos/consecutivos**
- SM: evitar librar Lun–Mié
- Managers: evitar librar Mar–Mié, pueden librar Lunes
- **Siempre 2 días libres por semana**
- Festivos devueltos (14 al año) los gestiona Diego manualmente

### Leads — fines de semana asignados (CSV)
Los fines de semana de trabajo de cada lead están definidos en un CSV aparte. El `1` significa que **libra** ese fin de semana (sábado + domingo). Los datos se importan al módulo de vacaciones.

---

## 📅 8. Reuniones Semanales

### Martes — Reunión Comercial (14:00–16:00)
- Acuden: **todos los Managers y Leads** excepto:
  - 2 Managers Support en floor
  - 1 Lead en floor (puede ser cualquiera)
- **Coach suspendido** durante la reunión
- 2h cuentan como: AOR (Managers) / LDOPS (Leads)

### Miércoles — Leadership Meeting (14:00–16:00)
- Acuden: **solo Managers** (no Leads)
- **1 Manager se queda en floor** (no va a reunión) — para claves y operaciones
- 3+ Leads cubren floor
- **Coach suspendido** durante la reunión
- 2h cuentan como: AOR (Managers)

---

## 🎯 9. Prioridades del Motor (cuando hay conflictos)

1. 🔴 **Cobertura mínima de floor** → SIEMPRE se cumple
2. 🔴 **Concreciones personales** → Inquebrantables
3. 🔴 **Vacaciones aprobadas** → Inamovibles
4. 🔴 **Máximo 5 días trabajo** → Sagrado
5. 🟠 **Equidad de rotación** → Se ajusta
6. 🟡 **Preferencias** (AOR junto, franjas tranquilas) → Nice to have

---

## 📅 10. Fechas Clave

### Q actual (Q2 FY26)
- **W1**: Lunes 30 de marzo 2026
- Año fiscal Apple comienza esta semana

### Q3 FY26
- **QBR**: Miércoles 1 de julio 2026 — **todos** leads y managers disponibles, nadie libra

### Periodos especiales (del calendario de vacaciones)
- **PEAK** (marcado en amarillo): vacaciones restringidas/avisadas
- **Semana Santa**, **Pre/Post Semana Santa**
- **Puente de Mayo**, **Segunda Pascua (25 mayo)**
- **24 de Junio** (San Juan — festivo local)
- **APR** (Apple Product Release)
- **NPI** / **Preparación NPI**
- **PEAK fin de año** (nov-dic)

---

## 📤 11. Output del Planificador

- **Formato**: tabla persona × día con tipo de turno (Early, Close, OFF, V, etc.)
- **Similar al Numbers actual** que usa el equipo
- **Editable manualmente** después de generar (drag & drop / click)
- **2-3 variantes** para elegir la mejor
- **Exportar** a CSV/Excel
- **Validación en tiempo real** al editar

---

## 📊 12. Equidad Semanal de Roles (Manager)

- Cada Manager debería hacer ~2-3 días de **Coach** y ~2-3 días de **Support** por semana
- Dentro de la misma semana un Manager puede ser Coach un día y Support al siguiente
- **Regla crítica**: un Manager es Coach O Support **TODO EL DÍA**, nunca mezcla en el mismo día

---

## 🏗️ 13. Departamentos (para mix de turnos)

### Shopping + Business (azul)
- **SM**: Jorge Gil
- **Managers**: Jesús Pazos, Pedro Borlido, Julie Robin, Javi Sánchez, *(vacante)*

### People (morado)
- **SM**: Sheila Yubero
- **Managers**: Meri Alvarez, Toni Medina

### Support (amarillo)
- **SM**: Itziar Cacho
- **Managers**: Deborah Ibañez, Ane Pazos, Ricardo Sosa, Javi Quiros

### Ops & T@A (rojo)
- **SM**: Cris Carcel
- **Managers**: Cris Usón, Javi Canfranc, David Carrillo

### Ops Leads
- Aurora Comesaña, Rubén Martínez

### Lead Genius
- Eva Famoso, Eva Hernandez, Alberto Ortiz

### Lead Shopping
- Clara González, Eli Moreno, *(nuevo lead)*

---

## 📝 14. Pendientes (por confirmar)

- [ ] Calendario de aperturas de domingos y festivos
- [ ] Nombre del nuevo lead de Shopping
- [ ] Calendario de aperturas especiales (domingos verano/invierno)
- [ ] Festivos nacionales/locales 2026 con horario especial

---

*Este documento es la fuente de verdad para el motor de generación. Cualquier cambio en las reglas debe reflejarse aquí antes de implementarse.*