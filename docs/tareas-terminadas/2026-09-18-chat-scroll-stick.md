# Chat: no empujar el scroll mientras pinta

**Fecha:** 2026-09-18
**Roadmap:** E9 / E10 asistente (C7 polish)
**Commit:** `9c6290f` — fix(chat): keep thread scroll when the user drags during stream
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9c6290f

## Resumen

Si el usuario arrastra el hilo mientras la IA escribe, el scroll se queda ahí. Solo sigue el final si está pegado al último mensaje (o al enviar uno nuevo).

## Cambios principales

- App: ListView cronológico + stick al gesto; el typewriter no fuerza el final
- Web: umbral más chico y rueda/swipe hacia arriba sueltan el ancla

## Validación

- Manual app: stream + drag hacia arriba (hot restart)
- Web: mismo criterio con rueda

## Referencias

- Commit: `9c6290f` / https://github.com/LucianoMocchegiani/gym-bro/commit/9c6290f
