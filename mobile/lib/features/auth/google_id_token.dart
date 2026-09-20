import 'package:google_sign_in/google_sign_in.dart';

import '../../core/config/google_auth_config.dart';
import '../../core/network/api_client.dart';

/// Pide una cuenta Google y devuelve el `id_token` para Nest.
class GoogleIdToken {
  GoogleIdToken._();

  static final GoogleSignIn _client = GoogleSignIn(
    scopes: const ['email', 'openid', 'profile'],
    serverClientId: GoogleAuthConfig.serverClientId,
  );

  /// Null si el usuario cancela. Lanza [ApiException] si no hay token.
  static Future<String?> request() async {
    final account = await _client.signIn();
    if (account == null) {
      return null;
    }
    final auth = await account.authentication;
    final idToken = auth.idToken;
    await _client.signOut();
    if (idToken == null || idToken.isEmpty) {
      throw ApiException(
        'Google no devolvió id_token. Configurá GOOGLE_SERVER_CLIENT_ID (client Web).',
      );
    }
    return idToken;
  }
}
