# Publicar la app en Google Play y App Store

**Fecha:** 2026-10-01  
**Estado:** viva — código listo; faltan los pasos de cuenta y consola.

App: **Faciliter** · id `com.faciliter.mobile` (Android e iOS) · versión en `mobile/pubspec.yaml`.  
Textos de las fichas (borrador): [fichas-tiendas.md](./fichas-tiendas.md).

---

## Decisiones

| Tema | Decisión |
|------|----------|
| Cuenta | **Personal** (monotributo) en Play y Apple. Pasar a organización más adelante (D-U-N-S) es posible. |
| Android | De punta a punta desde Windows. |
| iOS | Código preparado. Se compila y sube con **Codemagic** (Mac en la nube) cuando se pague Apple Developer. |
| Firebase | Mismo proyecto GCP que Google Sign-In (client `382351831666-…`). |
| Config Firebase | `google-services.json` y `GoogleService-Info.plist` **se commitean** (no son secretos; las reglas de seguridad viven en la consola). |
| Dispositivos | iPhone + iPad, vertical y horizontal (como hoy). |

**Eliminar cuenta:** resuelto. App → Ajustes → Eliminar cuenta; web `https://faciliter.xyz/cuenta/eliminar` (URL para Play). Reglas RN-CTA, [CU-CTA-001](../05-casos-de-uso/cuenta.md). Falta revocar Sign in with Apple (ver §5).

