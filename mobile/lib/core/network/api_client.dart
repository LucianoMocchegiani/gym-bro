import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

/// Error de API con mensaje usable en UI.
class ApiException implements Exception {
  /// Crea un error de red/API.
  ApiException(this.message, {this.statusCode});

  /// Mensaje para el usuario.
  final String message;

  /// HTTP status si aplica.
  final int? statusCode;

  @override
  String toString() => message;
}

/// Cliente HTTP tipado hacia Nest (`/api/...`).
///
/// @remarks Si [onUnauthorized] está seteado, ante 401 intenta refrescar una vez.
class ApiClient {
  /// Crea el cliente.
  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final http.Client _http;

  /// Access JWT actual (Bearer).
  String? accessToken;

  /// Callback opcional: refresca tokens y retorna si pudo.
  Future<bool> Function()? onUnauthorized;

  /// GET JSON.
  Future<T> getJson<T>(
    String path, {
    T Function(Object? json)? parse,
    bool auth = true,
  }) async {
    return _request<T>('GET', path, parse: parse, auth: auth);
  }

  /// POST JSON.
  Future<T> postJson<T>(
    String path, {
    Object? body,
    T Function(Object? json)? parse,
    bool auth = true,
  }) async {
    return _request<T>('POST', path, body: body, parse: parse, auth: auth);
  }

  /// PATCH JSON.
  Future<T> patchJson<T>(
    String path, {
    Object? body,
    T Function(Object? json)? parse,
    bool auth = true,
  }) async {
    return _request<T>('PATCH', path, body: body, parse: parse, auth: auth);
  }

  Future<T> _request<T>(
    String method,
    String path, {
    Object? body,
    T Function(Object? json)? parse,
    bool auth = true,
    bool retried = false,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (auth && accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    }

    late http.Response res;
    try {
      switch (method) {
        case 'GET':
          res = await _http.get(uri, headers: headers);
        case 'POST':
          res = await _http.post(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          );
        case 'PATCH':
          res = await _http.patch(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          );
        default:
          throw ApiException('Método no soportado: $method');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Sin conexión con el servidor');
    }

    if (res.statusCode == 401 && auth && !retried && onUnauthorized != null) {
      final ok = await onUnauthorized!();
      if (ok) {
        return _request<T>(
          method,
          path,
          body: body,
          parse: parse,
          auth: auth,
          retried: true,
        );
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(_messageFromBody(res), statusCode: res.statusCode);
    }

    if (res.body.isEmpty) {
      return (parse != null ? parse(null) : null) as T;
    }

    final decoded = jsonDecode(res.body);
    if (parse != null) {
      return parse(decoded);
    }
    return decoded as T;
  }

  String _messageFromBody(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['message'] != null) {
        final msg = decoded['message'];
        if (msg is List) {
          return msg.join(', ');
        }
        return msg.toString();
      }
    } catch (_) {
      // ignore
    }
    return 'Error ${res.statusCode}';
  }
}
