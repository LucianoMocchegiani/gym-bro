# Guía de uso — Faciliter (web + app)

**Estado:** Publicada en `/docs`. Este archivo es el **texto canónico**: el sitio lo parte en capítulos y el asistente (`mcp/help/*`) tiene que decir lo mismo.  
**Sitio:** `web/content/docs/guia.md` + capturas en `web/public/docs/`.  
**Para quién:** dueño y staff del local. El socio no lee esto: lo vive en la app y en el portal web del gym.  
**Fuera de esta guía:** Super Admin (plataforma), rutinas por días, notificaciones push, tienda de productos físicos, noticias del local, bandeja de avisos del staff.

Este archivo es el **playbook de capturas** además del texto (qué foto falta, dónde sacarla). El sitio oculta las líneas de captura y muestra solo las fotos que existen.

Convención de archivos (solo en `web/public/docs/`; no hay otra copia):

- `web-….png` — panel Admin (desktop).
- `app-….png` — app del afiliado (celular).
- **Capturas reales**, no maquetas en CSS. El lector tiene que reconocer la pantalla.
- Sin datos reales de socios. Enmascará tokens de Mercado Pago. Nunca una tarjeta real.
- Recortá la barra del navegador si molesta; no dejes overlays del editor (el “N” de Cursor, etc.).
- Estado en la línea de captura: **lista** (se publica), **lista (repetir)** (se publica, pero conviene reemplazar el PNG con el mismo nombre), **falta** o **rehacer** (no se publica hasta reemplazar el PNG y pasarla a lista).

En cada captura: **nombre de archivo**, **dónde sacarla**, **qué tiene que verse**.

---

## Mapa del sitio

```text
Qué es               /docs/que-es
  01  Qué es Faciliter
  02  Cómo funciona (web vs app)
  03  Casos de uso

Primeros pasos       /docs/primeros-pasos   ← el orden para arrancar un local
  04  Antes de empezar
  05  Configurar
  06  Servicios
  07  Packs
  08  Sesiones
  09  Personal
  10  Afiliados
  11  Cobrar (web y app)

Módulos              /docs/modulos
  Config · Servicios · Packs · Sesiones · Afiliados · Carpeta · Importar
  Staff y roles · Caja · Vencimientos · Cierre · Gastos · Devoluciones
  Reportes · Puerta · Avisos · Web del gym · Auditoría · App · Portal web
  Asistente

Tu cuenta y el plan  /docs/cuenta
  Cuenta Faciliter · Contratar · Mi cuenta · Plan / Uso · Eliminar cuenta · Soporte
```

Los primeros pasos **ya contrastan** qué ve el socio. Los módulos profundizan.

---

# Parte 1 — Qué es y cómo funciona

## 01. Qué es Faciliter

Faciliter (también le decimos Brain) es el sistema de **afiliaciones** del local: socios, lo que les vendés, cobros, clases y quién puede entrar. Sirve a gyms, clubes, estudios y cualquier negocio que trabaje con afiliados.

Hay **dos caras**, una sola operación:

| Cara | Quién | Dónde |
|------|--------|--------|
| **Panel (web)** | Dueño, recepción, profesores (staff) | `{tu-local}.faciliter.xyz` |
| **App** | El afiliado (socio) | App Faciliter en el celular |

El dinero que paga el socio va a **tu** Mercado Pago y queda registrado en **caja**. Faciliter no se queda con ese cobro. Si el pago es en efectivo, solo se registra en caja.

**Captura:** `web-inicio-dashboard.png` — lista (repetir).  
**Dónde:** Admin → Inicio, ya logueado.  
**Qué se ve:** el Inicio del panel. A la izquierda, el menú por grupos. Al centro, el saludo y las tarjetas del día.

En esta pantalla el staff entra al **cerebro del local**. No es la app del socio: es el tablero de quien opera.

- La URL es `{tu-local}.faciliter.xyz` (en la captura: `gym-de-prueba.faciliter.xyz`).
- **Operación:** Inicio, Puerta, Caja, Vencimientos, Cierre, Gastos, Solicitudes de devolución, Reportes.
- **Personas:** Afiliados, Staff, Roles y permisos.
- **Catálogo:** Servicios, Packs y Sesiones.
- **Sistema:** Config, Avisos, Web del gym, Plan / Uso, Auditoría.
- Las tarjetas del día: afiliados activos, ingresos del día, accesos de hoy, socios sin pack activo, sesiones de hoy. Cada uno ve las que su rol permite.
- La burbuja abajo a la derecha es el **asistente**: consulta datos del gym y puede proponer cambios que vos confirmás.

Cada persona ve en el menú solo lo que su rol permite. Los números pueden estar en cero: cuando el local tenga movimiento, las mismas tarjetas se llenan.

El socio **no ve** este tablero. En la app ve su pack, sus clases y el acceso. Esa contrapantalla va en `app-inicio-con-pack.png` (paso 02).

---

## 02. Cómo funciona (la misma operación, dos pantallas)

1. El local arma **servicios**: lo que ofrece. Pueden ser de **acceso libre** (entrar en el horario, sin reservar) y/o **por sesiones** (una clase o turno: pilates, funcional, etc.). El servicio todavía no es el cobro: es el catálogo.
2. Para cobrar hay **dos caminos**, no uno solo:
   - **Un pack.** Es la oferta que le vendés al socio. Un pack puede llevar **varios servicios a la vez**. Ejemplo: acceso libre mensual + pilates con **8 sesiones**. Otro pack puede ser solo la cuota de acceso, o solo un bloque de créditos. El cobro del pack es mensual o único, según cómo lo armes.
   - **Una sesión suelta.** Sin comprar pack: cobrás **una** clase de un servicio (en Caja o el socio desde la app).
3. El staff da de alta al **afiliado** y cobra en el mostrador (efectivo o Mercado Pago). El socio también puede pagar **desde la app**.
4. Si hay clases, se publican **sesiones** (día, hora, cupo). El socio reserva en la app: gasta un crédito del pack, o paga esa clase suelta. Si está llena, se anota en la lista de espera.
5. En **puerta**, el sistema deja entrar o no según pack vigente, deuda y reserva. El personal puede autorizar a mano.

Vocabulario que conviene fijar acá (el resto de la guía lo usa):

- **Servicio:** lo que el local ofrece (libre o por sesiones). Si es por sesiones, puede tener **precio de drop-in** (una clase suelta); el acceso libre no.
- **Pack:** lo que se cobra como oferta. Puede incluir uno o más servicios (cuota, créditos, o ambos en el mismo pack).
- **Sesión suelta (drop-in):** cobro de **una** clase, sin pack.
- **Caja:** el mostrador: cobros en el local y débitos automáticos.
- **Staff:** quien trabaja (dueño, recepción, profesor). El socio es otro perfil, el de la app.
- **Cuenta Faciliter:** el mail con el que cada persona entra. La misma cuenta sirve para varios locales y para ser socio y staff a la vez.

**Captura:** `web-servicios-lista.png` — lista (repetir).  
**Dónde:** Admin → Servicios.  
**Qué se ve:** el catálogo. **Gym** = acceso libre (sin drop-in). **Funcional** = por sesiones, con precio de clase suelta.

