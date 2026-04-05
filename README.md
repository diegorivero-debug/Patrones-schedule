# Patrones de Schedule - Cobertura de Tienda

## 🗂️ Páginas del Proyecto

| Página | Descripción |
|---|---|
| **`dashboard.html`** | Vista de patrones, planificador semanal, IA Advisor y gestión de equipo |
| **`auditor.html`** | 🔍 **Nuevo** — Importa archivos .xlsx/.csv de horarios, los audita automáticamente contra las reglas de negocio y propone mejoras concretas |
| **`equipo.html`** | Gestión del equipo: roster, vacaciones, peticiones, horarios y calendario |

### Auditor de Horarios (`auditor.html`)

El Auditor permite:
1. **Importar** archivos de horario en formato `.xlsx`, `.xls`, `.csv` o `.numbers` (exportado como xlsx)
2. **Visualizar** el horario importado con color-coding por tipo de turno (Early, Mid, Late, Close, Off, BH, TG, Holidays…)
3. **Auditar automáticamente** contra todas las reglas de negocio:
   - Cobertura mínima en floor por día (6 personas: 4 Support + 2 Coach)
   - Mínimo de Managers en floor (2 simultáneos)
   - Cobertura de apertura y cierre (mínimo 2 Leads + 1 Manager en cierre)
   - Reuniones especiales (Martes: Reunión Comercial · Miércoles: Leadership Meeting)
   - Horas contratadas vs programadas
   - Días de descanso (nadie puede trabajar 7 días seguidos)
   - Balance de turnos de mañana/tarde por Manager
4. **Proponer fixes concretos** para cada incidencia (Crítica 🔴 / Importante 🟠 / Sugerencia 🟡)
5. **Aceptar/Rechazar** fixes individualmente o aplicar todos los seguros de golpe
6. **Exportar** el horario auditado como CSV e informe de texto

---

## 🔴 REGLA DE ORO

**La cobertura mínima de floor NO es negociable.** Si no puede cuadrar los mínimos con el personal asignado, añadir más personas al turno (especialmente tarde). Nunca reducir la cobertura.

Prioridades del generador:
1. 🔴 Cobertura mínima de floor → SIEMPRE se cumple
2. 🟠 Equidad de roles, AOR, lunches → Se ajustan para lograr lo anterior
3. 🟡 Preferencias (AOR junto, franjas tranquilas) → Nice to have

---

## Resumen

Patrones de schedule optimizados para asegurar la cobertura mínima de la tienda con Managers y Leads.

### Horarios
- **Apertura tienda (L-V):** 09:30 - 21:30 (verano) / 09:30 - 21:00 (invierno)
- **Apertura tienda (Sabado):** 08:00 - 21:30 (verano) / 08:00 - 21:00 (invierno)
- **Primer Lead entra (L-V):** 07:00 | **Ultimo sale:** 22:00
- **Primer Lead/Mgr entra (Sabado):** 08:00 (NO hay turno de 07:00 el sabado)
- **Primer Manager entra (L-V):** 08:00 | **Ultimo sale:** 22:00
- **Turnos:** 9 horas (8h trabajo + 1h lunch)
- **Verano:** cierre 21:30, turno tarde 13:00-22:00
- **Invierno:** cierre 21:00, turno tarde 12:30-21:30 (empieza 30 min antes)

### Roles en floor
| Rol | Actividad de floor | Actividad de gestion |
|---|---|---|
| **Manager** | Coach o Support (NUNCA mezcla en el mismo dia) | AOR |
| **Lead** | LDSup (nunca Coach ni Support) | LDOPS |

### Horas por rol/dia
| Rol | Floor | Gestion | Lunch | Total |
|---|---|---|---|---|
| **Manager (L-V)** | 4h (Coach o Support) | 4h AOR | 1h | 9h |
| **Lead (L-V)** | 5h LDSup | 3h LDOPS | 1h | 9h |
| **Manager (Sabado)** | 6h (Coach o Support) | 2h AOR | 1h | 9h |
| **Lead (Sabado)** | 6h LDSup | 2h LDOPS | 1h | 9h |

### Equidad semanal de roles (Manager)
- Cada Manager deberia hacer ~2-3 dias de Coach y ~2-3 dias de Support por semana
- Dentro de la misma semana un Manager puede ser Coach un dia y Support al siguiente
- **Regla critica: un Manager es Coach O Support TODO EL DIA, nunca mezcla en el mismo dia**

