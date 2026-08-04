# Listados paginados (ListResult + q/orderBy/order)

**Fecha:** 2026-08-04  
**Roadmap:** Afinar Admin/API — listados  
**Commit:** `755fbe1` — feat(api,web): listados paginados con q, orderBy y order  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/755fbe1

## Resumen

Todos los GET de listas de la API pasan al contrato `{ items, page, pageSize, total, hasMore }` con `page`/`pageSize`/`q`/`orderBy`/`order`. Admin web y bandeja mobile de offers adaptados; Postman actualizado. Fuera de alcance: reportes summary y caja/día (no son listados).

## Cambios principales

- `api/src/common/list` (`ListQueryDto`, `normalizeListQuery`, `toListResult`)
- Servicios/controllers de listado (Staff + Super) + web `lib/api` + páginas con search/pager
- Mobile: parse de `items` en credential-offers
- Postman + docs arquitectura/roadmap

## Decisiones

- Breaking: ya no se devuelve array crudo
- `limit` de audit/access-attempts → `pageSize`
- Whitelist de `orderBy` por recurso

## Validación

- `tsc` API OK; usuario confirmó comportamiento correcto en uso