**Captura:** `app-inicio-con-pack.png` — lista (repetir).  
**Dónde:** App → Inicio, socio con pack al día.  
**Qué se ve:** el mismo local, del otro lado. Pack **Gym + Funcional**: acceso libre (sin límite de sesiones) + Funcional con créditos. Atajos Sesiones, Tienda, Documentos y Avisos. Abajo, una clase próxima.

En estas dos fotos se entiende el modelo: el staff arma **Gym** y **Funcional**; el socio no ve esos ítems sueltos, ve **un pack** que los junta.

---

## 03. Casos de uso (para qué sirve)

### Gym con cuota mensual (acceso libre)

Vendés un pack mensual de acceso. El socio entra en el horario del local sin reservar clase. En puerta se evalúa si el pack está vigente y si hay deuda. Si querés, el mes se cobra solo con **débito automático** de Mercado Pago.

### Estudio o club por clases (pilates, funcional)

Vendés packs de créditos o la clase suelta. El socio mira el calendario, reserva, y en puerta entra **para esa clase**. Si la clase se llena, queda en lista de espera y sube solo cuando se libera un lugar.

### Mixto (varios servicios en un pack)

Un mismo pack junta, por ejemplo, acceso libre **mensual** y un servicio por sesiones con créditos (en la demo: **Gym + Funcional**, 10 clases). El socio ve ambas cosas en la app. Si cancelás el pack, pierde **todo** el combo, no un servicio suelto.

### Cobro en el mostrador vs cobro en el celular

El staff cobra en **Caja** (efectivo o un link de Mercado Pago del negocio). El socio, si quiere, arma el carrito en la app y paga con Mercado Pago. En ambos casos el pack o la reserva quedan en el mismo Brain.

Caja **no** es el listado del día: es el mostrador (afiliado + catálogo + carrito). Los movimientos del período están en **Reportes**; el arqueo del día, en **Cierre**.

**Captura:** `web-caja-carrito.png` — lista (repetir).  
**Dónde:** Caja, socio elegido, pack **Gym + Funcional** en el carrito, Mercado Pago.  
**Qué se ve:** el mostrador listo para generar el link. El tilde de débito automático es opcional (solo packs mensuales).

**Captura:** `app-tienda-packs.png` — lista.  
**Dónde:** App → Tienda → Packs.  
**Qué se ve:** el mismo pack, listo para sumar al carrito. El socio no entra a Caja.

---

# Parte 2 — Primeros pasos

Orden recomendado para un local nuevo. No saltees Config (Mercado Pago) si vas a cobrar online.

## 04. Antes de empezar

Hay dos formas de tener tu local en Faciliter:

- **Contratarlo vos** desde faciliter.xyz: elegís un plan, creás tu cuenta y autorizás el débito en Mercado Pago (detalle en **Tu cuenta y el plan**).
- **Que te lo dé de alta Faciliter** después de una reunión.

En los dos casos quedan:

- La URL del panel: `{slug}.faciliter.xyz` (en la demo: `gym-de-prueba.faciliter.xyz`).
- Tu usuario de staff con rol Admin (el mail de tu cuenta Faciliter).

**Entrar al panel:** en la URL de tu local, **Acceso staff**: mail y contraseña, o **Continuar con Google**. El local sale de la URL: no hay que elegirlo.

**Entrar a la app (socio):** la app pide la **cuenta Faciliter** (mail y contraseña, o Google / Apple). No pide el local: si la persona está en un solo local entra directo; si está en varios, elige en **Tus gyms**. El mail es el que le cargaste en Afiliados.

**Captura:** `web-login-staff.png` — rehacer.  
**Dónde:** `{slug}.faciliter.xyz/login`, sin estar logueado.  
**Por qué rehacer:** la foto actual tiene los atajos de demo y el link de Super Admin, que ya no están.  
**Qué se ve:** **Acceso staff**, nombre del local, mail y contraseña, **Entrar** y **Continuar con Google**.

**Captura:** `app-login.png` — rehacer.  
**Dónde:** App, pantalla de entrada (sin sesión).  
**Por qué rehacer:** la foto actual pide el slug del local; ahora es la cuenta Faciliter.  
**Qué se ve:** **Faciliter · Tu cuenta**, mail y contraseña, **Entrar** y los botones de Google / Apple.

**Captura:** `app-gyms.png` — falta.  
**Dónde:** App, con una cuenta que está en dos locales (o socio y staff del mismo).  
**Qué se ve:** **Tus gyms**: una tarjeta por local con «slug · Socio» o «slug · Staff».

---

## 05. Configurar el sistema

**Pantalla:** Admin → **Config**.

Hay dos bloques en la **misma** pantalla.

### Operación

- **Puerta:** cómo entra la gente. **QR con la app** (el socio escanea el QR de la puerta con la app Faciliter) o **Acceso ZKTeco** (molinete o puerta con huella, tarjeta o PIN). ZKTeco es opcional: su configuración depende del modelo del aparato y la coordinás con nuestros técnicos.
- **Horas de cancelación de reserva:** hasta cuántas horas antes el socio puede cancelar solo (en la demo: 6).
- **Modo lista de espera:** qué pasa cuando se libera un lugar en una clase llena (auto-asignar, confirma el afiliado, o confirma el staff).
- **Permitir ingreso tardío a sesión:** si puede entrar después de empezada la clase.
- **Tolerancia de deuda (días):** con cuántos días de atraso todavía deja entrar (en la demo: 15).
- **Multi-ingreso por día:** si el mismo socio puede pasar más de una vez el mismo día, con un tope diario.

Guardar con **Guardar operación**.

### Mercado Pago

La cuenta es **del negocio**. Sin esto, el socio no puede pagar desde la app ni el staff cobrar con link o débito en Caja.

Tocá **Conectar Mercado Pago**, iniciá sesión en Mercado Pago con la cuenta **del gym** y autorizá. Volvés solo a Config con la cuenta conectada. No hace falta crear nada en MP Developers ni copiar claves.

El estado muestra **Conectada con Mercado Pago**, la key **enmascarada** y el último test. Faciliter renueva la conexión solo; si alguna vez no puede, aparece **Reconectar Mercado Pago**. **Reconectar** también sirve para cambiar de cuenta. **Probar** verifica la cuenta. **Desconectar** corta los cobros online.

**Conexión manual (avanzado)** queda plegada abajo: pegar access token y public key de una app MP propia. Usala solo si te lo pide soporte.

**Qué ve el socio:** nada de Config. Sí nota el efecto: puede (o no) pagar online, cancelar reservas, entrar con deuda.

**Captura:** `web-config.png` — rehacer.  
**Dónde:** Config, MP **conectado** con el botón (estado «Conectada con Mercado Pago»).  
**Por qué rehacer:** la foto actual no tiene el selector **Puerta** ni el tope diario de multi-ingreso.  
**Qué se ve:** los dos paneles: Operación (con Puerta = QR con la app) y Mercado Pago conectado.

---

## 06. Crear servicios

**Pantalla:** Admin → **Servicios** → **+ Nuevo**.

Un servicio es lo que el local **ofrece**. El pack tiene el precio de la oferta; si es por sesiones, acá también va el **precio de drop-in** (una clase suelta). El acceso libre no.

