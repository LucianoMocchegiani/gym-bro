# Guía de uso — Faciliter Brain (web + app)

**Estado:** Publicada en `/docs` (se refina).  
**Sitio:** `web/content/docs/guia.md` + capturas en `web/public/docs/`.  
**Para quién:** dueño y staff del local. El socio no lee esto: lo vive en la app.  
**Fuera de esta guía:** Super Admin, rutinas, notificaciones, tienda de productos físicos, noticias del local.

Este archivo es el **playbook de capturas** (qué foto falta, dónde sacarla). El texto que ve el lector está en el sitio.

Convención de archivos (`docs/uso/imagenes/` → copiar a `web/public/docs/`):

- `web-….png` — panel Admin (desktop).
- `app-….png` — app del afiliado (celular).
- **Capturas reales**, no maquetas en CSS. El lector tiene que reconocer la pantalla. Si hace falta, después ponemos números o recuadros encima de la foto.
- Sin datos reales de socios. Enmascará tokens de Mercado Pago.
- Recortá la barra del navegador si molesta; no dejes overlays del editor (el “N” de Cursor, etc.).

En cada captura: **nombre de archivo**, **dónde sacarla**, **qué tiene que verse**.

---

## Mapa del sitio (cuando lo pasemos a `/docs`)

```text
Qué es
  01  Qué es Faciliter Brain
  02  Cómo funciona (web vs app)
  03  Casos de uso

Primeros pasos  ← el orden para arrancar un local
  04  Antes de empezar
  05  Configurar
  06  Servicios
  07  Packs
  08  Sesiones
  09  Personal
  10  Afiliados
  11  Cobrar (web y app)

Módulos (detalle, misma idea, más pantallas)
  Config · Servicios · Packs · Sesiones · Afiliados
  Staff y roles · Caja · Cierre · Reportes · Puerta · App · Asistente
```

Los primeros pasos **ya contrastan** qué ve el socio. Los módulos profundizan.

---

# Parte 1 — Qué es y cómo funciona

## 01. Qué es Faciliter Brain

Faciliter Brain es el sistema de **afiliaciones** del local: socios, lo que les vendés, cobros, clases y quién puede entrar. Sirve a gyms, clubes, estudios y cualquier negocio que trabaje con afiliados.

Hay **dos caras**, una sola operación:

| Cara | Quién | Dónde |
|------|--------|--------|
| **Panel (web)** | Dueño, recepción, profesores (staff) | `{tu-local}.faciliter.xyz` (en local: `{slug}.localhost:3002`) |
| **App** | El afiliado (socio) | App Faciliter en el celular |

El dinero que paga el socio va a **tu** Mercado Pago y queda registrado en **caja**. Faciliter no se queda con ese cobro. Si el pago se efectúa en efectivo, solo se registra en caja.

**Captura:** `web-inicio-dashboard.png` — lista (rehacer si queda el overlay del editor).  
**Dónde:** Admin → Inicio, ya logueado.  
**Qué se ve:** el Inicio del panel. A la izquierda, el menú por grupos (Operación, Personas, Catálogo). Al centro, el saludo y las tarjetas del día.

En esta pantalla el staff entra al **cerebro del local**. No es la app del socio: es el tablero de quien opera.

- La URL es `{tu-local}.faciliter.xyz` (en la captura: `gym-de-prueba.faciliter.xyz`).
- **Operación:** Inicio, Puerta, Caja, Cierre, solicitudes de devolución, Reportes.
- **Personas:** Afiliados, Staff, Roles y permisos.
- **Catálogo:** Servicios y Packs (más abajo, Sesiones y el resto del menú).
- Las tarjetas del día: afiliados activos, ingresos, accesos, socios sin pack, sesiones publicadas.
- La burbuja verde abajo a la derecha es el **asistente** (en el panel consulta datos del gym).

Los números pueden estar en cero: igual sirve para mostrar *dónde se trabaja*. Cuando el local tenga movimiento, las mismas tarjetas se llenan.

El socio **no ve** este tablero. En la app ve su pack, sus clases y el QR de acceso. Esa contrapantalla va en la captura `app-inicio-con-pack.png` (paso 02).

---

## 02. Cómo funciona (la misma operación, dos pantallas)

