# GymBro — Wireframes ASCII

**Estado:** Cerrado (v1) — bocetos de flujo, no UI final  
**Objetivo:** alinear pantallas con CU sin diseño visual.

Leyenda: `[ ]` input · `(btn)` botón · `{lista}` colección

---

## 1. App afiliado — Home

```text
+----------------------------------+
| GymBro / {NombreGym}             |
| Hola, {Nombre}                   |
+----------------------------------+
| Estado cuenta                    |
| Pack: {nombre}  vence: {fecha}   |
| Creditos: {n}                    |
| Deuda: {monto|al dia}            |
+----------------------------------+
| (Reservar)  (Mi QR)  (Rutinas)   |
| (Pagar)     (Avisos)             |
+----------------------------------+
```

---

## 2. App afiliado — hubs (nav)

```text
Nav: Inicio | Acceso | Ajustes

Inicio
+----------------------------------+
| Hola, {nombre}                   |
| [ pack · créditos · libre ]      |
| (Sesiones)  (Tienda)             |
+----------------------------------+

Acceso → Escanear (default) | Credenciales
+----------------------------------+
| Escanear: cámara a pantalla      |
| Credenciales:                    |
|  [ pendientes de aceptación ]    |
|    (máx ½ pantalla, scroll)      |
|  [ cards VC en el celular ]      |
+----------------------------------+

Ajustes → cuenta · wallet SSI (reiniciar) · tema · API · salir
```

Credenciales: expandir card → Eliminar (confirmación). Ajustes: Reiniciar wallet / Cerrar sesión usan el mismo diálogo de confirmación.

---

## 3. App afiliado — Calendario de sesiones

```text
+----------------------------------+
| Sesiones          < Jul >        |
| Lun 13  08:00 GAP     cupo 3/15  |
|         (Reservar)               |
| Lun 13  19:00 Pilates  LLENO     |
|         (Lista espera)           |
| Mar 14  08:00 GAP     cupo 10/15 |
+----------------------------------+
```

---

## 4. App afiliado — Confirmar reserva / pago

```text
+----------------------------------+
| Reservar: GAP Lun 08:00          |
| Cobertura:                       |
| (*) Usar 1 credito (restan 7)    |
| ( ) Drop-in $ {precio}           |
|                                  |
| Pago: (Mercado Pago) (Avisar     |
|        caja en gym)              |
|                                  |
| (Cancelar)            (Confirmar)|
+----------------------------------+
```

---

## 5. App afiliado — Rutina del día

```text
+----------------------------------+
| Rutina: Fuerza 3 dias            |
| Dia 2/3                          |
|----------------------------------|
| [x] Squats  4x8   descanso 90s   |
| [ ] Banca   4x8                  |
| Tiempo sesion: [ 42:10 ]         |
|                                  |
| (Guardar progreso)               |
+----------------------------------+
```

---

## 6. App afiliado — Avisos + preferencias

```text
+----------------------------------+
| Avisos                    (Conf) |
| * Pago aprobado  $...            |
| * Reserva confirmada GAP...      |
|   Cuota por vencer               |
+----------------------------------+
| Conf: [x] E1 [x] E2 [ ] E7 ...   |
+----------------------------------+
```

---

## 7. Web Admin — Dashboard mínimo

```text
+----------------------------------------------------------------+
| {NombreGym}  Admin                    (Staff) (Caja) (Salir)   |
+----------------------------------------------------------------+
| Hoy: ingresos $.. | activos .. | deuda .. | ingresos puerta .. |
+----------------------------------------------------------------+
| Afiliados | Servicios | Packs | Sesiones | Pagos | Rutinas     |
| Roles     | Config    | Avisos| Reportes                       |
+----------------------------------------------------------------+
```

---

## 8. Web Admin — Servicios / Packs

```text
+----------------------------------------------------------------+
| Packs                                        (+ Nuevo pack)    |
|----------------------------------------------------------------|
| Nombre          | Tipo        | Precio  | Creditos | Activo    |
| Libre mensual   | libre       | 25000   | -        | si        |
| Libre+8 GAP     | mixto       | 40000   | 8 GAP    | si        |
| Pack 8 GAP      | creditos    | 20000   | 8        | si        |
+----------------------------------------------------------------+
| Editar pack                                                    |
| Componentes: [x] Acceso libre  [x] Creditos GAP [8]            |
| Vencimiento creditos: [ fin_de_mes v ]                         |
| Devolucion: (usar default gym)                                 |
|                                         (Guardar)              |
+----------------------------------------------------------------+
```