### Cobertura mínima en floor
| Franja | Support | Coach | Total Floor |
|---|---|---|---|
| **Normal/Pico** | 4 | 2 | 6 |
| **Lunch/transicion** | 3 | 1 | 4 |

- **Mínimo 2 Coach simultaneos en floor en todo momento**
- Mínimo 2 Managers en floor simultaneamente siempre
- Horas pico: 12:00-14:00 y 17:00-21:00
- Franjas tranquilas (buen momento para AOR/Lunch): 09:30-11:00 y 15:00-16:00

### Apertura y cierre
- **Apertura (L-V):** Mínimo 2 personas a las 07:00 (idealmente 2 Leads). Hacen LDOPS hasta apertura tienda (09:30)
- **Apertura (Sabado):** Mínimo 2 personas a las 08:00
- **Pre-apertura:** LDOPS (Leads) o AOR (Managers) antes de la apertura de tienda
- **Cierre:** Mínimo 2 Leads + 1 Manager despues del cierre de tienda. Hacen AOR/LDOPS

---

## Patrones

### 1. Dia Normal (Lunes, Jueves, Viernes)
- **Archivo:** `patron_dia_normal.csv`
- **Personal:** 4 Leads + 10 Managers = **14 personas**

### 2. Martes - Commercial Meeting (14:00-16:00)
- **Archivo:** `patron_martes_commercial.csv`
- **Personal:** 4 Leads + 10 Managers = **14 personas**
- Acuden todos los Managers y Leads excepto **2 Mgr Support + 1 Lead en floor**
  - Puede ser **CUALQUIER Lead** (no un Lead especifico)
  - Los 2 Mgr Support tambien pueden ser cualquiera
- Coach suspendido durante reunion
- 2h reunion cuentan como AOR (Managers) / LDOPS (Leads)

### 3. Miercoles - Leadership Meeting (14:00-16:00)
- **Archivo:** `patron_miercoles_leadership.csv`
- **Personal:** 4 Leads + 10 Managers = **14 personas**
- Solo acuden **Managers** (no Leads)
- **1 Manager se queda en floor** (no va a reunion) — para poner claves y mantener operaciones
- 3+ Leads cubren floor
- Coach suspendido durante reunion

### 4. Sabado
- **Archivo:** `patron_sabado.csv`
- **Personal:** 4 Leads + 10 Managers = **14 personas** (mínimo 12: 3-4 Leads + 7-8 Managers)
- **Tienda abre a las 08:00** — NO hay turno de 07:00
- 6h floor + 2h AOR/LDOPS por persona

---

## Resumen semanal de staffing

| Dia | Leads | Managers | Total |
|---|---|---|---|
| Lunes | 4 | 10 | 14 |
| Martes | 4 | 10 | 14 |
| Miercoles | 4 | 10 | 14 |
| Jueves | 4 | 10 | 14 |
| Viernes | 4 | 10 | 14 |
| Sabado | 4 | 10 | 14 (min 12) |
| **TOTAL semanal** | **24** | **60** | **84** |

---

## Reglas adicionales

### Lunch
- **Ventana:** 11:00-17:00 (puede empezar hasta las 17:00 como máximo)
- **Duracion:** 1h (2 slots de 30 min)
- **Simultaneo:** OK si no viola cobertura mínima
- **Franjas optimas:** 15:00-16:00 (franja tranquila)

### DD (Daily Download)
- **Hora:** 09:15 (15 min)
- **Quien:** TODAS las personas que esten en turno a las 09:15
- **Turno tarde (13:00+):** NO tienen DD (no estan en turno a las 09:15)

### Bloques de actividad
- **Floor:** bloques mínimos de 2h seguidas
- **AOR/LDOPS:** idealmente en 1 bloque; aceptable partido en máximo 2 bloques si la cobertura lo requiere

### Rotacion de turnos (Manager)
- Los Managers suelen hacer una semana de manana y otra de tarde
- Esto es informativo, no requiere logica en el generador diario

### Actividades por zona
- **Floor:** LDSup (Leads), Coach (Mgr), Support (Mgr) — cuentan como cobertura
- **Oficina/back:** LDOPS (Leads), AOR (Mgr) — NO cuentan como cobertura de floor, pero disponibles para emergencias