1. El local arma **servicios**: lo que ofrece. Pueden ser de **acceso libre** (entrar en el horario, sin reservar) y/o **por sesiones** (una clase o turno: pilates, funcional, etc.). El servicio todavía no es el cobro: es el catálogo.
2. Para cobrar hay **dos caminos**, no uno solo:
   - **Un pack.** Es la oferta que le vendés al socio. Un pack puede llevar **varios servicios a la vez**. Ejemplo: acceso libre mensual + pilates con **8 sesiones**. Otro pack puede ser solo la cuota de acceso, o solo un bloque de créditos. El cobro del pack es mensual o de una vez, según cómo lo armes.
   - **Una sesión suelta.** Sin comprar pack: cobrás **una** clase de un servicio (en Caja o el socio desde la app).
3. El staff da de alta al **afiliado** y cobra en el mostrador (efectivo o Mercado Pago). El socio también puede pagar **desde la app**.
4. Si hay clases, se publican **sesiones** (día, hora, cupo). El socio reserva en la app: gasta un crédito del pack, o paga esa clase suelta.
5. En **puerta**, el socio muestra la app. El sistema deja entrar o no según pack vigente, deuda y reserva. El personal puede autorizar a mano.

Vocabulario que conviene fijar acá (el resto de la guía lo usa):

- **Servicio:** lo que el local ofrece (libre o por sesiones). El pack tiene el precio de la oferta. Si el servicio es por sesiones, puede tener **precio de drop-in** (una clase suelta); el acceso libre no.
- **Pack:** lo que se cobra como oferta. Puede incluir uno o más servicios (cuota, créditos, o ambos en el mismo pack).
- **Sesión suelta (drop-in):** cobro de **una** clase, sin pack.
- **Caja:** el mostrador: cobros en el local y cierre del día.
- **Staff:** quien trabaja (dueño, recepción, profesor). El socio es **otra cuenta**, la de la app.

**Captura:** `web-servicios-lista.png` — lista (reusa en §06).  
**Dónde:** Admin → Servicios.  
**Qué se ve:** el catálogo. **Gym** = acceso libre (sin drop-in). **Funcional** = por sesiones, con precio de clase suelta. El menú ya muestra Operación, Personas, Catálogo y Sistema: no hace falta otra foto solo del menú.

**Captura:** `app-inicio-con-pack.png` — lista.  
**Dónde:** App → Inicio, socio con pack al día.  
**Qué se ve:** el mismo local, del otro lado. Pack **Gym + Funcional**: acceso libre (sin límite de sesiones) + Funcional con créditos. Atajos Sesiones y Tienda. Abajo, una clase próxima. El socio **no** ve el listado de Servicios del panel.

En estas dos fotos se entiende el modelo: el staff arma **Gym** y **Funcional**; el socio no ve esos ítems sueltos, ve **un pack** que los junta.

---

## 03. Casos de uso (para qué sirve)

### Gym con cuota mensual (acceso libre)

Vendés un pack mensual de acceso. El socio entra en el horario del local sin reservar clase. En puerta se evalúa si el pack está vigente y si hay deuda.

### Estudio o club por clases (pilates, funcional)

Vendés packs de créditos o la clase suelta. El socio mira el calendario, reserva, y en puerta entra **para esa clase**. Queda en los registros de puerta.

### Mixto (varios servicios en un pack)

Un mismo pack junta, por ejemplo, acceso libre **mensual** y un servicio por sesiones con créditos (en la demo: **Gym + Funcional**, 10 clases). El socio ve ambas cosas en la app. Si cancelás el pack, pierde **todo** el combo, no un servicio suelto.

### Cobro en el mostrador vs cobro en el celular

El staff cobra en **Caja** (efectivo o Mercado Pago del negocio). El socio, si quiere, arma el carrito en la app y paga con Mercado Pago. En ambos casos el pack o la reserva quedan en el mismo Brain.

Caja **no** es el listado del día: es el mostrador (afiliado + catálogo + carrito). Los movimientos del período están en **Reportes**; el arqueo del día, en **Cierre**.

**Captura:** `web-caja-carrito.png` — lista (§11).  
**Dónde:** Caja, socio elegido, pack **Gym + Funcional** en el carrito, Mercado Pago.  
**Qué se ve:** el mostrador listo para generar el link. El tilde de débito automático es opcional (solo packs mensuales).

**Captura:** `app-tienda-packs.png` — lista.  
**Dónde:** App → Tienda → Packs.  
**Qué se ve:** el mismo pack, “Al carrito”. El socio no entra a Caja.

---

# Parte 2 — Primeros pasos

Orden recomendado para un local nuevo. No saltees Config (Mercado Pago) si vas a cobrar online.

## 04. Antes de empezar

Faciliter te crea el tenant (el “gimnasio” en el sistema). Vos recibís:

