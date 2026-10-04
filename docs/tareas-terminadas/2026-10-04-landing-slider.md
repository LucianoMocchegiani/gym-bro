# Landing Faciliter con slider y «Más información» en el asistente

**Fecha:** 2026-10-04
**Roadmap:** P3 — landing / pricing / SEO
**Commit:** `9eec410` — feat(web): landing con slider y Mas informacion en el asistente
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9eec410

## Resumen

La landing del apex quedó vieja y con demasiado texto. Ahora son cuatro bloques: hero, un slider que rota los temas del producto, planes y «Empezá a utilizar Faciliter Brain». El detalle lo da el asistente: cada slide tiene «Más información», que abre la burbuja y envía la pregunta.

## Cambios principales

- `LandingSlider` (cliente, sin librerías): Servicios, Cobros, App y portal del socio, Puerta (opcional: Kuatia o ZKTeco) y Asistente. Rota cada 6 s; pausa con hover o foco; flechas, puntos y swipe; respeta `prefers-reduced-motion`; los slides ocultos van `inert` y todos quedan en el HTML.
- `askAssistant(mensaje)` (`web/lib/assistant-ask.ts`): `CustomEvent` que escucha la burbuja pública; abre, carga la sesión y envía. El drawer guarda la conversación activa en un ref para no enviar a una conversación vieja.
- Se borraron `ProductPreviewCard` y el CSS de pilares, casos y previews.
- MCP `producto.md` / `puerta.md` y prompt público de `chat-api`: puerta opcional con dos formas, portal web y respuesta corta a «Quiero más información de …».

## Decisiones

- «Más información» envía el mensaje solo (no lo deja en el input).
- Si el servidor define `CHAT_PUBLIC_SYSTEM_PROMPT`, pisa el prompt por defecto: hay que actualizarlo a mano.

## Validación

- `tsc --noEmit` de la web pasa; eslint sin errores (dos warnings viejos en `AssistantDrawer`).
- Prueba manual pendiente: `local/en-testeo/landing-slider.md` (casos M9–M11 de `08`).

## Referencias

- `07` §17 (wireframe de la landing), `08` Sitio público, `web/README.md`.
- Commit: `9eec410` / https://github.com/LucianoMocchegiani/gym-bro/commit/9eec410
