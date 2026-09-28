# Handoff de impersonación entre subdominios

**Estado:** Implementado (cookie en memoria, un uso, ~60 s)
**Decisión:** cookie compartida, mismo patrón que Google (`central_session`). Sin tabla Prisma. Código de un solo uso en la URL descartado.
**QA web:** HTTPS / túnel. `http://*.localhost` no comparte `SameSite=None; Secure`.

## Flujo

```
admin.{dominio} → POST /auth/super/impersonate
                → Set-Cookie: impersonation_handoff=<uuid>; Domain=.{dominio}; Max-Age=60
                → { tenantSlug }  (sin JWT)
                → location = {slug}.{dominio}/login?handoff=1
                → UI “Entrando al gym” (no el form de login)
                → POST /auth/from-handoff  (cookie → JWT Staff 4h, borra cookie)
                → localStorage en el origen del gym
                → /
```

Store: `Map` en Nest (`ImpersonationHandoffStore`), como el proxy de Google. Restart de API = handoffs muertos.

`COOKIE_PARENT_DOMAIN` o, si falta, `.` + `CORS_APP_DOMAIN`.

Volver: `/cuenta` → Volver a plataforma (logout del gym + `tenantOrigin('admin')`). La sesión de plataforma sigue en el origen `admin`.

## Referencias

- `web/components/ImpersonateTenantPanel.tsx`
- `web/app/login/LoginClient.tsx` (`consumeHandoff`)
- `api/src/auth/handoff-cookie.ts` · `impersonation-handoff.store.ts`

[Índice post-MVP](./99-backlog-post-mvp.md) · [Backlog técnico](./99-backlog-post-mvp/tecnico.md)