- URL del panel: `{slug}.faciliter.xyz` (en la demo: `gym-de-prueba.faciliter.xyz`)
- Usuario admin (email + contraseña)

La app del socio usa **el mismo** Faciliter, otra puerta: **Acceso afiliado**. El email es el que le cargaste en Afiliados. En la app también pide el **slug** del local (`gym-de-prueba`); en la web el slug ya va en la URL.

En esta guía no documentamos el Super Admin (eso es interno de Faciliter). En el login staff puede verse el enlace; el dueño del local no lo usa.

**Captura:** `web-login-staff.png` — lista.  
**Dónde:** `{slug}.faciliter.xyz`, sin estar logueado.  
**Qué se ve:** **Acceso staff**, nombre del local, email y contraseña, Entrar.

**Captura:** `app-login.png` — lista.  
**Dónde:** App, pantalla de entrada.  
**Qué se ve:** **Acceso afiliado**, Faciliter, campos slug + email + contraseña. No es el mismo formulario que el panel.

---

## 05. Configurar el sistema

**Pantalla:** Admin → **Config**.

Hay dos bloques en la **misma** pantalla.

### Operación

- **Horas de cancelación de reserva:** hasta cuántas horas antes el socio puede cancelar solo (en la demo: 6).
- **Modo lista de espera:** qué pasa cuando la clase está llena (auto-asignar, confirma el afiliado, o confirma el staff).
- **Permitir ingreso tardío a sesión:** si puede entrar después de empezada la clase.
- **Tolerancia de deuda (días):** con cuántos días de atraso todavía deja entrar (en la demo: 15).
- **Multi-ingreso por día:** si el mismo socio puede pasar más de una vez el mismo día.

Guardar con **Guardar operación**.

### Mercado Pago

La cuenta es **del negocio**. Access token y public key de **tu** aplicación MP. Sin esto, el socio no puede pagar desde la app ni el staff cobrar MP en Caja.

Cuando está conectada, los campos quedan vacíos (no se re-pegan las keys). El estado muestra la key **enmascarada** y el último test. **Conectar / reemplazar** solo si cambiaste las credenciales. **Probar** verifica la cuenta. **Desconectar** corta los cobros online.

**Qué ve el socio:** nada de Config. Sí nota el efecto: puede (o no) pagar online, cancelar reservas, entrar con deuda.

**Captura:** `web-config.png` — lista (una sola; Operación y MP juntos).  
**Dónde:** Config, MP **conectado**, token **no** pegado en claro.  
**Qué se ve:** los dos paneles. No hace falta `web-config-operacion.png` ni `web-config-mercadopago.png` por separado.

---

## 06. Crear servicios

**Pantalla:** Admin → **Servicios** → **+ Nuevo**.

Un servicio es lo que el local **ofrece**. El pack tiene el precio de la oferta; si es por sesiones, acá también va el **precio de drop-in** (una clase suelta). El acceso libre no.

Dos tipos (se eligen al crear; después quedan fijos):

- **Acceso libre:** derecho a entrar en el horario, sin reservar una clase. Sin drop-in.
- **Por sesiones:** una clase o turno (pilates, funcional…). Después se agenda en Sesiones. Puede llevar foto (esa es la que ve el socio en Tienda) y precio de drop-in.

El pack, en el paso siguiente, **empaqueta** uno o más de estos servicios. La sesión suelta no necesita pack: se cobra esa clase al precio de drop-in.

**Qué ve el socio:** en la app no hay un menú “Servicios”. Ve el servicio dentro de un pack, como clase en el calendario, o como clase suelta para pagar.

**Captura:** `web-servicios-lista.png`  
(la misma del 02: Gym + Funcional, drop-in solo en el de sesiones). La lista nueva con la **X** suelta no la usamos.

**Captura:** `web-servicios-alta.png` — lista.  
**Dónde:** **+ Nuevo**, tipo **Acceso libre**.  
**Qué se ve:** alta: tipo, nombre, descripción, imagen. No pide drop-in porque es libre.

**Captura:** `web-servicios-editar.png` — lista.  
**Dónde:** lápiz de Funcional.  
**Qué se ve:** tipo ya fijo (por sesiones), foto, precio drop-in, Activo. Es el complemento del alta: los campos de la clase suelta.

---

## 07. Crear packs

**Pantalla:** Admin → **Packs**.

El pack es la **oferta comercial**: un precio y los servicios que incluye.