Dos tipos (se eligen al crear; después quedan fijos):

- **Acceso libre:** derecho a entrar en el horario, sin reservar una clase. Sin drop-in.
- **Por sesiones:** una clase o turno (pilates, funcional…). Después se agenda en Sesiones. Puede llevar foto (esa es la que ve el socio en Tienda) y precio de drop-in.

El pack, en el paso siguiente, **empaqueta** uno o más de estos servicios. La sesión suelta no necesita pack: se cobra esa clase al precio de drop-in.

**Qué ve el socio:** en la app no hay un menú “Servicios”. Ve el servicio dentro de un pack, como clase en el calendario, o como clase suelta para pagar.

**Captura:** `web-servicios-alta.png` — lista (repetir).  
**Dónde:** **+ Nuevo**, tipo **Acceso libre**.  
**Qué se ve:** alta: tipo, nombre, descripción, imagen. No pide drop-in porque es libre.

**Captura:** `web-servicios-editar.png` — lista (repetir).  
**Dónde:** lápiz de Funcional.  
**Qué se ve:** tipo ya fijo (por sesiones), foto, precio drop-in, Activo.

---

## 07. Crear packs

**Pantalla:** Admin → **Packs**.

El pack es la **oferta comercial**: un precio y los servicios que incluye.

Adentro puede ir **un** servicio o **varios**. En **Componentes** elegís el servicio y, si es por sesiones, la cantidad de créditos. **+ Agregar servicio** suma otro (por ejemplo Gym acceso libre + Funcional con 10 créditos). El tipo del pack se calcula solo (**Mixto** si hay libre y sesiones). Un solo cobro; el socio recibe las dos cosas.

Cómo se cobra el pack (**Periodo de facturación**):

- **Mensual:** se renueva. Los créditos vencen con el mes del contrato. El débito automático aplica a este tipo.
- **Único:** bloque de créditos o combo puntual. Podés ponerle **vencimiento de créditos**.

La **sesión suelta** no se arma acá: se cobra en Caja o en la app, sobre un servicio por sesiones que ya exista. Un pack que ya se vendió no se borra: se da de baja (deja de venderse).

**Qué ve el socio:** App → **Tienda** → Packs (el combo, no los servicios sueltos). En Inicio, si ya lo compró: pack, vencimiento y créditos. Sin pack, Inicio lo manda a la Tienda.

**Captura:** `web-packs-lista.png` — lista (repetir).  
**Dónde:** Packs.  
**Qué se ve:** **Gym + Funcional**, Mixto, $60.000, Mensual, 2 componentes.

**Captura:** `web-packs-editar.png` — lista (repetir).  
**Dónde:** lápiz del mixto.  
**Qué se ve:** nombre, foto (la de Tienda), precio, periodo Mensual, inicio de Componentes. El tipo Mixto es calculado.

**Captura:** `web-packs-componentes.png` — lista (repetir).  
**Dónde:** editar el mixto, scrolleado a Componentes.  
**Qué se ve:** Funcional (por sesiones) **10 créditos** + Gym (acceso libre) + Agregar servicio. Un pack, dos derechos.

**Captura:** `app-inicio-sin-pack.png` — falta.  
**Dónde:** App → Inicio, socio **sin** pack vigente.  
**Qué se ve:** «No tenés packs vigentes hoy. Mirá la Tienda para contratar» y los atajos. Contraste con el Inicio con pack.

---

## 08. Agendar sesiones

**Pantalla:** Admin → **Sesiones**. Solo aplica a servicios **por sesiones** (en la demo: Funcional). El acceso libre no se agenda.

Hay dos pestañas:

- **Calendario:** la semana. Cada bloque es una clase (hora, servicio, cupo ocupado/total, profesor si hay). Al abrir un bloque: **Datos** (horario, cupo, profesor, **Ampliar cupo**, **Cancelar sesión**), **Roster** (quién reservó; reservar a alguien con su crédito) y **Lista de espera**.
- **Recurrencias:** la regla que genera esas clases (días, hora, rango, cupo). **Desactivar** cancela las clases futuras de esa regla y devuelve los créditos.

**+ Nueva** abre el alta. Tipo:

- **Puntual:** una sola clase (inicio, fin, cupo).
- **Recurrente:** días de la semana, hora, duración, desde/hasta (hasta 6 meses), cupo. Genera las sesiones del calendario.

El socio **no** crea sesiones. Reserva un lugar en las que vos publicaste. Reservar implica pagar: crédito del pack, o drop-in. Ampliar el cupo de una clase llena le da el lugar al primero de la lista de espera.

**Qué ve el socio:** App → **Sesiones** (calendario del mes). Día con clases → tarjeta. Con crédito: **Reservar**. Sin crédito y con drop-in: **Al carrito**. Llena: **Unirme a la lista**. **Mis clases:** sus reservas y su puesto en las listas de espera, con **Cancelar reserva** o **Salir de la lista**.

**Captura:** `web-sesiones-calendario.png` — lista (repetir).  
**Dónde:** Sesiones → Calendario, semana con Funcional.  
**Qué se ve:** lun/mié/vie 08:00, cupo (1/10, 4/10).

**Captura:** `web-sesiones-recurrencias.png` — lista (repetir).  
**Dónde:** pestaña Recurrencias.  
**Qué se ve:** regla Funcional, L X V, 08:00, cupo 10, sesiones generadas, Activa.

**Captura:** `web-sesiones-alta.png` — lista (repetir).  
**Dónde:** + Nueva, tipo **Puntual**.  
**Qué se ve:** una clase suelta (servicio, inicio, fin, cupo).

**Captura:** `web-sesiones-recurrencia-alta.png` — lista (repetir).  
**Dónde:** + Nueva, tipo **Recurrente**.  
**Qué se ve:** días, hora, duración, rango, cupo, Crear recurrencia.

**Captura:** `app-sesiones-calendario.png` — lista.  
**Dónde:** App → Sesiones → Calendario.  
**Qué se ve:** el mes; los puntos son días con clase. Contraste del calendario web.

**Captura:** `app-sesiones-dia.png` — lista.  
**Dónde:** un día con clase libre.  
**Qué se ve:** Funcional, cupo, **Reservar** (tiene crédito del pack).

**Captura:** `app-sesiones-dia-reservada.png` — lista.  
**Dónde:** un día ya tomado.  
**Qué se ve:** la misma tarjeta, botón **Reservada**.

**Captura:** `app-mis-clases.png` — lista.  
**Dónde:** Sesiones → Mis clases.  
**Qué se ve:** las reservas del socio y **Cancelar reserva**.

---

## 09. Crear personal (staff)

**Pantallas:** Admin → **Roles y permisos**, después **Staff**.

Staff es el equipo: dueño, recepción, profesor. Cada uno entra al **panel** con su cuenta Faciliter. Un usuario puede tener varios roles.

El socio **no** es un rol de staff. Si la misma persona es profesor y socio, son **dos perfiles** con la misma cuenta (en la app elige cuál en **Tus gyms**).

### Roles

El rol **Admin** viene **de sistema**: no se edita ni se elimina (en la lista solo se puede ver). Es el que usa el dueño al arrancar.

