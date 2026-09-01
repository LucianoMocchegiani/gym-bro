# GymBro — Índice de documentación

Documentación **C-producto** (SRS operativo): visión, dominio, reglas, casos de uso, arquitectura, wireframes ASCII y pruebas manuales. Idioma: **español**. Nombre de producto: **GymBro** (provisorio).

## Formato de la documentación

| Elemento | Convención |
|----------|------------|
| Archivos | Markdown (`.md`), numerados por capa |
| Decisiones | Tablas “Decisión / Valor”; origen: sesiones de definición |
| Estados | `Cerrado` · `Borrador` · `Pendiente` |
| Casos de uso | Plantilla fija (ver abajo) |
| Wireframes | ASCII art en `07-wireframes-ascii.md` |
| Pruebas | Checklist manual (sin tests de código) en `08-…` |
| Post-MVP | Índice [99-backlog-post-mvp.md](./99-backlog-post-mvp.md) · detalle por módulo en [99-backlog-post-mvp/](./99-backlog-post-mvp/) |

### Plantilla de caso de uso

```text
CU-XXX Nombre
Actor
Precondiciones
Flujo principal
Flujos alternativos / errores
Postcondiciones
Reglas relacionadas
```

## Mapa de documentos

| Archivo | Contenido | Estado |
|---------|-----------|--------|
| [01-documento-maestro.md](./01-documento-maestro.md) | Visión, mercado, MVP, actores, roadmap | Cerrado (v1) |
| [02-glosario.md](./02-glosario.md) | Términos del dominio | Cerrado (v1) |
| [03-modelo-dominio.md](./03-modelo-dominio.md) | Entidades y relaciones | Cerrado (v1) |
| [04-reglas-de-negocio.md](./04-reglas-de-negocio.md) | Reglas por módulo | Cerrado (v1) |
| [05-casos-de-uso/](./05-casos-de-uso/) | CU por módulo | Cerrado (v1) |
| [06-arquitectura.md](./06-arquitectura.md) | Multi-tenant, adapters, pagos | Cerrado (v1) |
| [09-esquema-db.md](./09-esquema-db.md) | Tablas, enums, FKs y migraciones (Prisma/Postgres) | Viva |
| [07-wireframes-ascii.md](./07-wireframes-ascii.md) | Pantallas ASCII | Cerrado (v1) |
| [08-casos-prueba-manuales.md](./08-casos-prueba-manuales.md) | QA manual (vos + socio) | Cerrado (v1) |
| [10-metodo-definicion-producto.md](./10-metodo-definicion-producto.md) | Cómo repetir el proceso preguntas→docs (MVP y post-MVP) | Cerrado (v1) |
| [11-roadmap-mvp.md](./11-roadmap-mvp.md) | Épicas y tareas título para terminar el MVP | Borrador v1 |
| [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md) | Acceso Quark / OID4VCI+VP: issuer/verifier por gym, packs, wallet, offers remotos | Cerrado (diseño) |
| [13-setup-db-desde-cero.md](./13-setup-db-desde-cero.md) | Migraciones + seed al levantar de 0 / tras `down -v` | Viva |
| [14-auditoria-roadmap-vs-codigo-2026-08-13.md](./14-auditoria-roadmap-vs-codigo-2026-08-13.md) | Contraste roadmap MVP vs API/web/mobile | Viva (corte 2026-08-13) |
| [15-kuatia-deuda-rename.md](./15-kuatia-deuda-rename.md) | Deuda rename/SDK Kuatia; path `identity_core_dart` | Viva |
| [mobile/isar-wallet.md](./mobile/isar-wallet.md) | Wallet local (Isar): VCs en el device, secreto, workaround AGP 8 | Viva |
| [credenciales-demo.md](./credenciales-demo.md) | Cuentas seed locales (Super / Staff / Member) | Viva |
| [99-backlog-post-mvp.md](./99-backlog-post-mvp.md) | Índice de diferidos; detalle en [99-backlog-post-mvp/](./99-backlog-post-mvp/) | Viva |
| [ideas/](./ideas/) | Ideas crudas (charlas, notas) antes de definir módulo | Viva |
| [tareas-terminadas/](./tareas-terminadas/) | Registro cronológico de tareas implementadas | Viva |

## Flujo de trabajo del agente

- Skills: [`.cursor/skills/`](../.cursor/skills/)
- **Hook:** `gymbro-context` contextualiza y enruta a las skills de la tarea.
- Flujo típico: contexto → cuestionario → aprobación → implementación → **cómo probar** → confirmación → commit/push → registro de cierre (con hash).

## Antecedentes (no son la fuente de verdad)

- [Propuesta_Documentacion_Plataforma_Gimnasios.md](./Propuesta_Documentacion_Plataforma_Gimnasios.md) — plan de trabajo original
- [Plataforma_SaaS_Gestion_Gimnasios_Resumen.md](./Plataforma_SaaS_Gestion_Gimnasios_Resumen.md) — resumen previo (supersedido por el maestro)
- Mockups / imágenes en [`docs/images/`](./images/) (referencia visual; la tienda es **post-MVP**)

## Orden de lectura recomendado

1. Documento maestro  
2. Glosario → Dominio → Reglas  
3. Casos de uso  
4. Arquitectura → **Esquema DB** → Wireframes → Pruebas manuales  
5. Método de definición → Roadmap MVP → **Diseño Quark acceso** → Backlog post-MVP  

Cada documento incluye al final: enlace al **índice** y al **siguiente** del flujo.

---

[Siguiente: Documento maestro →](./01-documento-maestro.md)
