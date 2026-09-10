# Backlog — Operaciones

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

Notas que estaban en `local/backlog-mejoras.md` (ops). El setup de desarrollo ya tiene READMEs por app; esto es pulido y go-to-market.

| Ítem | Estado | Notas |
|------|--------|--------|
| Documentación de setup local | Parcial | Hay README raíz + `api/` + `web/` + `mobile/`. Falta troubleshooting unificado y revisión |
| Variables de entorno unificadas | Parcial | `.env.example` por app; no hay uno en la raíz (a propósito del monorepo separado) |
| Guía de contribución (CONTRIBUTING, PR template) | Pendiente | |
| Deploy staging para piloto | Pendiente | Docker + DNS + SSL + seed |
| Onboarding de gym piloto | Pendiente | 1 gym real, capacitación, feedback |
| Legal: ToS + privacidad (Argentina) | Parcial | Páginas públicas borrador en `/legal/terminos` y `/legal/privacidad`. Falta texto revisado (AAIP / contrato) |
| Branding / identidad visual | Pendiente | Paleta y tipos ya en uso; falta logo/guideline |
| Pricing / planes SaaS | Parcial (P3) | Un plan en la landing, precio a convenir. Número cuando exista costo OpenRouter (P4). [producto.md](./producto.md) · [18](../18-prioridades-cierre-mvp.md) |
| Marketing landing | Hecho (P3) | Apex: copy de producto, burbuja del asistente (sesión anónima), un plan, SEO. |
| Docs de uso (web + app) | Pendiente | Apartado público tipo Kuatia, pero para usar Admin y app: módulos, primeros pasos, config. Diseño aparte; no es el C-producto. |
| Migración de datos (Excel + IA) | Prioridad baja (P5) | Importar socios/packs de otro sistema. **Después del piloto** si no bloquea. [18](../18-prioridades-cierre-mvp.md) |
| Soporte / onboarding de más gyms | Pendiente | |
| Deploy prod + CI/CD | Pendiente | Multi-stage, migraciones al deploy, secrets |

[Índice post-MVP](../99-backlog-post-mvp.md)