**Entrenador** también viene de entrada, pero **sí se le pueden cambiar los permisos** y **sí se puede eliminar**. En la demo: ve afiliados y sesiones; no opera Caja.

**+ Nuevo rol** arma un rol propio (recepción, etc.) tildando permisos del catálogo.

Orden:

1. Dejá Admin como está. Ajustá Entrenador o creá un rol si hace falta (qué puede hacer: caja, puerta, catálogo…).
2. Alta de staff: mail, nombre, contraseña inicial (opcional) y roles.

### Staff

**+ Nuevo:** datos + roles iniciales. Si no ponés contraseña, la persona entra con `ChangeMe123!` y la cambia después; si ya tenía cuenta Faciliter, sigue con la suya. En la fila: editar ficha, asignar roles y **carpeta** (notas y archivos del staff).

**Qué ve el socio:** nada de Staff ni de roles. En la sesión puede figurar el nombre del profesor.

**Captura:** `web-roles-lista.png` — lista (repetir).  
**Dónde:** Roles y permisos.  
**Qué se ve:** Admin (Sistema, solo ver) y Entrenador (se edita y se puede eliminar).

**Captura:** `web-roles-flags.png` — lista (repetir).  
**Dónde:** lápiz de Entrenador.  
**Qué se ve:** permisos tildados; **Operar caja del día** no.

**Captura:** `web-roles-alta.png` — lista (repetir).  
**Dónde:** + Nuevo rol.  
**Qué se ve:** nombre + catálogo de permisos (vacío).

**Captura:** `web-staff-lista.png` — lista (repetir).  
**Dónde:** Staff.  
**Qué se ve:** el admin de prueba, rol Admin, Activo.

**Captura:** `web-staff-alta.png` — lista (repetir).  
**Dónde:** + Nuevo.  
**Qué se ve:** nombre, mail, contraseña inicial (opcional), foto, roles iniciales.

**Captura:** `web-staff-editar.png` — lista (repetir).  
**Dónde:** lápiz de un staff.  
**Qué se ve:** ficha (nombre, mail, foto). Los roles van en otro modal.

**Captura:** `web-staff-roles.png` — lista (repetir).  
**Dónde:** asignar roles al staff.  
**Qué se ve:** Admin / Entrenador. Se puede tener más de uno.

---

## 10. Crear un afiliado

**Pantalla:** Admin → **Afiliados** → **+ Nuevo**.

Alta: nombre, mail, contraseña inicial (opcional), teléfono y documento (opcionales), foto. Con ese mail entra a la **app**. Si dejás la contraseña vacía, entra con `ChangeMe123!` y la app le avisa que la cambie. Si ya tenía cuenta Faciliter (por otro local), sigue con la suya.

¿Venís de otro sistema? **Importar** carga todos los socios de una planilla (ver Módulos → Importar afiliados).

Todavía puede no tener pack: lo cobrás en Caja o él compra en la Tienda. El débito automático se gestiona en Caja (la ficha tiene el atajo).

Estados: **Activo / Suspendido / Inactivo**. Suspender corta el acceso; no es borrar la cuenta.

**Estado de cuenta** (otro ícono): contratos, acceso libre, créditos, deuda y próximas reservas. Desde ahí se puede **cancelar** un contrato (pide escribir CANCELAR; no devuelve plata). Es la contrapantalla de Inicio en la app.

Al contratar un pack se emite la **credencial de acceso** (para la puerta con QR). En el panel: PENDING hasta que el socio la acepta; ACCEPTED cuando ya está en el celular. El socio lo hace en App → **Acceso** → Credenciales → **Aceptar**.

**Re-emitir** (celular nuevo, wallet reiniciada o falló la emisión): genera una oferta nueva del **contrato vigente hoy**. No cobra ni crea otro mes. El socio vuelve a Aceptar.

**Qué ve el socio:** su Inicio, no el padrón. No ve a otros afiliados.

**Captura:** `web-afiliados-lista.png` — lista (repetir).  
**Dónde:** Afiliados.  
**Qué se ve:** Socio Gym de Prueba, Activo.

**Captura:** `web-afiliados-alta.png` — lista (repetir).  
**Dónde:** + Nuevo.  
**Qué se ve:** alta rápida, con la contraseña inicial opcional. Sin DNI real de un cliente.

**Captura:** `web-afiliados-ficha.png` — lista (repetir).  
**Dónde:** lápiz, datos.  
**Qué se ve:** ficha (nombre, mail, foto, estado Activo). El estado de cuenta es el otro ícono.

**Captura:** `web-afiliados-ficha-al-dia.png` — lista (repetir).  
**Dónde:** estado de cuenta, socio con pack.  
**Qué se ve:** Gym + Funcional, al día, sesiones disponibles, reservas con crédito y drop-in. Contraste del Inicio en la app.

**Captura:** `web-afiliados-credencial.png` — lista (repetir).  
**Dónde:** Afiliados → credencial del socio, **ACCEPTED**.  
**Qué se ve:** pack Gym + Funcional, emitida. El staff no “acepta” acá: emite (o re-emite). El socio acepta en la app.

**Captura:** `web-afiliados-credencial-pending.png` — lista (repetir).  
**Dónde:** el mismo modal, **PENDING**.  
**Qué se ve:** la oferta ya salió; falta que el socio toque Aceptar.

**Captura:** `app-acceso-aceptar.png` — lista.  
**Dónde:** App → Acceso → Credenciales, oferta pendiente.  
**Qué se ve:** **Gym + Funcional** y **Aceptar**. Contraste de PENDING.

**Captura:** `app-acceso-credencial.png` — lista.  
**Dónde:** después de Aceptar, “En este celular”.  
**Qué se ve:** la credencial guardada en el teléfono.

---

## 11. Cobrar (web) y que el socio pague en la app

Hay **dos caminos** (web o app) para lo mismo: un pack o una sesión suelta.

### Desde la web (mostrador)

**Pantalla:** Admin → **Caja** → pestaña **Cobro**.

1. Buscás al afiliado.
2. En **Catálogo** elegís pestaña **Packs** o **Servicios** (clases sueltas de los próximos días) y sumás al carrito con +.
3. Elegís el medio:
   - **Efectivo:** **Cobrar en efectivo**. Suma al cierre del día y queda el comprobante.
   - **Mercado Pago:** **Generar link MP**. Aparece un QR y el link (**Copiar**, **Abrir**): el socio paga desde su celular y la pantalla pasa sola a **Aprobado**. Un solo link por todo el carrito.
4. Si cobraste un pack, queda activo. Si cobraste una clase suelta, queda la reserva.

**Débito automático:** con Mercado Pago y **un** pack mensual en el carrito podés tildar «Autorizar cobro mensual de este pack». En vez de un pago suelto se genera un **link de débito**: el socio lo abre, autoriza con su tarjeta en Mercado Pago y queda suscripto. Faciliter no ve ni guarda la tarjeta. El seguimiento está en la pestaña **Débitos** (Módulos → Caja).

**Cierre:** Admin → **Cierre**: totales **de ese día** y arqueo de efectivo.  
**Reportes:** movimientos de un rango (no es el mostrador).

### Desde la app (el socio)

