# 📋 Especificación Real de Patrones — Reglas del "Mundo Real"

> **Documento complementario a SPECS_13W.md** con las reglas REALES de cómo se hacen los patrones día a día, basadas en la experiencia de Diego haciendo horarios a mano.
> Última actualización: 2026-04-05

---

## 🕐 1. Distribución Real de Entradas por Día (Entre Semana)

La distribución típica de entradas es:

| Hora entrada | Personas | Quién típicamente |
|---|---|---|
| 07:00 | 2 | 2 Leads (Ops Leads preferentemente) |
| 08:00 | 2 | 2 Managers o SM |
| 09:00 | 0-1 | Flexible |
| 10:00 | 2 | Managers o SM |
| 11:00 | 2 | Managers (tarde) |
| 12:30 | 3 | Managers + Leads (tarde) |
| 13:00 | 3 | Managers + Leads (tarde) |

**Total típico**: ~14 personas entre semana

### Clasificación mañana/tarde simplificada:
- **Mañana**: cualquier entrada antes de las 11:00 (7:00, 8:00, 9:00, 10:00)
- **Tarde**: cualquier entrada a partir de las 11:00 (11:00, 12:30, 13:00)

### Sábado:
- **6 personas de mañana + 6 de tarde** = 12 total
- Buen equilibrio entre ambos turnos

---

## 📊 2. Cobertura Real de Floor (del ejemplo real validado por Diego)

### Cobertura por franja horaria (Verano — tienda cierra 21:30):

| Franja | LDSup (Leads) | LDOPS | Coach | MGR Support | AOR | Lunch | Total Floor (Sup+Coach) | Mgrs en Floor |
|---|---|---|---|---|---|---|---|---|
| 07:00-07:30 | — | 2 | — | — | — | — | — | — |
| 07:30-08:00 | — | 2 | — | — | — | — | — | — |
| 08:00-08:30 | — | 2 | — | — | 2 | — | — | 2 |
| 08:30-09:00 | — | 2 | — | — | 2 | — | — | 2 |
| 09:00-09:15 | — | 2 | — | — | 3 | — | — | — |
| 09:15-09:30 | — | — | — | — | — | — | — | — |
| **09:30** | **2** | — | **1** | **1** | **1** | — | **4** | **2** |
| 10:00 | 2 | — | 1 | 1 | 3 | — | 4 | 2 |
| 10:30 | 2 | — | 1 | 1 | 3 | — | 4 | 2 |
| 11:00 | 1 | — | 1 | 2 | 2 | 1 | 4 | 3 |
| 11:30 | — | — | **2** | **2** | 2 | 1 | **4** | 4 |
| 12:00 | 1 | — | 2 | 2 | 2 | — | **5** | 4 |
| 12:30 | 2 | — | 2 | 2 | 2 | — | **6** | 4 |
| 13:00 | 2 | 2 | 2 | 2 | 4 | — | **6** | 4 |
| 13:30 | 2 | 2 | 2 | 2 | 4 | — | **6** | 4 |
| 14:00 | 2 | 2 | 2 | 2 | 4 | — | **6** | 4 |
| 14:30 | 2 | 2 | 2 | 1 | 6 | — | **5** | 3 |
| 15:00 | 2 | — | 1 | 2 | 5 | 3 | **5** | 3 |
| 15:30 | 2 | — | 2 | 2 | 4 | 4 | **5** | 4 |
| 16:00 | 1 | — | 2 | 2 | 4 | 3 | **5** | 4 |
| 16:30 | 2 | — | 1 | 1 | 6 | 2 | **4** | 2 |
| 17:00 | 2 | — | 2 | 2 | 5 | 1 | **6** | 4 |
| 17:30 | 2 | — | 2 | 2 | 4 | 3 | **6** | 4 |
| 18:00 | 2 | — | 2 | 2 | 4 | 3 | **6** | 4 |
| 18:30 | 2 | — | 2 | 2 | 4 | 1 | **6** | 4 |
| 19:00 | 2 | — | 2 | 2 | 4 | — | **6** | 4 |
| 19:30 | 2 | — | 2 | 2 | 4 | — | **6** | 4 |
| 20:00 | 2 | — | 2 | 2 | 4 | — | **6** | 4 |
| 20:30 | 2 | 1 | 2 | 2 | — | — | **6** | 4 |
| 21:00 | 2 | — | 2 | 2 | — | — | **4** | 4 |
| 21:30 | 1 | 2 | — | — | — | — | — | — |
| 22:00 | — | — | — | — | — | — | — | — |