Adentro puede ir **un** servicio o **varios**. No se tildan: en **Componentes** elegís el servicio y, si es por sesiones, la cantidad de créditos. **+ Agregar servicio** suma otro (por ejemplo Gym acceso libre + Funcional con 10 créditos). El tipo del pack se calcula solo (**Mixto** si hay libre y sesiones). Un solo cobro; el socio recibe las dos cosas (como en `app-inicio-con-pack.png`).

Cómo se cobra el pack (**Periodo de facturación**):

- **Mensual:** se renueva. Los créditos vencen con el mes del contrato. El débito automático, si lo usás, aplica a este tipo.
- **De una vez:** bloque de créditos o combo puntual.

La **sesión suelta** no se arma acá: se cobra en Caja o en la app, sobre un servicio por sesiones que ya exista.

**Qué ve el socio:** App → **Tienda** → Packs (el combo, no los servicios sueltos). Nombre, precio, “Al carrito”. En Inicio, si ya lo compró: pack, vencimiento, créditos. La clase suelta la ve en **Tienda → Sesiones** o en el calendario, no como pack.

**Captura:** `web-packs-lista.png` — lista.  
**Dónde:** Packs.  
**Qué se ve:** **Gym + Funcional**, Mixto, $60.000, Mensual, 2 componentes.

**Captura:** `web-packs-editar.png` — lista.  
**Dónde:** lápiz del mixto.  
**Qué se ve:** nombre, foto (la de Tienda), precio, periodo Mensual, inicio de Componentes. El tipo Mixto es calculado. La línea de Kuatia se puede ignorar.

**Captura:** `web-packs-alta.png` — lista.  
**Dónde:** **+ Nuevo**, scrolleado a Componentes.  
**Qué se ve:** periodo Mensual, un servicio (Funcional) con créditos, **+ Agregar servicio**.

**Captura:** `web-packs-componentes.png` — lista.  
**Dónde:** editar el mixto, scrolleado a Componentes.  
**Qué se ve:** Funcional (por sesiones) **10 créditos** + Gym (acceso libre) + Agregar servicio. Un pack, dos derechos.

**Captura:** `app-tienda-packs.png`  
(reusa §03)

**Captura:** `app-inicio-sin-pack.png` — falta.  
**Dónde:** App Inicio, socio **sin** pack vigente.  
**Qué debe verse:** estado vacío o “sin pack”, atajo a Tienda. Contraste con `app-inicio-con-pack.png`.

---

## 08. Agendar sesiones

**Pantalla:** Admin → **Sesiones**. Solo aplica a servicios **por sesiones** (en la demo: Funcional). El acceso libre no se agenda.

Hay dos pestañas:

- **Calendario:** la semana. Cada bloque es una clase (hora, servicio, cupo ocupado/total, profesor si hay).
- **Recurrencias:** la regla que genera esas clases (días, hora, rango, cupo). **Desactivar** corta las futuras; no borra las ya creadas.

**+ Nueva** abre el alta. Tipo:

- **Puntual:** una sola clase (inicio, fin, cupo).
- **Recurrente:** días de la semana, hora, duración, desde/hasta, cupo. Genera las sesiones del calendario (tope de meses en el propio formulario).

El socio **no** crea sesiones. Reserva un lugar en las que vos publicaste. Reservar implica pagar: crédito del pack, o drop-in.

**Qué ve el socio:** App → **Sesiones** (calendario del mes). Día con clases → card. Con crédito: Reservar. Sin crédito: Al carrito. **Mis clases:** las que ya tiene. También las ve como drop-in en Tienda → Sesiones (`app-tienda-sesiones.png`).

**Captura:** `web-sesiones-calendario.png` — lista.  
**Dónde:** Sesiones → Calendario, semana con Funcional.  
**Qué se ve:** lun/mié/vie 08:00, cupo (1/10, 4/10).

**Captura:** `web-sesiones-recurrencias.png` — lista (si retomas, sacá el hover de Soporte y que Sesiones quede como ítem activo).  
**Dónde:** pestaña Recurrencias.  
**Qué se ve:** regla Funcional, L X V, 08:00, cupo 10, 27 sesiones, Activa.

**Captura:** `web-sesiones-alta.png` — lista.  
**Dónde:** + Nueva, tipo **Puntual**.  
**Qué se ve:** una clase suelta (servicio, inicio, fin, cupo).

**Captura:** `web-sesiones-recurrencia-alta.png` — lista.  
**Dónde:** + Nueva, tipo **Recurrente**.  
**Qué se ve:** días, hora, duración, rango, cupo, Crear recurrencia.

