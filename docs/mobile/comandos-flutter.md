# Comandos Flutter — app móvil

**Fecha:** 2026-10-02  
**Estado:** viva

Todo se corre desde `mobile/` con `fvm flutter` (Flutter 3.41.9 pinneado en `.fvmrc`).  
`<deviceId>` = el id de `adb devices` (ej. `ZY22K73544`).

Publicar en tiendas: [publicar-tiendas.md](./publicar-tiendas.md).

---

## Compilar vs correr

| Comando | Compila | Instala | Abre la app | Hot reload | Modo |
|---------|---------|---------|-------------|------------|------|
| `fvm flutter run` | Sí | Sí | Sí | Sí | debug |
| `fvm flutter run --release` | Sí | Sí | Sí | No | release |
| `fvm flutter build apk --release` | Sí | No | No | — | release |
| `fvm flutter build appbundle --release` | Sí | No | No | — | release |
| `fvm flutter install` | No | Sí | No | — | el último build |

- **Debug:** lento, con asserts, hot reload, sección "Desarrolladores" en Ajustes, Crashlytics apagado.
- **Release:** igual a lo que baja el usuario. Sin hot reload; Crashlytics prendido (si hay config de Firebase).

---

## Día a día

| Para qué | Comando |
|----------|---------|
| Ver celulares conectados | `adb devices` |
| Bajar dependencias (después de un pull o de tocar `pubspec.yaml`) | `fvm flutter pub get` |
| **Programar** (hot reload `r`, restart `R`, salir `q`) | `fvm flutter run -d <deviceId>` |
| Revisar errores de código | `fvm flutter analyze` |
| Ver logs de la app sin `run` | `fvm flutter logs -d <deviceId>` |
| Build roto sin motivo claro | `fvm flutter clean` y después `fvm flutter pub get` |

### API local en vez de prod

Por defecto la app pega a `https://api.faciliter.xyz`. Para tu API local por USB:

```powershell
adb reverse tcp:3001 tcp:3001
fvm flutter run -d <deviceId> --dart-define=API_BASE_URL=http://localhost:3001
```

`adb reverse` hay que repetirlo cada vez que desenchufás el celular.

---

## Probar como en la tienda

| Para qué | Comando |
|----------|---------|
| **Probar en release** en tu celular (compila + instala + abre) | `fvm flutter run --release -d <deviceId>` |
| Generar el APK (para instalar a mano o pasarlo) | `fvm flutter build apk --release` |
| Instalar el APK recién generado | `fvm flutter install -d <deviceId>` |
| Instalar un APK puntual con adb | `adb -s <deviceId> install -r build\app\outputs\flutter-apk\app-release.apk` |
| Desinstalar (borra datos y wallet) | `adb -s <deviceId> uninstall com.faciliter.mobile` |

- `install -r` instala **encima**: conserva sesión y wallet. Desinstalar las borra.
- Sin `android/key.properties`, el release se firma con la clave debug: sirve para tu celular, no para Play.

### Crash de prueba (Crashlytics)

```powershell
fvm flutter run --release -d <deviceId> --dart-define=CRASH_TEST=true
```

Ajustes → Desarrolladores → **Probar Crashlytics**. Nunca subir a la tienda un build con `CRASH_TEST`.

---

## Para Google Play

| Para qué | Comando |
|----------|---------|
| **AAB para subir a Play** (subir el número en cada subida) | `fvm flutter build appbundle --release --build-number=<N>` |
| SHA-1 debug (Google Sign-In) | `cd android; .\gradlew.bat signingReport` |

El AAB sale en `build\app\outputs\bundle\release\app-release.aab`. Play no acepta APK para apps nuevas.

---

## Parámetros `--dart-define`

Se agregan a `run` o `build`. Sin ellos se usan los valores de prod.

| Variable | Default | Uso |
|----------|---------|-----|
| `API_BASE_URL` | `https://api.faciliter.xyz` | API local o de staging |
| `CHAT_API_URL` | `https://chat.faciliter.xyz` | Chat del staff |
| `GOOGLE_SERVER_CLIENT_ID` | client Web de Faciliter | Otro proyecto de Google |
| `CRASH_TEST` | `false` | Botón de crash de prueba en Ajustes |

---

## Paquete de la wallet (`identity-core-dart/`)

| Para qué | Comando (desde `identity-core-dart/`) |
|----------|----------------------------------------|
| Tests del paquete | `fvm flutter test` |
| Regenerar Freezed / json | `dart run build_runner build --delete-conflicting-outputs` |
| Regenerar esquemas Isar | `.\tool\isar_codegen\generate.ps1` |

Detalle: [isar-wallet.md](./isar-wallet.md).

---

[Índice](../00-indice.md) · [Publicar en tiendas](./publicar-tiendas.md) · [Wallet Isar](./isar-wallet.md)