**16 KB (Play):** resuelto. Todas las `.so` de 64 bits están alineadas a 16 KB (Isar pasó a `isar_community`, sodium a 3.4.x). Ver [Problemas conocidos](#problemas-conocidos).

---

## 1. Cuentas

### Google Play (personal)

1. [play.google.com/console](https://play.google.com/console) → cuenta **personal** → USD 25 (único pago) → verificación de identidad con DNI.
2. Crear la app: nombre "Faciliter", idioma es-419, app gratuita.
3. Las cuentas personales nuevas necesitan una **prueba cerrada con 12 testers durante 14 días seguidos** antes de pedir producción. Juntar los 12 mails (Gmail) antes de arrancar el reloj.

### Apple (personal, cuando se pague)

1. [developer.apple.com/programs](https://developer.apple.com/programs/) → Individual → USD 99/año. El vendedor que se ve en la tienda es tu nombre.
2. Identifiers → App ID `com.faciliter.mobile` con **Sign in with Apple** habilitado.
3. App Store Connect → nueva app con el mismo bundle id.

---

## 2. Firebase (Crashlytics)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto** → elegir el proyecto GCP existente de Faciliter (el del client de Google Sign-In). Analytics: no hace falta.
2. Agregar app **Android** `com.faciliter.mobile` → descargar `google-services.json` → `mobile/android/app/google-services.json`.
3. Agregar app **iOS** `com.faciliter.mobile` → descargar `GoogleService-Info.plist` → `mobile/ios/Runner/GoogleService-Info.plist`.
4. Crashlytics → habilitar.
5. Commitear los dos archivos.

Cómo se engancha:

- Android: `app/build.gradle.kts` aplica los plugins `google-services` y `crashlytics` **solo si existe** `google-services.json`.
- iOS: la build phase "Copy Firebase Config" copia el plist al bundle **si existe**.
- Dart: `CrashReporter.init()` (`lib/core/crash/crash_reporter.dart`) solo corre en **release**. Si falta la config, la app arranca igual sin reportar.
- Usuario en los reportes: solo `identityId` (uuid opaco), `profile_type` y `tenant_id`. Nunca mail, nombre, DNI ni tokens.

Crash de prueba (build interno, nunca en la tienda):

```powershell
fvm flutter build apk --release --dart-define=CRASH_TEST=true
```

Ajustes → Desarrolladores → **Probar Crashlytics**. Reabrir la app (el reporte se envía al relanzar) y mirar la consola en unos minutos.

---

## 3. Firma Android

### Keystore de subida (una sola vez)

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore C:\Users\User\keys\faciliter-upload.jks -storetype JKS `
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- Guardar el `.jks` y las contraseñas **fuera del repo** y con backup (gestor de contraseñas + copia offline). Si se pierde, hay que pedirle a Google un reset de la clave de subida.
- Copiar `mobile/android/key.properties.example` a `mobile/android/key.properties` y completarlo. `key.properties`, `*.jks` y `*.keystore` están en `.gitignore`.
- Sin `key.properties`, el release se firma con la clave debug: sirve para probar en un celular, pero Play lo rechaza.

### Play App Signing

En la primera subida, Play ofrece **Play App Signing**: aceptarlo. Google firma lo que llega a los usuarios y vos firmás solo la subida.

### SHA-1 para Google Sign-In

Google Sign-In en Android valida paquete + SHA-1. Hay que dar de alta en **Google Cloud → Credenciales → OAuth client tipo Android** (paquete `com.faciliter.mobile`), uno por cada huella:

| Huella | De dónde sale |
|--------|----------------|
| Debug | `cd mobile/android; .\gradlew.bat signingReport` (ya cargada) |
| Clave de subida | `keytool -list -v -keystore C:\Users\User\keys\faciliter-upload.jks -alias upload` |
| Play App Signing | Play Console → Integridad de la app → Firma de apps → SHA-1 del certificado de firma |

Sin la de Play App Signing, "Continuar con Google" falla en la app que se baja de la tienda (aunque funcione en tu build local).

---

## 4. Build Android

```powershell
cd mobile
fvm flutter build appbundle --release --build-number=<N>
```

- Sale `build/app/outputs/bundle/release/app-release.aab`.
- `--build-number` tiene que subir en **cada** subida a Play (`versionCode`). El nombre (`1.0.0`) sale de `pubspec.yaml`.
- La API por defecto ya es `https://api.faciliter.xyz` (`ApiConfig`). No pasar `API_BASE_URL` en builds de tienda.
- En release, Ajustes no muestra "Desarrolladores" (salvo `CRASH_TEST`).

Flujo en Play Console: **Prueba interna** (solo vos, instantánea) → **Prueba cerrada** (12 testers, 14 días) → **Producción**.

---

## 5. iOS sin Mac (Codemagic)

Ya hecho en el repo:

| Qué | Dónde |
|-----|--------|
| Texto de permiso de cámara | `Info.plist` → `NSCameraUsageDescription` |
| Export compliance (solo HTTPS) | `Info.plist` → `ITSAppUsesNonExemptEncryption = false` |
| Sign in with Apple | `Runner/Runner.entitlements` + `CODE_SIGN_ENTITLEMENTS` |
| Google Sign-In iOS | `Info.plist` lee `GIDClientID` y el URL scheme de `ios/Flutter/GoogleSignIn.xcconfig` |
| Firebase | build phase "Copy Firebase Config" |
| Login con Apple solo en iOS | `AppleAuthConfig.isEnabled` (en Android no se muestra el botón) |

Falta (cuando se pague Apple):

1. **Google iOS:** Google Cloud → Credenciales → OAuth client tipo **iOS**, bundle `com.faciliter.mobile`. Completar en `GoogleSignIn.xcconfig`:
   - `GOOGLE_IOS_CLIENT_ID` = el client id;
   - `GOOGLE_IOS_REVERSED_CLIENT_ID` = el "iOS URL scheme" (`com.googleusercontent.apps.…`).
   - En la API, sumar ese client id a `GOOGLE_OAUTH_CLIENT_IDS` (coma-separado): en iOS el `aud` del token es el client iOS.
2. **Apple en la API:** `APPLE_APP_BUNDLE_IDS=com.faciliter.mobile` en el `.env` de prod (el login nativo de iOS trae ese `aud`).
   - **Revocar Sign in with Apple al eliminar cuenta** (Apple lo pide): crear una key con Sign in with Apple (`.p8`), pedir re-login con Apple en iOS al eliminar, canjear el `authorizationCode` y llamar a `https://appleid.apple.com/auth/revoke`. Hoy la baja anonimiza la cuenta pero no revoca en Apple.
3. **Codemagic:** [codemagic.io](https://codemagic.io) → conectar el repo de GitHub → app Flutter → workflow iOS.
   - Code signing automático con una **API key de App Store Connect** (Users and Access → Integrations → Keys, rol App Manager).
   - Build `ipa` en release y publicar a **TestFlight**.
   - El plan gratis da 500 min/mes de macOS; un build ronda 15–25 min.
4. **dSYM para Crashlytics:** sumar el script de subida de símbolos en el primer build de Codemagic (Firebase lo documenta para SPM y CocoaPods). Sin dSYM, los crashes de iOS llegan sin símbolos.
5. **Privacy manifest:** los plugins y Firebase traen el suyo. Si App Store Connect avisa de "required reason API" al subir, agregar `PrivacyInfo.xcprivacy` en Runner.

---

## 6. Fichas

| Pieza | Play | App Store |
|-------|------|-----------|
| Ícono | 512×512 PNG | 1024×1024 (sale del asset catalog) |
| Capturas | Teléfono, mín. 2 (1080×1920 sirve) | iPhone 6.9" (1320×2868) **y iPad 13"** (2064×2752), mín. 1 de cada |
| Gráfico destacado | 1024×500 | — |
| Privacidad | URL pública | URL pública |
| Soporte | Mail | URL |
| Eliminar cuenta | `https://faciliter.xyz/cuenta/eliminar` | En la app (Ajustes → Eliminar cuenta) |

URLs: privacidad `https://faciliter.xyz/legal/privacidad`, términos `https://faciliter.xyz/legal/terminos`. Hoy son **borrador**; alcanzan para enviar, pero conviene revisarlos antes de producción.

### Data safety (Play) y App Privacy (Apple)

| Dato | Se recolecta | Para qué | Ligado al usuario |
|------|--------------|----------|-------------------|
| Mail, nombre | Sí | Cuenta / funcionalidad | Sí |
| Id de usuario | Sí | Cuenta, Crashlytics | Sí |
| Historial de compras (packs, sesiones) | Sí | Funcionalidad | Sí |
| Crash logs / diagnóstico | Sí (Crashlytics) | Estabilidad | Sí (id opaco) |
| Cámara | No se guarda | Escanear QR en el momento | — |
| Datos de pago | No (los procesa Mercado Pago fuera de la app) | — | — |

- Cifrado en tránsito: sí (HTTPS).
- Credenciales de la wallet: quedan **solo en el celular**, no se suben.
- Pagos: son servicios del gym consumidos fuera de la app (clases, packs). Apple 3.1.3(e) y la política de Play permiten cobrarlos por fuera del sistema de compras de la tienda.
- Clasificación: cuestionario IARC sin contenido sensible → "Todos" / 4+. Público objetivo sugerido: 18+ (evita la política de familias).

### Notas para la revisión

- Cuenta demo: `socio@gymdeprueba.com` / `ChangeMe123!` (verificar que exista en **prod** antes de enviar).
- El revisor puede probar **Eliminar cuenta** con la demo: después de cada revisión, verificar que siga existiendo y recrearla si hace falta.
- Qué ver: Inicio → Sesiones / Tienda; Acceso → credenciales; el QR se usa en la puerta del gym, el revisor puede ver la pantalla de escaneo sin un QR real.
- Pagos con Mercado Pago: servicios presenciales del gym.

---

## 7. Actualizaciones y versión mínima

Las tiendas actualizan solas a la mayoría de los usuarios, pero no a todos ni enseguida. La app consulta al arrancar `GET /api/public/app-config` (sin auth) y compara su **build number** (`--build-number`, el `+N` de `pubspec.yaml`) con lo que devuelve la API para su plataforma:

| Caso | Qué ve el usuario |
|------|-------------------|
| build < `APP_MIN_BUILD_*` | Pantalla bloqueante "Actualizá la app" con botón a la tienda. |
| build < `APP_LATEST_BUILD_*` | Aviso "Hay una versión nueva" (Más tarde / Actualizar), **una sola vez** por versión nueva. |
| Al día, sin red, API caída o timeout (4 s) | Nada: la app sigue normal. |

Variables en el `.env` de la API (todas opcionales, `0` = sin control):

| Variable | Para qué |
|----------|----------|
| `APP_MIN_BUILD_ANDROID` / `APP_MIN_BUILD_IOS` | Build mínimo soportado. |
| `APP_LATEST_BUILD_ANDROID` / `APP_LATEST_BUILD_IOS` | Último build publicado (si es menor que el mínimo, se usa el mínimo). |
| `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` | Link a la ficha. Android tiene default (`play.google.com/...id=com.faciliter.mobile`); iOS queda vacío hasta tener la app en App Store. |

Orden al publicar:

1. Subir la versión nueva y esperar a que esté **disponible** en la tienda (revisión aprobada, rollout al 100 %).
2. Recién ahí subir `APP_LATEST_BUILD_*` a ese build (aviso suave).
3. Subir `APP_MIN_BUILD_*` solo cuando la versión vieja deje de funcionar con la API (cambio incompatible en un endpoint o en la wallet). Antes de un cambio así, conviene que la API soporte los dos formatos durante un tiempo.

Cada plataforma tiene su número: Android e iOS pueden ir con builds distintos. Sin `APP_STORE_URL_IOS`, la pantalla bloqueante en iOS se muestra sin botón.

---

## Problemas conocidos

| Problema | Estado |
|----------|--------|
| `libisar.so` y `libsodium.so` alineadas a 4 KB (Play exige 16 KB) | Resuelto: `isar_community` 3.3.2 y `sodium_libs` 3.4.x ([isar-wallet.md](./isar-wallet.md)). |
| `identity-core-dart/` era un clon local fuera de git | Resuelto: versionado en el monorepo (Codemagic lo tiene). |
| `identity-core-dart/android/build.gradle` fijaba `flutter_embedding_debug:1.0.0-3.10.0` (no existe) | Resuelto: se quitó esa dependencia (el embedding lo agrega Flutter). |
| `isar_flutter_libs` 3.1 sin `namespace` y con SDK 30 | Resuelto con el fork; `mobile/android/build.gradle.kts` sin parches. |

Cómo chequear 16 KB antes de subir: Android Studio → Build → Analyze APK (avisa si una `.so` no está alineada), o `zipalign -c -P 16 -v 4 app-release.apk` (build-tools) para el zip.

---

[Índice](../00-indice.md) · [Wallet Isar](./isar-wallet.md) · [Backlog app](../99-backlog-post-mvp/app-afiliado.md)