**Captura:** `app-sesiones-calendario.png` — lista.  
**Dónde:** App → Sesiones → Calendario.  
**Qué se ve:** mes; los puntos verdes son días con clase. Contraste del calendario web.

**Captura:** `app-sesiones-dia.png` — lista.  
**Dónde:** un día libre (25 sep).  
**Qué se ve:** Funcional, cupo, **Reservar** (tiene crédito del pack).

**Captura:** `app-sesiones-dia-reservada.png` — lista.  
**Dónde:** un día ya tomado (11 sep).  
**Qué se ve:** la misma card, botón **Reservada**. No hay “Al carrito” porque ya tiene lugar.

**Captura:** `app-mis-clases.png` — lista.  
**Dónde:** Sesiones → Mis clases.  
**Qué se ve:** las reservas del socio y **Cancelar reserva**.

---

## 09. Crear personal (staff)

**Pantallas:** Admin → **Roles y permisos**, después **Staff**.

Staff es el equipo: dueño, recepción, profesor. Cada uno entra al **panel** con su usuario. Un usuario puede tener varios roles.

El socio **no** es un rol de staff. Si la misma persona es profesor y socio, son **dos perfiles**.

### Roles

El rol **Admin** viene **de sistema**: no se edita ni se elimina (en la lista solo el ojo: ver). Es el que usa el dueño al arrancar.

**Profesor** también es de sistema, pero **sí se le pueden cambiar los permisos** (lápiz). En la demo: ve afiliados y sesiones; no opera Caja.

**+ Nuevo rol** arma un rol custom (recepción, etc.) tildando permisos del catálogo.

Orden:

1. Dejá Admin como está. Ajustá Profesor o creá un rol si hace falta (qué puede hacer: caja, puerta, catálogo…).
2. Alta de staff: nombre, email, contraseña inicial, roles.

### Staff

**+ Nuevo:** datos + roles iniciales. Después, en la fila: editar ficha, asignar roles, (el ícono de credencial Kuatia no va en esta guía).

**Qué ve el socio:** nada de Staff ni de roles. En la sesión puede figurar el nombre del profesor.

**Captura:** `web-roles-lista.png` — lista.  
**Dónde:** Roles y permisos.  
**Qué se ve:** Admin (Sistema, solo ver) y Profesor (Sistema, se edita).

**Captura:** `web-roles-flags.png` — lista.  
**Dónde:** lápiz de Profesor.  
**Qué se ve:** permisos tildados; **Operar caja del día** no. Admin no tiene esta pantalla.

**Captura:** `web-roles-alta.png` — lista.  
**Dónde:** + Nuevo rol.  
**Qué se ve:** nombre + catálogo de permisos (vacío).

**Captura:** `web-staff-lista.png` — lista.  
**Dónde:** Staff.  
**Qué se ve:** el admin de prueba, rol Admin, Activo.

**Captura:** `web-staff-alta.png` — lista.  
**Dónde:** + Nuevo.  
**Qué se ve:** nombre, email, password, foto, roles iniciales.

**Captura:** `web-staff-editar.png` — lista.  
**Dónde:** lápiz de un staff.  
**Qué se ve:** ficha (nombre, email, foto). Los roles van en otro modal.

**Captura:** `web-staff-roles.png` — lista.  
**Dónde:** asignar roles al staff.  
**Qué se ve:** Admin / Profesor. Se puede tener más de uno.

No usamos la captura de **Credencial de acceso** (Kuatia / molinete): no es el arranque de un local.

---

## 10. Crear un afiliado

**Pantalla:** Admin → **Afiliados** → **+ Nuevo**.

Alta: nombre, email, password inicial, teléfono y documento (opcionales), foto. Con eso entra a la **app** (mismo email + el slug del local).

Todavía puede no tener pack: lo cobrás en Caja o él compra en la Tienda. El débito automático, si lo usás, se gestiona en Caja (la ficha tiene el atajo).

Estados: **Activo / Suspendido / Inactivo**. Suspender corta el acceso; no es borrar la cuenta.

**Estado de cuenta** (otro modal): contratos, acceso libre, créditos, deuda, próximas reservas (si la clase se pagó con crédito o drop-in). Es la contrapantalla de Inicio en la app.

Al contratar un pack se emite la **credencial de acceso** (para la puerta). En el panel: PENDING hasta que el socio la acepta; ACCEPTED cuando ya está en el celular. El socio lo hace en App → **Acceso** → Credenciales → **Aceptar**.

**Re-emitir** (billetera reseteada, celu nuevo, o Kuatia falló al cobrar): genera un offer nuevo del **contrato vigente hoy**. No cobra ni crea otro mes. El socio vuelve a Aceptar.