1. **Tienda** → pestaña Packs (la oferta) o **Sesiones** (clase suelta) → sumar al carrito.
2. **Carrito** → **Pagar con Mercado Pago**: QR o link para pagar.
3. Cuando MP aprueba, el pack o la reserva aparecen en Inicio / Mis clases.
4. **Historial** (menú ⋮ de Tienda o Sesiones): sus pagos. **Ver comprobante** abre el detalle, con **Compartir** y **Solicitar devolución**.

Si el local no conectó Mercado Pago, la app avisa que el pago online no está disponible.

Faciliter no se queda la plata: MP es tuyo; el efectivo lo registrás vos.

**Qué ve el socio:** no ve Caja. Ve Tienda, el carrito y, si ya pagó, Inicio al día. Después de un cobro en el mostrador, el Inicio se actualiza **sin** que toque el celular.

**Captura:** `web-caja-afiliado.png` — lista (repetir).  
**Dónde:** Caja, socio elegido, catálogo Packs, carrito vacío, efectivo.  
**Qué se ve:** los pasos 1–2, antes de sumar ítems.

**Captura:** `web-caja-carrito-dropin.png` — lista (repetir).  
**Dónde:** Caja, pestaña Servicios, dos clases Funcional en el carrito.  
**Qué se ve:** cobro de **sesión suelta** (sin pack). Contraste con el carrito del pack.

**Captura:** `web-caja-link-mp.png` — falta.  
**Dónde:** Caja, después de **Generar link MP** (cuenta MP de prueba).  
**Qué se ve:** el QR, el link recortado y **Copiar** / **Abrir**, esperando el pago.

**Captura:** `web-reportes-movimientos.png` — lista (repetir).  
**Dónde:** Reportes, rango con al menos un cobro.  
**Qué se ve:** el cobro asentado. Caja no es el historial: los cobros se ven acá.

**Captura:** `app-tienda-sesiones.png` — lista.  
**Dónde:** App → Tienda → Sesiones.  
**Qué se ve:** drop-in (una ya **Comprada**, otra disponible). Contrapantalla del carrito de clases sueltas.

**Captura:** `app-carrito.png` — lista.  
**Dónde:** App, carrito con el pack, **Pagar con Mercado Pago**.  
**Qué se ve:** contrapantalla del carrito de Caja.

**Captura:** `app-historial.png` — lista.  
**Dónde:** App → Historial.  
**Qué se ve:** pagos y devoluciones (código GB-…, monto, medio, **Pago** / **Devolución**) y **Ver comprobante**.

---

# Parte 3 — Módulos

Cada módulo: qué hace en el panel y qué ve el socio.

## Config

Operación del local, sistema de puerta y Mercado Pago. Sin MP conectado no hay cobro online ni débito automático; el efectivo en Caja sigue.

**Captura:** `web-config-desconectado-mp.png` — falta.  
**Dónde:** Config, Mercado Pago sin conectar.  
**Qué se ve:** el bloque Mercado Pago sin conectar, con el botón **Conectar Mercado Pago** y **Conexión manual (avanzado)** plegada.

## Servicios

El catálogo de lo que ofrece el local. Un servicio **inactivo** no se vende y no entra en un pack nuevo.

## Packs

La oferta que se cobra. Un pack puede juntar acceso libre y créditos. Si lo cancelás, el socio pierde **todo** el combo, no un servicio suelto. Un pack ya vendido no se borra: se da de baja.

## Sesiones

Calendario y recurrencias. En cada clase: **Datos** (horario, cupo, profesor, cancelar), **Roster** (quién reservó y con qué pagó; reservar a alguien con su crédito) y **Lista de espera** (orden de la fila; agregar o quitar).

**Cancelar una sesión** avisa a los que reservaron y les devuelve el crédito. **Ampliar cupo** promueve a la lista de espera.

**Captura:** `web-sesiones-roster.png` — falta.  
**Dónde:** una sesión con 1–2 reservas, pestaña Roster.  
**Qué se ve:** quién reservó esa clase (nombres de prueba) y con qué pagó.

## Afiliados

El padrón. Desde la fila: ficha, estado de cuenta, credencial de acceso, **carpeta** y borrar (solo si no tiene historial). Si el socio está suspendido, de baja o sin pack vigente, en puerta no entra.

## Carpeta y documentos

Cada afiliado y cada staff tiene una **carpeta** (ícono en la grilla): **notas** (texto con formato) y **archivos** (PDF o imagen, hasta 5 MB). Las **etiquetas** las define el gym (rutina, apto médico, contrato…). Sirve, por ejemplo, para dejarle la rutina en PDF.

La foto de la ficha no es la carpeta: es la foto de perfil.

**Qué ve el socio:** App → Inicio → **Documentos**, o en la web del gym **Mi portal → Documentos**: sus notas y archivos, solo lectura. En la web, las notas y las imágenes se abren ahí mismo y el PDF se descarga.

**Captura:** `web-carpeta.png` — falta.  
**Dónde:** Afiliados → ícono Carpeta de un socio con una nota y un PDF.  
**Qué se ve:** etiqueta, nota, archivo y el contenido de la carpeta.

**Captura:** `app-documentos.png` — falta.  
**Dónde:** App → Inicio → Documentos, el mismo socio.  
**Qué se ve:** la nota y el PDF con su fecha.

## Importar afiliados

Para traer socios de otro sistema: Afiliados → **Importar**. Necesita permiso de importación (peligroso) además de afiliados.

1. **Fichas de afiliados:** subís un Excel o CSV, indicás qué columna es cada dato (mail y nombre obligatorios; apellido, DNI, teléfono y estado opcionales), **Revisar** muestra qué entra y qué no, e **Importar** pide escribir CONFIRMAR. Los nuevos entran con `ChangeMe123!` y la cambian después; si ya tenían cuenta Faciliter, siguen con la suya. Un socio que ya está en el local se omite.
2. **Fotos y carpeta:** elegís una carpeta de la PC o un zip con `fotos/{dni o mail}.jpg` y `carpeta/{dni o mail}/…`.
3. **Números del aparato ZKTeco** (solo si el local usa ZKTeco): planilla con DNI o mail y el número que cada socio ya tiene en el aparato.

Packs, pagos viejos y deudas no se migran: se arman en Faciliter. Al final, **Últimas importaciones** muestra el historial.

**Captura:** `web-importar.png` — falta.  
**Dónde:** Afiliados → Importar, paso 1 con una planilla de prueba ya revisada.  
**Qué se ve:** el mapeo de columnas y los contadores de la revisión.

## Staff y roles

Quién entra al **panel** y qué puede hacer. Un profesor sin permiso de Caja no ve Caja. El rol Admin no se edita ni se borra. El staff también tiene carpeta.

## Caja

El mostrador, con dos pestañas:

- **Cobro:** afiliado + catálogo + carrito, en efectivo o con link de Mercado Pago (ver Primeros pasos → Cobrar).
- **Débitos:** los débitos automáticos de packs mensuales. La cola se filtra en **Pendiente / link**, **Reintentando**, **Fallidos** y **Todos**. Al elegir un socio ves el estado, el próximo cobro y el monto. Si falta que autorice: **Abrir checkout MP** o **Copiar link** para mandárselo. También podés cambiar el **próximo pack**, **Regenerar link** o **Dar de baja**. Mercado Pago solo deja autorizar a la cuenta con el **mail de la cuenta Mercado Pago del socio** (vacío = el mail del afiliado): si el socio entra a MP con otro mail, cargalo ahí (o al tildar el débito en el cobro) y regenerá el link.