### Resumen de coberturas reales (flexibilizadas):

| Parámetro | Valor REAL | Nota |
|---|---|---|
| Mín floor apertura (9:30) | 3-4 personas (2 Support + 1-2 Coach) | Puede ser solo 1 Coach |
| Mín floor medio día | 6 personas | 4 Support + 2 Coach |
| Mín floor transición/lunch | 4-5 personas | OK temporalmente |
| Coach mínimo | **1 en momentos de transición** | No siempre 2 |
| Coach ideal | 2 | En horas de máxima afluencia |
| Floor después de 21:30 | **0** | Tienda cerrada, no se necesita floor |
| DD (Daily Download) | 09:15-09:30 | 5 personas asisten (los de mañana) |

---

## 🏗️ 3. Patrones de Actividad por Rol (Ejemplo Real de un Día)

### Leads de mañana (07:00-16:00) — 2 personas
```
07:00-09:15  → LDOPS (2h15)
09:15-09:30  → DD
09:30-11:00  → LDSup (floor) (1h30)
11:00-11:30  → Lunch
11:30-16:00  → LDSup (floor) (4h30)
--- ó ---
09:30-11:00  → LDSup (floor)
11:00-12:00  → Lunch
12:00-16:00  → LDSup (floor)
16:00        → LDOPS (restante)
```
**Resultado: 5h LDSup + 3h LDOPS**

### Leads de tarde (13:00-22:00) — 2 personas
```
13:00-16:30  → LDOPS (3h30)
16:30-17:00  → (transición)
17:00-22:00  → LDSup (floor) (5h)
--- ó ---
13:00-15:00  → LDOPS
15:00-15:30  → Lunch
15:30-16:30  → LDOPS
16:30-17:00  → LDSup (floor)
17:00-22:00  → LDSup (floor)
```
**Resultado: 5h LDSup + 3h LDOPS**

### Ops Leads — Día LDOPS completo (3 días/semana)
```
07:00-16:00 → LDOPS todo el día (8h + 1h lunch)
ó
13:00-22:00 → LDOPS todo el día (8h + 1h lunch)
```
**Resultado: 0h floor + 8h LDOPS**

### Ops Leads — Día mixto (2 días/semana)
```
Igual que un Lead normal: 5h LDSup + 3h LDOPS
```

### Manager de mañana (08:00-17:00) — Coach
```
08:00-08:30  → AOR
08:30-09:00  → AOR
09:00-09:15  → AOR
09:15-09:30  → DD
09:30-12:30  → Coach (floor) (3h)
12:30-13:30  → Lunch
13:30-14:30  → Coach (floor) (1h)
14:30-17:00  → AOR (2h30)
```
**Resultado: 4h Coach + 4h AOR**

### Manager de mañana (08:00-17:00) — Support
```
08:00-09:00  → AOR
09:15-09:30  → DD
09:30-13:30  → Support (floor) (4h)
13:30-14:30  → Lunch
14:30-17:00  → AOR (2h30)
```
**Resultado: 4h Support + 4h AOR**

### Manager 10:00-19:00 — Support
```
10:00-10:30  → AOR
10:30-11:00  → AOR
11:00-14:00  → Support (floor) (3h)
14:00-15:00  → Lunch
15:00-16:00  → Support (floor) (1h)
16:00-19:00  → AOR (3h)
```
**Resultado: 4h Support + 4h AOR**

### Manager de tarde (13:00-22:00) — Coach
```
13:00-16:00  → AOR (3h)
16:00-16:30  → AOR
16:30-17:30  → Lunch
17:30-21:30  → Coach (floor) (4h)
21:30-22:00  → (cierre, no floor)
```
**Resultado: 4h Coach + 4h AOR**