**Qué ve el socio:** su Inicio, no el padrón. No ve a otros afiliados.

**Captura:** `web-afiliados-lista.png` — lista.  
**Dónde:** Afiliados.  
**Qué se ve:** Socio Gym de Prueba, Activo. (Si retomas, que Afiliados sea el único ítem activo del menú.)

**Captura:** `web-afiliados-alta.png` — lista.  
**Dónde:** + Nuevo.  
**Qué se ve:** alta rápida. Sin DNI real de un cliente.

**Captura:** `web-afiliados-ficha.png` — lista.  
**Dónde:** lápiz, datos.  
**Qué se ve:** ficha (nombre, email, foto, estado Activo). El estado de cuenta es el otro ícono.

**Captura:** `web-afiliados-ficha-al-dia.png` — lista (también §11).  
**Dónde:** estado de cuenta, socio con pack.  
**Qué se ve:** Gym + Funcional, al día, 9 sesiones, reservas drop-in y crédito. Contraste: `app-inicio-con-pack.png`.

**Captura:** `app-inicio-recien-alta.png` / `app-inicio-sin-pack.png` — falta.  
**Dónde:** Inicio de un socio **sin** pack. Contraste con la ficha al día.

**Captura:** `web-afiliados-credencial.png` — lista.  
**Dónde:** Afiliados → credencial del socio, **ACCEPTED**.  
**Qué se ve:** pack Gym + Funcional, emitida. El staff no “acepta” acá: emite (o re-emite). El socio acepta en la app.

**Captura:** `web-afiliados-credencial-pending.png` — lista.  
**Dónde:** el mismo modal, **PENDING**.  
**Qué se ve:** la oferta ya salió; falta que el socio toque Aceptar.

**Captura:** `app-acceso-aceptar.png` — lista.  
**Dónde:** App → Acceso → Credenciales, oferta pendiente.  
**Qué se ve:** **Gym + Funcional** y **Aceptar**. Contraste de PENDING.

**Captura:** `app-acceso-credencial.png` — lista.  
**Dónde:** después de Aceptar, “En este celular”.  
**Qué se ve:** la credencial guardada. Hoy el texto es técnico (código interno); igual sirve para mostrar que ya está en el teléfono. Si más adelante la card muestra el nombre del pack, se reemplaza.

---

## 11. Cobrar (web) y que el socio pague en la app

Hay **dos caminos** (web o app) para lo mismo: un pack o una sesión suelta.

### Desde la web (mostrador)

**Pantalla:** Admin → **Caja**.

1. Buscás al afiliado (queda tildado arriba).
2. En **Catálogo** elegís pestaña **Packs** o **Servicios** y sumás al carrito con +.
3. Cobrá **efectivo** (suma al cierre) o **Mercado Pago** (un link con el total del carrito; cada ítem se activa al aprobar).
4. Si cobraste un pack, queda activo. Si cobraste una clase suelta, queda la reserva. En un pack mensual podés tildar **débito automático** (opcional): autoriza el cobro del mes siguiente a precio de catálogo.

**Cierre:** Admin → **Cierre**: totales **de ese día** y arqueo de efectivo.  
**Reportes:** movimientos de un rango (no es el mostrador).

### Desde la app (el socio)

1. **Tienda** → pestaña Packs (la oferta) o **Sesiones** (clase suelta / drop-in) → Al carrito.
2. Carrito → **Pagar con Mercado Pago**.
3. Cuando MP aprueba, el pack o la reserva aparecen en Inicio / Mis clases.
4. **Historial:** comprobantes.

Faciliter no se queda la plata: MP es tuyo; el efectivo lo registrás vos.

**Qué ve el socio:** no ve Caja. Ve Tienda (el pack y las clases sueltas), el carrito y, si ya pagó, Inicio al día. Después de un cobro en el mostrador, el Inicio se actualiza **sin** que toque el celular.

**Captura:** `web-caja-afiliado.png` — lista.  
**Dónde:** Caja, socio elegido, catálogo Packs, carrito vacío, efectivo.  
**Qué se ve:** el paso 1–2, antes de sumar ítems.

**Captura:** `web-caja-carrito.png` — lista (reusa §03).  
**Dónde:** mismo socio, **Gym + Funcional** en el carrito, MP, “Generar link MP”.  
**Qué se ve:** cobro de pack. El bloque de débito es opcional.

