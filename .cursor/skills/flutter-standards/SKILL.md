---
name: flutter-standards
description: Aplica prácticas Flutter y Dart de GymBro. Úsala al crear o modificar la app móvil, autenticación, reservas, QR/SSI, rutinas, pagos o notificaciones.
---

# Estándares Flutter

## Arquitectura

- Organiza por feature/dominio, con separación entre presentación, aplicación, dominio e infraestructura.
- Widgets pequeños; la lógica de negocio no vive en `build`.
- Repositorios/adapters encapsulan API, storage y SDK Quark.
- Modela loading, error, vacío y datos como estados explícitos.
- Mantén perfiles afiliado y staff separados según RN-ROL-005.
- No guardes tokens o credenciales sensibles en preferencias sin protección; usa secure storage.

## Dart

- Null safety estricta; evita `dynamic` y `!` salvo justificación.
- Modelos inmutables y estados predecibles.
- Cancela streams/controllers y evita trabajo pesado en el hilo UI.
- Maneja deep links, cámara y credenciales SSI detrás de servicios/adapters.

## Dartdoc obligatorio

El equivalente de TSDoc es **Dartdoc** con comentarios `///`.

Úsalo detalladamente en:

- clases y miembros públicos;
- repositorios, adapters y casos de uso;
- widgets públicos con comportamiento de negocio;
- modelos con invariantes no obvios.

Incluye propósito, parámetros, retornos, efectos laterales, errores y referencias `RN-*` / `CU-*` cuando corresponda.

```dart
/// Resuelve la credencial de vínculo y solicita la evaluación de ingreso.
///
/// Aplica el flujo de [CU-ACC-001]. La credencial identifica al afiliado;
/// los derechos de packs y reservas se resuelven en GymBro.
/// Lanza [AccessProviderUnavailableException] si Quark no responde.
```

No describas visualmente widgets obvios ni repitas el nombre del símbolo.

## Calidad y documentación

- Ejecuta format, analyze y pruebas disponibles.
- Considera estados sin conectividad aunque offline de acceso sea post-MVP.
- Mantén README y docs alineadas mediante `sync-project-docs`.