Mercado Pago cobra solo cada mes y reintenta si falla; Faciliter registra cada cobro aprobado. Dar de baja corta los cobros que vienen; el mes ya pago sigue vigente. El asistente puede listar débitos, pero no cobra ni los toca.

**Captura:** `web-caja-debitos.png` — rehacer.  
**Dónde:** Caja → Débitos, un socio con débito pendiente de autorizar (datos de prueba).  
**Por qué rehacer:** la foto actual muestra un formulario de tarjeta que ya no existe; ahora es un link.  
**Qué se ve:** la cola, el estado del socio y **Abrir checkout MP** / **Copiar link**.

## Vencimientos

Operación → **Vencimientos**: la cola de packs mensuales **por vencer** (próximos días) o **en tolerancia** (vencidos pero todavía dentro de los días de gracia). Filtros por plazo, tolerancia, **Débito** o **A mano**. Por cada socio: pack, vencimiento, plazo y cómo paga, con atajos a **Ficha**, **Caja** y **Débitos**.

Es para que recepción llame o cobre a tiempo. Los avisos por mail al socio los manda el sistema según **Avisos** (pack por vencer, pack vencido).

**Captura:** `web-vencimientos.png` — falta.  
**Dónde:** Vencimientos con 2–3 socios de prueba (uno con débito, uno a mano).  
**Qué se ve:** filtros, contadores y la tabla con Plazo y Cómo paga.

## Cierre

Solo mueve lo de **ese** día de negocio. Si cobraste otro día, acá aparece $0.

El arqueo cuenta solo **efectivo**: lo esperado en el cajón es cobros en efectivo − devoluciones en efectivo − gastos en efectivo. Transferencias, Mercado Pago y tarjeta no entran: se ven aparte como **digital esperado** (cobros − devoluciones − gastos digitales), junto con el neto del día. Ese número es informativo; no se cierra contra nada.

**Cerrar cierre** guarda el efectivo declarado y una nota, una sola vez por día. Desde la tabla de movimientos se puede **Devolver** un cobro (con permiso) y ver el comprobante.

**Captura:** `web-cierre-arqueo.png` — falta.  
**Dónde:** Cierre, elegí en el selector el día de un movimiento (o cobrá algo ese día).  
**Qué se ve:** ingresos, efectivo esperado, digital esperado y la lista de movimientos.

**Qué ve el socio:** nada. El cierre es interno.

## Gastos

Lo que paga el gym: alquiler, luz, sueldos, compra de mercadería. Cada gasto lleva fecha, monto, si es **Fijo** o **Variable**, el medio de pago, una **etiqueta** (las define el gym; si ya tienen gastos se archivan, no se borran) y hasta **5 comprobantes** (PDF o imagen).

Solo los gastos en efectivo restan en el **Cierre**. Si el día ya se cerró, esos gastos en efectivo no se editan ni se borran (sí se les pueden sumar comprobantes).

**Captura:** `web-gastos.png` — falta.  
**Dónde:** Gastos con 3–4 gastos de prueba de distintas etiquetas.  
**Qué se ve:** totales (fijos, variables, en efectivo), el desglose por etiqueta y la tabla.

## Solicitudes de devolución

El socio puede pedir la devolución de un pago desde la app (Historial → **Ver comprobante** → **Solicitar devolución**, con un motivo opcional). Al staff le llega a Operación → **Solicitudes de devolución**.

Ahí filtrás por estado (pendientes, ejecutadas, rechazadas), abrís la solicitud y la ejecutás con un motivo tipificado (pedido del afiliado, doble cobro, otro). Para ejecutar hay que escribir **DEVOLVER**. La devolución sale por el mismo medio del cobro y queda en Reportes y en el Historial del socio.

También se puede devolver un cobro sin solicitud, desde el Cierre.

**Captura:** `web-devoluciones.png` — falta.  
**Dónde:** Solicitudes de devolución, una pendiente de prueba abierta.  
**Qué se ve:** el modal con el motivo tipificado y **Ejecutar devolución**.

## Reportes

Rango de fechas, no el mostrador. Sirve para ver qué se cobró (pack, drop-in, medio, staff) y las devoluciones. Con permiso de gastos muestra también los gastos del período y el **resultado** (ingresos − devoluciones − gastos). Se puede filtrar por afiliado.

## Puerta

Operación → **Puerta**, con tres pestañas: **Verificar**, **Pase manual** e **Historial**. Las reglas de ingreso son las mismas con cualquier sistema: pack vigente, deuda dentro de la tolerancia, reserva si es una clase.

La puerta es **opcional** y tiene dos formas: **Kuatia** (QR con la app) o **ZKTeco** (aparato). Solo con Kuatia el socio necesita la app; con ZKTeco o sin control de acceso le alcanza con el portal web.

**Con QR (Kuatia, app Faciliter):** la pantalla Verificar muestra un QR. El socio lo escanea desde App → **Acceso** → Escanear, con su credencial ya aceptada, y el panel muestra **PERMITIDO** o **DENEGADO** con el motivo. Una tablet en la puerta con esta pantalla abierta alcanza: quien atiende ve el resultado y deja pasar. Si querés que un molinete se destrabe solo, coordinalo con nuestros técnicos.

**Con ZKTeco:** el socio se identifica en el aparato (huella, tarjeta o PIN), sin necesidad de la app. El número de cada persona se vincula en Afiliados / Staff → **Acceso ZKTeco**; si no hay vínculo, el aparato puede usar el DNI. Verificar muestra los últimos ingresos. La instalación depende del modelo del aparato: coordinala con nuestros técnicos antes de activarlo en Config.

**Pase manual:** el personal con permiso deja pasar a alguien que la regla no dejaría (deuda, olvidó el celular, cortesía), con un motivo. Queda en el historial.

**Historial:** cada intento con resultado, quién, motivo, canal (QR, ZKTeco o manual) y hora.

**Captura:** `web-puerta-verificar.png` — falta.  
**Dónde:** Puerta → Verificar justo después de que un socio de prueba escaneó (permitido).  
**Qué se ve:** el resultado **PERMITIDO** con el nombre del socio.

**Captura:** `web-puerta-historial.png` — falta.  
**Dónde:** Puerta → Historial con un permitido y un denegado de prueba.  
**Qué se ve:** resultado, quién, motivo legible y canal.

**Captura:** `app-acceso-escanear.png` — falta.  
**Dónde:** App → Acceso → Escanear (cámara abierta). Sin QR de un socio real.  
**Qué se ve:** la cámara y el texto para apuntar al QR del gym.

## Avisos

Dos lados de lo mismo:

- **Panel → Sistema → Avisos:** una tarjeta por evento (pago acreditado, reserva confirmada o cancelada, lugar en lista de espera, devolución, pack por vencer, pack vencido, débito no acreditado o fallido). Cada una se puede **apagar** y tiene asunto y texto editables, con variables como el nombre del socio o del gym.
- **App → Inicio → Avisos:** la bandeja del socio, con los nuevos arriba. En **Ajustes → Avisos → Correo por tipo** elige qué le llega también por mail. La bandeja de la app no se apaga.
- **Web del gym → Mi portal → Avisos:** la misma bandeja (el menú muestra cuántos hay sin leer) y, abajo, **Avisos por correo** con los mismos tildes que la app. Lo que lee en un lado queda leído en el otro.

