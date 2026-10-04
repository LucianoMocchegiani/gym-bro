# Puerta

La **puerta** es el control de ingreso al establecimiento. Las reglas son las mismas con cualquier sistema: pack vigente, deuda dentro de la tolerancia, reserva si es una clase, y reglas del local (ingreso tardío, multi-ingreso por día). Si se deniega, el motivo tiene que ser legible.

Pantalla Admin: **Puerta** (`/dashboard/puerta`), pestañas **Verificar**, **Pase manual** e **Historial**. Qué sistema usa el local se elige en Config → Operación → **Puerta**.

El control de acceso es **opcional**: un local puede usar Faciliter sin puerta. Si la usa, elige una de dos formas: **Kuatia** (QR con la app) o **ZKTeco** (aparato).

**¿El socio necesita la app?** Solo con **Kuatia**: la credencial vive en la app del celular y con ella escanea el QR de la puerta. Con **ZKTeco** (huella, tarjeta o PIN) o **sin control de acceso**, la app no hace falta: el socio puede hacer todo desde el **portal web** del gym (`{slug}.faciliter.xyz/portal`: reservas, compras, historial, documentos y avisos). La app es una comodidad en el teléfono; si no la quiere descargar, está bien.

## Con QR (Kuatia, app Faciliter)

Verificar muestra un QR. El socio lo escanea desde App → **Acceso** → Escanear, con su credencial ya aceptada (Acceso → Credenciales), y el panel muestra **PERMITIDO** o **DENEGADO** con el motivo. Una tablet en la puerta con esa pantalla alcanza: quien atiende ve el resultado y deja pasar. No es una captura de pantalla: es la credencial en la app. No inventes un QR de un cliente real.

## Con ZKTeco (opcional)

Molinete o puerta con huella, tarjeta o PIN. El número de cada persona se vincula en Afiliados / Staff → **Acceso ZKTeco** (o se importa: topic `migracion`); sin vínculo, el aparato puede usar el DNI. **La instalación depende del modelo del aparato y se coordina con los técnicos de Faciliter** antes de activarlo en Config (topic `soporte`). Lo mismo si quieren que un molinete se destrabe solo con el QR. No prometas que funciona enchufando cualquier equipo.

## Pase manual e historial

**Pase manual:** el personal con permiso deja pasar a alguien que la regla no dejaría (deuda, olvidó el celular, cortesía), con un motivo. Queda en el historial.

**Historial:** cada intento con resultado, quién, motivo, canal (QR, ZKTeco o manual) y hora.

El asistente puede **previsualizar** si alguien entraría hoy, **sin** dejar historial. No abre la puerta ni da pases.

Hace falta permiso de verificación de acceso.
