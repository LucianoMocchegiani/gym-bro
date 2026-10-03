# Sesiones

Una **sesión** es una clase o turno con fecha, hora, cupo y (si aplica) profesor: pilates, funcional, lo que el local arme.

El afiliado reserva desde la app (con crédito del pack o comprando drop-in). En puerta, si entra para esa clase, el ingreso queda ligado a la sesión.

Pantalla Admin: **Sesiones** (`/dashboard/sesiones`), pestañas **Calendario** y **Recurrencias**. Cada clase tiene:

- **Datos:** horario, cupo, profesor, **Ampliar cupo** (promueve a la lista de espera) y **Cancelar sesión**.
- **Roster:** quién reservó y con qué pagó; reservar a alguien con su crédito.
- **Lista de espera:** orden de la fila; agregar o quitar.

**Cancelar una sesión** devuelve el crédito a los que reservaron (también la clase suelta), les manda el aviso de reserva cancelada y vacía la lista de espera. **Desactivar una recurrencia** cancela las sesiones futuras de esa serie y devuelve los créditos.

En la app el socio usa **Reservar**, **Al carrito** (clase suelta), **Unirme a la lista** y **Mis clases**. Cuándo sube alguien de la lista depende del modo de lista de espera en Config.

El asistente lista clases y cupo, y puede **proponer** crear o editar una clase, una serie semanal, reservar con crédito o anotar en la lista de espera (se hace solo si tocás Confirmar). En una serie, si no decís hasta qué fecha va, te lo pregunta; la tarjeta muestra cuántas clases salen y la primera y la última. **No cancela** sesiones ni cobra clases sueltas: eso es en esta pantalla o en Caja.

Hace falta permiso de sesiones.