No hay notificaciones push todavía: el aviso llega por mail y a la bandeja.

**Captura:** `web-avisos.png` — falta.  
**Dónde:** Sistema → Avisos, una tarjeta abierta (por ejemplo Pago acreditado).  
**Qué se ve:** evento activo, asunto, cuerpo con variables y Guardar.

**Captura:** `app-avisos.png` — falta.  
**Dónde:** App → Inicio → Avisos, con uno nuevo y uno leído.  
**Qué se ve:** la bandeja con Nuevos y Anteriores.

## Web del gym

Sistema → **Web del gym** arma la página pública de tu local (`{tu-local}.faciliter.xyz`) sin programar. Mientras no publiques nada, la web muestra el nombre del gym y los planes.

- **Portada:** título (10 a 80 caracteres), subtítulo opcional (hasta 200) e imagen de fondo opcional.
- **Sliders:** hasta 5, cada uno con 1 a 10 slides. Cada slide tiene título (hasta 60), texto (hasta 180), fondo y, si querés, un **botón**: a los planes, a reservar clases, a comprar un pack o a un link (https). En la web rotan solos cada 6 segundos; se agregan, quitan y reordenan desde el editor.
- **Imágenes:** JPG, PNG o WebP de al menos **1200 px de ancho**. Sumale una descripción corta (la leen quienes no ven la imagen) y elegí el **enfoque** para que no se corte lo importante.
- **Que se lea, en los dos temas:** cada visitante ve tu web en tema claro u oscuro (el de su navegador o el que elija). La imagen es la misma, pero en el recuadro **Tema claro / Tema oscuro** elegís para cada tema **texto claro u oscuro**, la **capa** sobre la imagen (suave, media o fuerte) y, si querés, otro **color para el título**. «Copiar del otro tema» copia esos colores. Si el título no se va a leer en algún tema, el editor avisa en rojo, marca esa pestaña con «!» y no deja publicar hasta que lo cambies.
- A la derecha está la **vista previa** de la portada y del slide que estás editando, en el tema que elijas arriba de ella. **Publicar** lo deja visible al instante. **Volver a la vidriera por defecto** borra todo, imágenes incluidas.

Debajo de los sliders la web siempre muestra los **planes**. Si un pack del botón se desactiva, ese botón deja de aparecer. Si el gym no tiene Mercado Pago, «Comprar un pack» lleva a los planes.

**Captura:** `web-web-del-gym.png` — falta.  
**Dónde:** Sistema → Web del gym, con una portada con imagen y un slider con dos slides.  
**Qué se ve:** el formulario a la izquierda y la vista previa a la derecha.

## Auditoría

Sistema → **Auditoría**: quién hizo qué y cuándo (cobros, devoluciones, pases manuales, cambios de roles, altas, importaciones…). Se busca por acción y cada fila abre el detalle de antes y después. Lo que se hace desde el asistente también queda acá.

## App del socio (recorrido)

Pestañas: **Inicio | Acceso | Ajustes**.

- **Inicio:** packs vigentes (o el aviso de que no tiene), deuda si hay, atajos **Sesiones**, **Tienda**, **Documentos** y **Avisos**, y sus próximas clases.
- **Sesiones:** calendario del mes, clases del día, **Mis clases** y listas de espera.
- **Tienda:** Packs y Sesiones (clase suelta), carrito, pago con Mercado Pago e Historial.
- **Acceso:** **Escanear** (el QR de la puerta o una credencial) y **Credenciales** (aceptar las pendientes y ver las guardadas).
- **Ajustes:** cambiar de gym, cambiar o crear contraseña, avisos por mail, tema, cerrar sesión y **eliminar cuenta**.

Si entra con la contraseña inicial (`ChangeMe123!`), Ajustes le muestra un aviso para cambiarla.

El staff usa la misma app: al elegir su perfil en **Tus gyms** ve Sesiones, Caja (si tiene permiso) y Documentos.

**Captura:** `app-ajustes.png` — falta.  
**Dónde:** App → Ajustes de un socio.  
**Qué se ve:** cuenta, Cambiar gym, contraseña, Avisos, tema, Cerrar sesión y Eliminar cuenta.

## Portal web del socio

En la web del gym (`{slug}.faciliter.xyz`), el socio entra con su cuenta Faciliter y va a **Mi portal** (`/portal`). Es lo mismo que la app, sin instalar nada:

- **Inicio:** saludo, próximas clases, planes vigentes y, si hay, «Tenés n avisos nuevos».
- **Clases:** calendario del mes. Con créditos reserva; sin créditos, la clase suelta va al carrito; si está llena, lista de espera.
- **Mis clases:** próximas reservas y listas de espera (cancelar o salir), y las pasadas.
- **Tienda** y **Carrito:** packs y clases sueltas en un solo pago de Mercado Pago (solo si el gym conectó Mercado Pago).
- **Historial:** todos sus comprobantes (app, web y caja) y **Solicitar devolución** por línea.
- **Documentos:** su carpeta, solo lectura.
- **Avisos:** su bandeja y qué le llega por mail.

Datos, contraseña y cerrar sesión están en **Mi cuenta** (el avatar de arriba a la derecha). La credencial y el escaneo en la puerta siguen siendo de la app.

**¿El socio tiene que bajar la app?** Solo si la puerta usa **Kuatia** (QR con la credencial del celular). Con **ZKTeco** o sin control de acceso, le alcanza con el portal; la app es una comodidad.

**Captura:** `web-portal-inicio.png` — falta.  
**Dónde:** `{slug}.faciliter.xyz/portal` con un socio de prueba con pack, una reserva y un aviso sin leer.  
**Qué se ve:** el menú del portal (Avisos con el contador), «Tenés 1 aviso nuevo», próximas clases y planes vigentes.

**Captura:** `web-portal-avisos.png` — falta.  
**Dónde:** Mi portal → Avisos, con uno nuevo y uno leído.  
**Qué se ve:** Nuevos, Anteriores y Avisos por correo con los tildes.

## Asistente

En el Admin, la burbuja consulta **datos del gym** (puede equivocarse; no cobra). También puede **proponer** altas y ediciones (un gasto, un afiliado, una clase, un pack…): muestra una tarjeta con el detalle y no hace nada hasta que tocás **Confirmar** (vence a los 2 minutos; lo peligroso pide escribir CONFIRMAR). Cobros, devoluciones, débito, puerta, configuración y borrados se hacen en sus pantallas, por seguridad. En la landing pública, la misma burbuja solo explica el producto.

**Captura:** `web-asistente-propuesta.png` — falta.  
**Dónde:** Admin, drawer abierto, pedido tipo “cargá un gasto de 15000 de luz por transferencia”.  
**Qué se ve:** la tarjeta de propuesta con Confirmar / Cancelar y el aviso de que puede equivocarse.

---

# Parte 4 — Tu cuenta y el plan

## Cuenta Faciliter

