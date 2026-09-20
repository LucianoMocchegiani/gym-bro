import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../core/network/api_client.dart';

/// Pide una cuenta Apple y devuelve el `id_token` para Nest.
class AppleIdToken {
  AppleIdToken._();

  /// Null si el usuario cancela. Lanza [ApiException] si no hay token.
  static Future<String?> request() async {
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    final idToken = credential.identityToken;
    if (idToken == null || idToken.isEmpty) {
      throw ApiException(
        'Apple no devolvió id_token.',
      );
    }
    return idToken;
  }
}
