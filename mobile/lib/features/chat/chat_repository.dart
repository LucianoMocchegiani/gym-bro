import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/chat_config.dart';
import '../../core/network/api_client.dart';

/// Hilo de chat-api.
class ChatThread {
  /// Crea el modelo.
  ChatThread({
    required this.id,
    required this.title,
    required this.updatedAt,
  });

  final String id;
  final String? title;
  final DateTime updatedAt;

  factory ChatThread.fromJson(Map<String, dynamic> json) {
    return ChatThread(
      id: json['id'] as String,
      title: json['title'] as String?,
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  /// Título para la lista.
  String get displayTitle {
    final t = title?.trim();
    if (t != null && t.isNotEmpty) {
      return t;
    }
    return 'Nueva conversación';
  }
}

/// Mensaje persistido.
class ChatMessage {
  /// Crea el modelo.
  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
  });

  final String id;
  final String role;
  final String content;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      role: json['role'] as String,
      content: json['content'] as String? ?? '',
    );
  }
}

/// Cliente chat-api con el JWT GymBro staff.
class ChatRepository {
  /// Crea el repositorio.
  ChatRepository({required ApiClient api, http.Client? httpClient})
    : _api = api,
      _http = httpClient ?? http.Client();

  final ApiClient _api;
  final http.Client _http;
  http.Client? _turnClient;
  bool _turnAborted = false;

  /// Lista hilos no archivados.
  Future<List<ChatThread>> listThreads() async {
    final decoded = await _json('GET', '/v1/conversations');
    final items = decoded is Map ? decoded['items'] : null;
    if (items is! List) {
      return const [];
    }
    return items
        .whereType<Map>()
        .map((e) => ChatThread.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Crea un hilo vacío.
  Future<ChatThread> createThread() async {
    final decoded = await _json('POST', '/v1/conversations', body: {});
    if (decoded is! Map) {
      throw ApiException('No se pudo crear el chat');
    }
    return ChatThread.fromJson(Map<String, dynamic>.from(decoded));
  }

  /// Historial de un hilo.
  Future<List<ChatMessage>> listMessages(String conversationId) async {
    final decoded =
        await _json('GET', '/v1/conversations/$conversationId/messages');
    final items = decoded is Map ? decoded['items'] : null;
    if (items is! List) {
      return const [];
    }
    return items
        .whereType<Map>()
        .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
        .where((m) => m.role == 'user' || m.role == 'assistant')
        .where((m) => m.content.trim().isNotEmpty)
        .toList();
  }

  /// Envía un turno y emite `text-delta` del UI Message Stream.
  ///
  /// [abortTurn] corta el HTTP. En ese caso lanza [ChatTurnAbortedException].
  Future<void> sendTurn(
    String conversationId,
    String text, {
    required void Function(String delta) onDelta,
  }) async {
    final token = _api.accessToken;
    if (token == null || token.isEmpty) {
      throw ApiException('Sin sesión');
    }
    abortTurn();
    _turnAborted = false;
    final client = http.Client();
    _turnClient = client;
    final uri = Uri.parse(
      '${ChatConfig.baseUrl}/v1/conversations/$conversationId/messages',
    );
    final req = http.Request('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Content-Type'] = 'application/json'
      ..headers['Accept'] = 'text/event-stream'
      ..body = jsonEncode({'text': text});
    try {
      final res = await client.send(req);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        await res.stream.drain<void>();
        throw ApiException('Error ${res.statusCode} al enviar el mensaje');
      }
      var buffer = '';
      await for (final piece in res.stream.transform(utf8.decoder)) {
        if (_turnAborted) {
          throw const ChatTurnAbortedException();
        }
        buffer += piece;
        while (true) {
          final split = buffer.indexOf('\n\n');
          if (split < 0) {
            break;
          }
          final block = buffer.substring(0, split);
          buffer = buffer.substring(split + 2);
          _dispatchSseBlock(block, onDelta);
        }
      }
      if (buffer.trim().isNotEmpty) {
        _dispatchSseBlock(buffer, onDelta);
      }
    } catch (e) {
      if (e is ChatTurnAbortedException) {
        rethrow;
      }
      if (_turnAborted || e is http.ClientException) {
        throw const ChatTurnAbortedException();
      }
      rethrow;
    } finally {
      if (identical(_turnClient, client)) {
        _turnClient = null;
      }
      client.close();
    }
  }

  void _dispatchSseBlock(String block, void Function(String delta) onDelta) {
    for (final line in block.split('\n')) {
      final trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      final payload = trimmed.substring(5).trim();
      if (payload.isEmpty || payload == '[DONE]') {
        continue;
      }
      Object? event;
      try {
        event = jsonDecode(payload);
      } catch (_) {
        continue;
      }
      if (event is! Map) {
        continue;
      }
      final type = event['type'] as String? ?? '';
      if (type == 'text-delta') {
        final delta = event['delta'];
        if (delta is String && delta.isNotEmpty) {
          onDelta(delta);
        }
      }
      if (type == 'error') {
        final msg = event['errorText'];
        throw ApiException(
          msg is String && msg.trim().isNotEmpty
              ? msg
              : 'El asistente no está disponible',
        );
      }
    }
  }

  /// Corta el stream del turno en curso (botón Parar).
  void abortTurn() {
    _turnAborted = true;
    final client = _turnClient;
    _turnClient = null;
    client?.close();
  }

  Future<Object?> _json(
    String method,
    String path, {
    Object? body,
  }) async {
    final token = _api.accessToken;
    if (token == null || token.isEmpty) {
      throw ApiException('Sin sesión');
    }
    final uri = Uri.parse('${ChatConfig.baseUrl}$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
    late http.Response res;
    try {
      if (method == 'GET') {
        res = await _http.get(uri, headers: headers);
      } else {
        res = await _http.post(
          uri,
          headers: headers,
          body: jsonEncode(body ?? {}),
        );
      }
    } catch (_) {
      throw ApiException('Sin conexión con el chat');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(_messageFromBody(res), statusCode: res.statusCode);
    }
    if (res.body.isEmpty) {
      return null;
    }
    return jsonDecode(res.body);
  }

  String _messageFromBody(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map) {
        final err = decoded['error'] ?? decoded['message'];
        if (err != null) {
          return err.toString();
        }
      }
    } catch (_) {
      // ignore
    }
    return 'Error ${res.statusCode}';
  }
}

/// El staff cortó el stream del asistente.
class ChatTurnAbortedException implements Exception {
  /// Crea la excepción.
  const ChatTurnAbortedException();
}
