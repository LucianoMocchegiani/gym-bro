/// URL de chat-api para el tab Chat staff.
///
/// Override: `flutter run --dart-define=CHAT_API_URL=https://...`
class ChatConfig {
  ChatConfig._();

  /// Base de chat-api (sin slash final).
  static const String baseUrl = String.fromEnvironment(
    'CHAT_API_URL',
    defaultValue: 'https://chat.faciliter.xyz',
  );
}