### Manager de tarde (13:00-22:00) — Support
```
13:00-15:00  → AOR (2h)
15:00-15:30  → AOR
15:30-17:00  → Support (floor) (1h30)
17:00-18:00  → Lunch
18:00-21:30  → Support (floor) (3h30)
21:30-22:00  → (cierre)
```
**Resultado: 4h Support + 4h AOR** (puede haber variación menor)

---

## 🔑 4. Reglas Flexibilizadas (Mundo Real vs Mundo Ideal)

| Regla | Ideal (SPECS_13W) | Real | Cuándo flexibilizar |
|---|---|---|---|
| Mín 2 Coach en floor | Siempre 2 | **1 Coach OK** en transición o baja afluencia | Apertura, lunch, después de 17h si hay 4 Support |
| Mín 4 Support en floor | Siempre 4 | **2-3 Support OK** en apertura (9:30-11:00) | Primeras horas cuando hay poca afluencia |
| Floor mín 6 personas | Siempre 6 | **3-4 OK** en apertura, **4-5 OK** en transición | Franja 9:30-11:00 y momentos de lunch |
| AOR siempre en bloque | 2 bloques seguidos | **Puede romperse** en 3 o más bloques si tiene lógica | Cuando la cobertura lo requiere |
| Cobertura 21:30-22:00 | Necesaria | **No necesaria** — tienda cerrada, solo cierre | Siempre — no contar esta franja para floor |
| Mix departamental | Estricto | **Flexible** — lo más difícil de cuadrar, no ser exigente | Cuando no es posible mantener cobertura y mix a la vez |
| Mín 14 personas/día | Siempre 14 | **12 funciona** quitando horas AOR/LDOPS | Bajas o imprevistos |

---

## 📋 5. Proceso Real de Creación del Horario (Orden de Diego)

### Paso 1: Esqueleto
1. Marcar **vacaciones** aprobadas
2. Marcar **fines de semana** (quién trabaja, quién libra)
3. Marcar **peticiones** personales
4. Asegurar **concreciones** (Eva H mañana, Eli mañana, Cris Carcel mañana L-V, Meri horarios fijos, Ane semana A/B, Clara jueves, Jorge L+Mié)

### Paso 2: Senior Managers
5. Colocar SM: L+M todos mañana, rotar Mié-Sáb
6. Verificar equidad semanal mañana/tarde

### Paso 3: Leads
7. Colocar **Ops Leads** cruzados (Open/Close)
8. Asegurar **2 Leads apertura** (7:00) y **2 Leads cierre**
9. Rotar Lead Genius y Lead Shopping

### Paso 4: Managers
10. Rellenar huecos con Managers
11. Asignar semana completa mañana o tarde
12. Verificar mix departamental (no ser muy estricto)

### Paso 5: Revisión
13. Verificar **equidad**: todos tengan mismas semanas tarde/mañana
14. Verificar **equidad fines de semana**: mismo número al final del Q
15. Identificar días con mucha cobertura para facilitar **recuperaciones de festivo**

---

## 📊 6. Ejemplo Real — Semana Completa (29 jun - 5 jul 2026)

### Datos de la semana real (del sistema Schedule):

