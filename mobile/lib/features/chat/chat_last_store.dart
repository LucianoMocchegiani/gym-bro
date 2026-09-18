import 'package:shared_preferences/shared_preferences.dart';

/// Último hilo abierto por staff en este gym (igual que el panel web).
class ChatLastStore {
  ChatLastStore._();

  static String _key(String tenantId, String userId) =>
      'faciliter.staff.chat.lastId:$tenantId:$userId';

  /// Lee el id o null.
  static Future<String?> read({
    required String tenantId,
    required String userId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key(tenantId, userId));
  }

  /// Persiste el hilo activo.
  static Future<void> write({
    required String tenantId,
    required String userId,
    required String conversationId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key(tenantId, userId), conversationId);
  }
}
