# Puerta

La **puerta** controla el ingreso según pack vigente, deuda dentro de la tolerancia, reserva si es una clase y reglas del local. Pantalla Admin: **Puerta** (`/dashboard/puerta`), con **Verificar**, **Pase manual** e **Historial**. La modalidad se elige en Config → Operación → **Puerta**.

El control de acceso es opcional. Se puede usar **Kuatia Wallet web** o **ZKTeco**; sin control, el afiliado usa el portal normalmente.

## Kuatia Wallet web

Verificar muestra un QR de presentación. El afiliado lo escanea con la cámara del teléfono; el QR abre Kuatia Wallet web. También se puede copiar y compartir el enlace. En Wallet, el afiliado presenta su credencial Kuatia aceptada y el panel muestra **PERMITIDO** o **DENEGADO** con el motivo. Una tablet en la puerta con la pantalla Verificar abierta alcanza: quien atiende ve el resultado y deja pasar. No es una captura de pantalla ni un QR de credencial inventado.

La emisión/aceptación de la credencial se realiza desde **Mi portal → Acceso** y Kuatia Wallet. No hace falta la app GymBro para presentar el QR de puerta.

## ZKTeco (opcional)

Molinete o puerta con huella, tarjeta o PIN. El número de cada persona se vincula en Afiliados / Staff → **Acceso ZKTeco** (o se importa: topic `migracion`); sin vínculo, el aparato puede usar el DNI. **La instalación depende del modelo del aparato y se coordina con los técnicos de Faciliter** antes de activarlo en Config (topic `soporte`). No prometas que funciona enchufando cualquier equipo.

## Pase manual e historial

**Pase manual:** el personal con permiso deja pasar a alguien que la regla no dejaría (deuda, cortesía), con un motivo. Queda en el historial.

**Historial:** cada intento con resultado, quién, motivo, canal (Kuatia, ZKTeco o manual) y hora.

El asistente puede **previsualizar** si alguien entraría hoy, **sin** dejar historial. No abre la puerta ni da pases.

Hace falta permiso de verificación de acceso.