---

## 9. Web Admin — Sesión / recurrencia

```text
+----------------------------------------------------------------+
| Nueva sesion / recurrencia                                     |
| Servicio: [ GAP          v ]                                   |
| (*) Puntual  ( ) Recurrente                                    |
| Inicio: [2026-07-14] [08:00]  Cupo: [15]  Profe: [Ana v]     |
| Si recurrente: [L] [M] [X] [J] [V]  hasta [____]               |
|                              (Publicar)                        |
+----------------------------------------------------------------+
```

---

## 10. Web Admin — Caja del día

```text
+----------------------------------------------------------------+
| Caja 2026-07-13                              (+ Cobro)         |
|----------------------------------------------------------------|
| Hora  Afiliado     Concepto        Medio    Monto              |
| 10:02 Perez        Drop-in GAP     Efectivo 8000               |
| 11:15 Gomez        Pack mensual    Efectivo 40000              |
|----------------------------------------------------------------|
| Esperado efectivo: $48000                                      |
| Declarado: [________]   Diff: $..                              |
|                              (Cerrar arqueo)                   |
+----------------------------------------------------------------+
```

---

## 11. Web Admin — Cobro en caja

```text
+----------------------------------+
| Cobro en caja                    |
| Afiliado: [ buscar...      ]     |
| Concepto: [ Pack | Drop-in | ..] |
| Monto:    [ auto / edit ]        |
| Medio:    [ Efectivo | Mercado Pago ] |
| (link MP: abrir / copiar)            |
| Idempotency: (auto)              |
| (Cancelar)  (Cobrar / Generar link MP) |
+----------------------------------+
```

---

## 12. Tocámetro / acceso (gym escanea)

```text
+----------------------------------+
| Acceso puerta                    |
| Apunta al QR del afiliado        |
|                                  |
|     [  camara / scanner  ]       |
|                                  |
| RESULTADO: PERMITIDO             |
| Juan Perez - Libre OK            |
| (o DENEGADO: deuda > tolerancia) |
+----------------------------------+
```

---

## 13. Pase manual

```text
+----------------------------------+
| Pase manual                      |
| Afiliado: [ buscar ]             |
| Motivo:   [________________]     |
| Sesion:   [ (opc)        v ]     |
| (Registrar ingreso)              |
+----------------------------------+
```

---

## 14. Super Admin

```text
+----------------------------------------------------------------+
| GymBro Super Admin                                             |
| Tenants: (+ Crear)                                             |
| Nombre       Estado     Plan      Acciones                     |
| Fit Palermo  activo     default   (Suspender) (Impersonar)     |
| Studio Pil.  activo     default   ...                          |
+----------------------------------------------------------------+
```

---

## 15. Config gym (extracto)

```text
+----------------------------------------------------------------+
| Configuracion                                                  |
| Tolerancia dias: [15]                                          |
| Horas cancelacion reserva: [6]                                 |
| Lista espera: ( ) auto ( ) confirma afiliado (*) confirma staff|
| Multi-ingreso: [x] permitido                                   |
| Ingreso tardio sesiones: [x]                                   |
| Alcance profe alumnos: (*) todos  ( ) solo sus sesiones        |
| Adapter acceso: [ SSI Quark v ]  (Probar)                      |
| MP: [ Conectar cuenta ]                                        |
+----------------------------------------------------------------+
```

---

## Trazabilidad CU ↔ pantallas

| Pantalla | CU principales |
|----------|----------------|
| Home / cuenta | CU-AFI-005, CU-CON-001 |
| QR | CU-ACC-001, CU-AFI-006 |
| Calendario / reserva | CU-RES-001, CU-RES-004 |
| Rutina | CU-RUT-005/006 |
| Admin packs/sesiones | CU-SER-* |
| Caja | CU-PAG-002/003 |
| Puerta / pase | CU-ACC-001/004 |
| Super | CU-ROL-001/002 |
| Config | CU-ACC-006/007, CU-PAG-006 |

---

[Índice](./00-indice.md) · [Siguiente: Casos de prueba manuales →](./08-casos-prueba-manuales.md)