Cada persona tiene **una** cuenta Faciliter: su mail. Con esa cuenta entra a la app y al panel de cada local donde la cargaron, como socio, como staff o las dos cosas.

- **Entrar:** mail y contraseña, o **Continuar con Google** (en la app también Apple, si está disponible).
- **Varios locales:** en la app aparece **Tus gyms** para elegir. Después se cambia en Ajustes → **Cambiar gym**. En el panel, cada local tiene su URL.
- **Contraseña temporal:** quien fue dado de alta sin contraseña (o importado) entra con `ChangeMe123!`. La app le avisa en Ajustes hasta que la cambie.
- **Cambiar contraseña:** App → Ajustes → **Cambiar contraseña**, o en el panel tocando tu avatar (Mi cuenta). Si la cuenta entra solo con Google o Apple, aparece **Crear contraseña**. Cambiarla cierra la sesión en los otros dispositivos.

No hay registro desde la app: el socio aparece cuando el local lo da de alta. Todavía no hay «olvidé mi contraseña» y el staff no ve ni reinicia contraseñas: quien la pierde puede entrar con Google o Apple usando el mismo mail, o escribir a soporte.

## Contratar Faciliter

Desde faciliter.xyz:

1. En la landing elegís un plan y tocás **Contratar** (también podés **agendar una reunión**).
2. Entrás o creás tu cuenta Faciliter (mail y contraseña o Google).
3. En **Tu gym en Faciliter** elegís el plan, el nombre del gym y el **subdominio** (la dirección de tu panel).
4. **Mail de tu cuenta de Mercado Pago**: viene con el mail de tu cuenta Faciliter. Si en Mercado Pago entrás con otro mail, cambialo: Mercado Pago solo deja autorizar a la cuenta con ese mail.
5. **Continuar a Mercado Pago**: autorizás el débito mensual del plan.

Si el plan tiene **30 días de prueba**, el gym se crea apenas autorizás y el primer cobro es al terminar la prueba. La prueba es una vez por persona y una vez por gym. Sin prueba, el gym se crea con el primer cobro aprobado. Si el plan no ofrece prueba, lo avisa debajo del plan elegido y el primer mes se cobra al autorizar.

Después entrás a tu panel (`{subdominio}.faciliter.xyz`) y seguís con **Primeros pasos**.

**Captura:** `web-empezar.png` — falta.  
**Dónde:** faciliter.xyz/empezar, logueado, con un plan elegido.  
**Qué se ve:** plan, nombre del gym, subdominio con la dirección resultante, mail de la cuenta de Mercado Pago y **Continuar a Mercado Pago**.

## Mi cuenta

En faciliter.xyz/cuenta:

- Tus datos, cambiar o crear contraseña y cerrar sesión.
- **Mis tenants:** tus gyms, con **Abrir panel** y **+ Nuevo tenant** para contratar otro.
- **Plan Faciliter** del gym elegido.
- **Eliminar cuenta.**

En un local (`{slug}.faciliter.xyz`), tu avatar (arriba, en el panel o en la web del gym) abre **Mi cuenta** en `/cuenta`, la misma para socios y staff: tus datos, la contraseña, cerrar sesión y los accesos al portal de socio o al panel.

**Captura:** `web-cuenta.png` — falta.  
**Dónde:** faciliter.xyz/cuenta con un gym de prueba.  
**Qué se ve:** Mi cuenta, Mis tenants con Abrir panel y el Plan Faciliter.

## Plan / Uso

Panel → Sistema → **Plan / Uso**: el plan Faciliter de tu gym (pack, estado y qué incluye). Estados: **Prueba**, **Vigente**, **Vencido** o **Sin pack Faciliter**.

- Si contrataste en faciliter.xyz, se renueva solo con el débito de Mercado Pago que autorizaste.
- Si te dio de alta Faciliter, se renueva pagando con Faciliter.
- Para **cambiar de plan** o **dar de baja el débito**, escribinos (ver Soporte).

Sin plan vigente hay **3 días de gracia**. Después el gym queda **limitado**: el staff entra pero solo ve Plan / Uso, con un aviso para renovar. La app de los socios sigue funcionando.

**Captura:** `web-plan.png` — falta.  
**Dónde:** Sistema → Plan / Uso de un gym en prueba o vigente.  
**Qué se ve:** pack, estado con fecha, qué incluye y cómo se renueva.

## Eliminar la cuenta

Desde la app (Ajustes → **Eliminar cuenta**) o desde faciliter.xyz/cuenta. Hay que escribir **ELIMINAR**. Es inmediato y no se deshace:

- Se cancelan sus débitos automáticos y reservas futuras en todos los locales, y sale de las listas de espera. Lo que quede de packs vigentes se pierde.
- Si era staff, queda inactivo.
- La cuenta se anonimiza. Cada local **conserva** la ficha y el historial (pagos, comprobantes) porque es su registro comercial.
- Si es dueña de un gym activo, primero tiene que dar de baja o transferir el gym.

El mismo mail después crea una cuenta nueva y vacía.

## Soporte

Problemas, cobros raros o dudas que no están en esta guía: **faciliterapps@gmail.com**. El asistente del panel ayuda con el uso, pero no es mesa de ayuda.

---

## Lista corta para ir disparando fotos

Faltan o hay que rehacer (un gym de prueba, datos de prueba):

1. `web-login-staff.png` *(rehacer: sin atajos demo, con Google)* + `app-login.png` *(rehacer: cuenta Faciliter)* + `app-gyms.png`
2. `web-config.png` *(rehacer: con Puerta)* + `web-config-desconectado-mp.png`
3. `app-inicio-sin-pack.png`
4. `web-caja-link-mp.png` + `web-caja-debitos.png` *(rehacer: link, no tarjeta)*
5. `web-sesiones-roster.png`
6. `web-carpeta.png` + `app-documentos.png`
7. `web-importar.png`
8. `web-vencimientos.png`
9. `web-cierre-arqueo.png`
10. `web-gastos.png`
11. `web-devoluciones.png`
12. `web-puerta-verificar.png` + `web-puerta-historial.png` + `app-acceso-escanear.png`
13. `web-avisos.png` + `app-avisos.png`
14. `app-ajustes.png`
15. `web-asistente-propuesta.png`
16. `web-empezar.png` + `web-cuenta.png` + `web-plan.png`
17. `web-portal-inicio.png` + `web-portal-avisos.png`
18. `web-web-del-gym.png`

Repetir (ya publicadas; reemplazar el archivo con el mismo nombre). Las del panel tienen el menú viejo (sin Vencimientos, Gastos, Avisos ni Plan / Uso) y la «N» de Next abajo a la izquierda:

19. Todas las `web-….png` marcadas **lista (repetir)**: Inicio, Servicios (lista, alta, editar), Packs (lista, editar, componentes), Sesiones (calendario, recurrencias, alta, recurrencia), Roles (lista, flags, alta), Staff (lista, alta, editar, roles), Afiliados (lista, alta, ficha, ficha al día, credencial, credencial pendiente), Caja (afiliado, carrito, carrito drop-in) y Reportes.
20. `app-inicio-con-pack.png`: le faltan los atajos Documentos y Avisos.

Las demás (app) están **listas** en `web/public/docs/`.