**Captura:** `web-caja-carrito-dropin.png` — lista.  
**Dónde:** Caja, pestaña Servicios, dos clases Funcional en el carrito.  
**Qué se ve:** cobro de **sesión suelta** (sin pack). Contraste con el carrito del pack.

**Captura:** `web-reportes-movimientos.png` — lista.  
**Dónde:** Reportes, rango con al menos un cobro.  
**Qué se ve:** el cobro asentado (en la demo: drop-in Funcional por MP). Esto reemplaza el “toast de éxito”: Caja no es el historial.

**Captura:** `app-tienda-packs.png` — lista (reusa §03).  
**Captura:** `app-tienda-sesiones.png` — lista.  
**Dónde:** App → Tienda → Sesiones.  
**Qué se ve:** drop-in (una ya **Comprada**, otra disponible). Es la contrapantalla de `web-caja-carrito-dropin.png`.

**Captura:** `app-carrito.png` — lista.  
**Dónde:** App, carrito con el pack, **Pagar con Mercado Pago**.  
**Qué se ve:** contrapantalla de `web-caja-carrito.png`.

**Captura:** `app-historial.png` — lista.  
**Dónde:** App → Historial.  
**Qué se ve:** pagos y devoluciones (código GB-…, monto, Mercado Pago, **Pago** / **Devolución**). Contraste de `web-reportes-movimientos.png`. **Ver comprobante** abre el detalle; no hace falta otra foto si esta ya muestra código y medio.

**Captura:** `web-afiliados-ficha-al-dia.png` — lista (reusa §10).

**Captura:** `app-inicio-con-pack.png`  
(reusa) Inicio del mismo socio, al día.

---

# Parte 3 — Módulos

Cada módulo: qué hace en el panel y qué ve el socio.

## Config

Datos del local y Mercado Pago. Sin MP conectado no hay cobro online; el efectivo en Caja sigue.

**Captura:** `web-config-desconectado-mp.png`  
**Dónde:** MP sin conectar.  
**Qué se ve:** Mercado Pago todavía no está conectado: no cobrás online.

## Servicios

El catálogo de lo que ofrece el local. Un servicio **inactivo** no se vende y no entra en un pack nuevo.

**Captura:** `web-servicios-inactivo.png` — opcional.

## Packs

La oferta que se cobra. Un pack puede juntar acceso libre y créditos. Si lo cancelás, el socio pierde **todo** el combo, no un servicio suelto.

**Captura:** `web-packs-lista.png` + `web-packs-componentes.png` — el mixto ya está.

## Sesiones

Calendario y recurrencias. En una clase ves quién reservó (roster) y, si hay cupo lleno, la lista de espera.

**Captura:** `web-sesiones-roster.png`  
**Dónde:** una sesión con 1–2 reservas.  
**Qué se ve:** quién reservó esa clase (nombres de prueba).

**Captura:** `app-mis-clases.png` — lista.

## Afiliados

El padrón. Si el socio está de baja o sin pack vigente, en puerta no entra.

**Captura:** `web-puerta-denegado-sin-pack.png` — ver Puerta.

## Staff y roles

Quién entra al **panel** y qué puede hacer. Un profesor sin permiso de Caja no ve Caja. El rol Admin no se edita ni se borra.

## Caja

El mostrador: pestaña **Cobro** (carrito) y pestaña **Débitos** (renovación de packs mensuales). El asistente **lista**; no cobra.

**Captura:** `web-caja-debitos.png` — lista (datos de prueba; nunca una tarjeta real).  
**Dónde:** Caja → Débitos, socio con pack mensual, formulario de tarjeta de MP para autorizar.  
**Qué se ve:** no es un cobro ahora: es guardar la tarjeta para el débito del mes. La cola (Hoy / Reintentando / Fallidos) puede estar vacía.

## Cierre

Solo mueve lo de **ese** día de negocio. Si cobraste otro día, acá aparece $0.

**Captura:** `web-cierre-vacio.png` — guardada; **rehacer** como `web-cierre-arqueo.png`.  
**Por qué rehacer:** la foto es del 10/09 y el cobro de Reportes es del 2/09. Elegí en el datepicker el día del movimiento (o cobrá algo ese día) para que se vean ingresos y la lista de movimientos.

**Qué ve el socio:** nada. El cierre es interno.

## Reportes

Rango de fechas, no el mostrador. Sirve para ver qué se cobró (pack, drop-in, medio, staff).

**Captura:** `web-reportes-movimientos.png` — lista.

## Puerta

En la **app**, el socio abre **Acceso**. Primero **acepta** la credencial (oferta del pack). Después presenta el QR o escanea, según cómo opere el local.

