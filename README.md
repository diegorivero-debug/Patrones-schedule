# Patrones de Schedule - Cobertura de Tienda

## Resumen

Patrones de schedule optimizados para asegurar la cobertura minima de la tienda con Managers y Leads.

### Horarios
- **Apertura tienda:** 09:30 - 21:30
- **Primer Lead entra:** 07:00 | **Ultimo sale:** 22:00
- **Primer Manager entra:** 08:00 | **Ultimo sale:** 22:00
- **Turnos:** 9 horas (8h trabajo + 1h lunch)

### Roles
| Rol | Floor | Gestion | Lunch | Total |
|---|---|---|---|---|
| **Manager (L-V)** | 4h (Coach o Support) | 4h AOR | 1h | 9h |
| **Lead (L-V)** | 5h (Support) | 3h LDOPS | 1h | 9h |
| **Manager (Sabado)** | 6h (Coach o Support) | 2h AOR | 1h | 9h |
| **Lead (Sabado)** | 6h (Support) | 2h LDOPS | 1h | 9h |

### Cobertura minima en floor
| Franja | Support | Coach | Total Floor |
|---|---|---|---|
| **Normal/Pico** | 4 | 2 | 6 |
| **Lunch/transicion** | 3 | 1 | 4 |

- Minimo 2 Managers en floor simultaneamente siempre
- Horas pico: 12:00-14:00 y 17:00-21:00

---

## Patrones

### 1. Dia Normal (Lunes, Jueves, Viernes)
- **Archivo:** `patron_dia_normal.csv`
- **Personal:** 4 Leads + 9 Managers = **13 personas**

### 2. Martes - Commercial Meeting (14:00-16:00)
- **Archivo:** `patron_martes_commercial.csv`
- **Personal:** 4 Leads + 9 Managers = **13 personas**
- Acuden todos los Managers y Leads excepto 2 Mgr Support + 1 Lead en floor
- Coach suspendido durante reunion
- 2h reunion cuentan como AOR/LDOPS

### 3. Miercoles - Leadership Meeting (14:00-16:00)
- **Archivo:** `patron_miercoles_leadership.csv`
- **Personal:** 5 Leads + 9 Managers = **14 personas**
- Solo acuden Managers
- 3 Leads cubren Support en floor
- Coach suspendido durante reunion
- 1 Lead extra necesario

### 4. Sabado
- **Archivo:** `patron_sabado.csv`
- **Personal:** 4 Leads + 7 Managers = **11 personas**
- 6h floor + 2h AOR/LDOPS por persona

---

## Resumen semanal de staffing

| Dia | Leads | Managers | Total |
|---|---|---|---|
| Lunes | 4 | 9 | 13 |
| Martes | 4 | 9 | 13 |
| Miercoles | 5 | 9 | 14 |
| Jueves | 4 | 9 | 13 |
| Viernes | 4 | 9 | 13 |
| Sabado | 4 | 7 | 11 |
| **TOTAL semanal** | **25** | **52** | **77** |

---

## Reglas adicionales
- **DD (Daily Download):** 15 min, solo turno manana (09:15-09:30)
- **Lunch:** 1h, entre 11:00-16:00, escalonado (quien entra primero come primero)
- **Bloques de floor preferidos:** horas seguidas (minimo 2h bloques)
- **Bloques AOR/LDOPS preferidos:** seguidos o divididos maximo en 2 bloques
- **Martes meeting:** Coach suspendido 14-16h. 2 Mgr Support + 1 Lead cubren floor
- **Miercoles meeting:** Coach suspendido 14-16h. 3+ Leads cubren floor. Todos Mgrs en reunion