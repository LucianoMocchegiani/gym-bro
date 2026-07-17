---
name: nestjs-standards
description: Aplica prácticas de backend NestJS y TypeScript de GymBro. Úsala al crear o modificar API, dominio, persistencia, autenticación, jobs, pagos o integraciones.
---

# Estándares NestJS

## Arquitectura

- Mantén un **monolito modular** organizado por dominio, no por tipo técnico global.
- Separa controller, aplicación/use cases, dominio e infraestructura.
- Controllers delgados: validan entrada y delegan.
- La lógica de negocio vive en servicios/use cases, no en ORM, guards o controllers.
- Dependencias externas detrás de puertos/adapters (Quark, Mercado Pago, email, storage).
- Todo dato de negocio respeta `tenant_id`; resuélvelo desde auth, nunca desde un body confiado.

## TypeScript

- Modo estricto; evita `any`, casts inseguros y non-null assertions.
- DTOs explícitos con validación y transformación controlada.
- Tipos de dominio para estados, motivos y operaciones sensibles.
- Errores de dominio distinguibles de errores de infraestructura.
- Operaciones de pago, webhooks y confirmación de derechos deben ser idempotentes y transaccionales.

## TSDoc obligatorio

Usa TSDoc detallado en:

- clases, interfaces y funciones exportadas;
- puertos/adapters;
- use cases y métodos públicos con reglas de negocio;
- DTOs o tipos cuyos invariantes no sean obvios.

Incluye según corresponda:

- propósito y contexto de negocio;
- parámetros y retorno;
- invariantes multi-tenant;
- efectos laterales;
- errores esperados;
- referencias `RN-*` / `CU-*` cuando la conducta derive de documentación.

No documentes línea por línea ni repitas el nombre del símbolo. Código privado obvio no requiere TSDoc.

```ts
/**
 * Evalúa si un afiliado puede ingresar al tenant y registra el intento.
 *
 * @remarks Aplica RN-ACC-004 a RN-ACC-007. El tenant se obtiene
 * del contexto autenticado y nunca del payload recibido.
 * @throws {AccessProviderUnavailableError} Si el adapter SSI no responde.
 */
```

## Calidad

- Tests automatizados no son obligatorios por la documentación de producto, pero agrega los necesarios cuando reduzcan riesgo técnico.
- Ejecuta lint, typecheck y pruebas disponibles.
- No expongas secretos, tokens ni payloads SSI en logs.
- Actualiza README y docs mediante `sync-project-docs`.
