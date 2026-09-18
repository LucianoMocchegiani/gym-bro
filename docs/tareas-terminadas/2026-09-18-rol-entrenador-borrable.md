# Rol Entrenador: borrable, slug y login demo

**Fecha:** 2026-09-18
**Roadmap:** E1 — Roles seed (RN-ROL-002)
**Commit:** `ae4c656` — feat(roles): Entrenador seed is deletable; slug and demo login
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/ae4c656c058cabb3a9728ddd7bc749bf451589e9

## Resumen

Solo el rol **Admin** queda protegido (no se edita ni se elimina). El seed **Entrenador** (antes Profesor) se puede borrar. Slug `entrenador` y login demo `entrenador@gymdeprueba.com`. En el login staff hay atajos Admin / Entrenador.

## Cambios principales

- `DELETE /roles/:id` bloquea `slug=admin`
- Migración `20260918120000_role_profesor_name_entrenador`
- Seed, Postman, guía y credenciales demo

## Decisiones

- Nombre visible **Entrenador**; slug interno `entrenador` (el viejo `profesor` queda reservado)

## Validación

- Prueba manual: papelera en Entrenador; login `entrenador@…`; Admin sin eliminar
- VPS: `prisma migrate deploy` (+ seed si hace falta)

## Referencias

- RN-ROL-002
- Commit: `ae4c656` / https://github.com/LucianoMocchegiani/gym-bro/commit/ae4c656c058cabb3a9728ddd7bc749bf451589e9