| Nombre | Rol | Dept | Lunes | Martes | Miércoles | Jueves | Viernes | Sábado | Domingo |
|---|---|---|---|---|---|---|---|---|---|
| David (ISE) | Lead | — | Open | Open | Off | Open | Open | Open | Off |
| Clara González | Lead | — | Open | Open | Open | Off | Open | Open | Off |
| Eli Moreno | Lead | — | Holidays | Holidays | Holidays | Holidays | Holidays | Off | Off |
| Eva Famoso | Lead Genius | — | Close | Off | Close | Close | Close | Close | Off |
| Eva Hernandez | Lead Genius | — | — | — | — | — | — | — | — |
| Alberto Ortiz | Lead Genius | — | — | — | — | — | — | — | — |
| Aurora Comesaña | Ops Lead | — | Holidays | Holidays | Holidays | Holidays | Holidays | Off | Off |
| Rubén Martínez | Ops Lead | Product Zone | Close | Close | Close | Off | Close | Close | Off |
| Meri Alvarez | Manager | People | Off | Mid S | Open | Early S | Open | Mid S | Off |
| Pedro Borlido | Manager | Oficina | Close C1 | Late | Late | Close C2 | Off | Mid | Off |
| Javi Canfranc | Manager | Genius Bar | Holidays | Holidays | Holidays | Holidays | Holidays | Off | Off |
| David Carrillo | Manager | — | Late | Close C1 | Close C2 | Late | Late | Off | Off |
| Deborah Ibañez | Manager | Oficina | Early C2 | Early S | Off | Open | Early S | Early C1 | Off |
| Julie Robin | Manager | Product Zone | Mid S | Mid S | Mid S | Mid S | Off | Mid S | Off |
| Toni Medina | Manager | Oficina | Holidays | Holidays | Holidays | Holidays | Holidays | Off | Off |
| Jesús Pazos | Manager | Product Zone | Early S | Early C1 | Early S | Off | Early S | Early C2 | Off |
| Ane Pazos | Manager | — | Off | Close C2 | Close C1 | Late | Late | Late | Off |
| Javi Quiros | Manager | Genius Bar | Mid S | Mid S | Mid S | Mid S | Mid | Off | Off |
| Javi Sánchez | Manager | — | Late | Late | Late | Close C1 | Close C2 | Off | Off |
| Ricardo Sosa | Manager | Product Zone | Early S | Early C2 | Early C1 | Early C2 | Early S | Off | Off |
| Cris Usón | Manager | Operations | Mid S | Mid S | Mid S | Mid S | Mid S | Off | Off |
| Itziar Cacho | SM | Product Zone | Early S | Early S | Early C2 | Early C1 | Early S | Off | Off |
| Cristina Carcel | SM | People | Early C1 | Mid | Off | Mid | Early C2 | Close C1 | Off |
| Jorge Gil | SM | Oficina | Mid | Mid S | Mid | Off | Late | Close C2 | Off |
| Sheila Yubero | SM | Genius Bar | Close C2 | Late | Late | Late | Close C1 | Off | Off |
| Jordi Pajares | SL | — | Own | Own | Own | Own | Own | Off | Off |
| Diego Rivero | SL | — | Own | Own | Own | Own | Own | Off | Off |

### Métricas de esta semana:
| Día | Total AM | Total PM | Scheduled Total |
|---|---|---|---|
| Lunes | 11 | 6 | 9 (scheduled) |
| Martes | 12 | 6 | 9 |
| Miércoles | 9 | 7 | 10 |
| Jueves | 9 | 6 | 8 |
| Viernes | 10 | 7 | 11 |
| Sábado | 7 | 5 | 6 |
| Domingo | 0 | 0 | 0 |

### Tracking trimestral (% de turnos por persona):
Las columnas Earlies/Mids/Lates/Sat muestran el porcentaje de cada tipo de turno en el Q, para verificar equidad.

---

## 🎯 7. Claves para el Motor de Generación

1. **No ser demasiado estricto** con coberturas — los mínimos son orientativos, no absolutos
2. **1 Coach es suficiente** en muchos momentos — no forzar siempre 2
3. **Apertura con 3-4 personas en floor está bien** — no necesitas 6 a las 9:30
4. **Después de 21:30 no hay floor** — solo personal de cierre
5. **AOR puede fragmentarse** si la cobertura lo requiere
6. **Mix departamental es "nice to have"** — no bloquear la generación por esto
7. **El motor debe dar un 85-90% bueno** — el usuario ajusta el 10-15% restante
8. **Priorizar que el horario SE GENERE** sobre que sea perfecto
9. **Los Managers pueden hacer CUALQUIER turno** incluido Open a las 7 si no hay Lead

---

*Este documento complementa SPECS_13W.md y refleja cómo se hacen realmente los horarios en la práctica.*