En el **panel**, **Puerta** muestra permitido o denegado y el motivo. Historial del día.

La credencial se emite al contratar el pack (Afiliados → credencial). PENDING = esperando al socio. ACCEPTED = ya la guardó en el celular. **Re-emitir** no cobra: usa el pack vigente hoy; el socio vuelve a Aceptar.

Pase manual: el personal con permiso deja pasar a alguien que la regla no dejaría.

**Captura:** `web-afiliados-credencial.png` + `app-acceso-aceptar.png` — listas.

**Captura:** `web-puerta-permitido.png` — falta.  
**Dónde:** Puerta, intento permitido (socio con pack / clase).

**Captura:** `web-puerta-denegado.png` — falta.  
**Dónde:** denegado (sin pack o deuda), motivo legible.

**Captura:** `app-acceso-qr.png` — falta.  
**Dónde:** App → Acceso → Escanear (cámara / QR). Sin QR de un socio real.

## App del socio (recorrido)

Pestañas: **Inicio | Acceso | Ajustes**.

- Inicio: cuenta, pack, atajos Sesiones / Tienda.
- Sesiones: calendario, día, mis clases.
- Tienda: pestaña Packs y pestaña Sesiones (drop-in), carrito, historial.
- Acceso: credencial / QR.
- Ajustes: cuenta, tema, salir.

Rutinas y avisos todavía no están en este corte.

**Captura:** `app-ajustes.png`  
**Dónde:** Ajustes.  
**Qué se ve:** cuenta, tema y salir.

## Asistente

En el Admin, la burbuja consulta **datos del gym** (puede equivocarse; no cobra). En la landing pública, la misma burbuja solo explica el producto.

**Captura:** `web-asistente-drawer.png`  
**Dónde:** Admin, drawer abierto, una pregunta tipo “¿está al día Socio de Prueba?”.  
**Qué se ve:** el hilo y el disclaimer de que puede equivocarse.

---

## Lista corta para ir disparando fotos

Orden sugerido de sesión de capturas (un gym de prueba):

1. `web-login-staff.png` + `app-login.png` *(listas)*
2. `web-inicio-dashboard.png`
3. `web-servicios-lista.png` + `app-inicio-con-pack.png` *(listas; el menú completo ya se ve en Servicios)*
4. `web-config.png` *(lista; Operación + MP en una)*
5. `web-servicios-alta.png` + `web-servicios-editar.png` *(listas; lista de servicios ya está)*
6. `web-packs-lista.png` + `web-packs-editar.png` + `web-packs-alta.png` + `web-packs-componentes.png` *(listas)*
7. `web-sesiones-calendario.png` + `web-sesiones-recurrencias.png` + `web-sesiones-alta.png` + `web-sesiones-recurrencia-alta.png` *(listas; app de sesiones sigue)*
8. `web-roles-lista.png` + `web-roles-flags.png` + `web-roles-alta.png` + `web-staff-lista.png` + `web-staff-alta.png` + `web-staff-editar.png` + `web-staff-roles.png` *(listas; sin credencial Kuatia)*
9. `web-afiliados-lista.png` + `web-afiliados-alta.png` + `web-afiliados-ficha.png` + `web-afiliados-ficha-al-dia.png` *(listas)*
10. `app-inicio-sin-pack.png` *(login de la app ya está)*
11. `web-caja-afiliado.png` + `web-caja-carrito.png` + `web-caja-carrito-dropin.png` *(listas)*
12. `app-tienda-packs.png` + `app-tienda-sesiones.png` + `app-carrito.png` *(listas)*
13. `web-reportes-movimientos.png` + `web-caja-debitos.png` *(listas)*
14. `web-cierre-arqueo.png` *(rehacer: día con movimientos; no usar `web-cierre-vacio.png` en el sitio)*
15. `app-historial.png` *(lista)*
16. `web-afiliados-credencial.png` + `web-afiliados-credencial-pending.png` + `app-acceso-aceptar.png` + `app-acceso-credencial.png` *(listas)*
17. `app-sesiones-calendario.png` + `app-sesiones-dia.png` + `app-sesiones-dia-reservada.png` + `app-mis-clases.png` *(listas)*
18. `app-acceso-qr.png` + `web-puerta-permitido.png` + `web-puerta-denegado.png`
19. `web-asistente-drawer.png`

---

El sitio público es `/docs` (índice + tres capítulos). Las PNG publicadas están en `web/public/docs/`. El playbook de fotos de abajo sigue para ir completando lo que falta.
