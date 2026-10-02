# Backlog — Acceso / QR / SSI

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Modo offline en la puerta | Pendiente | MVP online. Nota local identidad: “offline” |
| Molinetes / hardware de terceros | Prioridad cierre (P1) — contrato hecho | Hecho: sistema de puerta por gym, contrato (evaluate único + puertos emisión/apertura), ZKTeco simulado (`POST /access/zkteco/events`), vínculos número → socio/staff (RN-ACC-010/011). Falta: relé/agente real y puente ZKTeco. [06 §6.5](../06-arquitectura.md) · [18](../18-prioridades-cierre-mvp.md) · [19](../19-puerta-molinete-hw-sw.md) |
| QR para ZKTeco en la app | Pendiente | En gym ZKTeco la app no emite credenciales; evaluar mostrar un QR/código que lea el aparato |
| Token de dispositivo para el puente de puerta | Pendiente | Hoy el puente usa JWT de staff con `access.verify` |
| Actuador real (relé / agente / puerta ZKTeco) | Pendiente | Hoy `LogDoorActuatorAdapter` solo registra; ver [19](../19-puerta-molinete-hw-sw.md) |
| Varios sistemas de puerta por gym (gym pass) | Pendiente | Hoy uno por gym; gym pass necesita Kuatia en todos |
| Huella ZKTeco | Pendiente | Bridge PC + SDK fuera de `api/`; el vínculo por número ya sirve |
| Reordenar adapters de puerta | Pendiente | Mover `access/access-oid4vp.*` → `access-providers/kuatia/` y `access/access-zkteco.*` + vínculos → `access-providers/zkteco/`; `access/` queda sin proveedor concreto. `kuatia/` sigue aparte (emisión, bandeja app, gym pass). Hacerlo al sumar un segundo sistema real o el puente de hardware |
| Biometría (candado app / puerta) | Pendiente | Wallet: biometría opcional para desbloquear secreto local |
| Anti-fraude avanzado (préstamo de QR) | Pendiente | |
| Adapter Kuatia — deudas | Pendiente | Offers/VP/packs siguen. Pendiente: alinear mobile URLs públicas, push E8, reingreso. [12-acceso…](../12-acceso-quark-oid4-diseno.md) · [15-kuatia…](../15-kuatia-deuda-rename.md) |
| Segundo modo de escaneo (gym escanea afiliado) | Pendiente | Hoy: afiliado escanea venue (`/puerta`) |
| Fichaje horario staff (entrada/salida laboral) | Pendiente | Thin: VC staff + molinete (`ok_staff`) |
| Wallet / app Flutter perfil staff | Pendiente | Thin: Admin emite URI; aceptación en wallet de prueba |
| Estilos de credenciales en la app | Pendiente | Nota local identidad: “estilos en las credenciales” |

[Índice post-MVP](../99-backlog-post-mvp.md)
