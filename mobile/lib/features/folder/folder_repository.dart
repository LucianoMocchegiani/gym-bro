import 'dart:typed_data';

import '../../core/network/api_client.dart';

/// Ítem de carpeta (nota o file).
class FolderItem {
  /// Crea el modelo.
  FolderItem({
    required this.id,
    required this.kind,
    this.title,
    this.body,
    this.originalFilename,
    this.mime,
    this.sizeBytes,
    this.labelName,
    required this.createdAt,
    this.createdByName,
  });

  final String id;
  final String kind;
  final String? title;
  final String? body;
  final String? originalFilename;
  final String? mime;
  final int? sizeBytes;
  final String? labelName;
  final DateTime createdAt;
  final String? createdByName;

  /// Parsea JSON de la API.
  factory FolderItem.fromJson(Map<String, dynamic> json) {
    final label = json['label'] as Map<String, dynamic>?;
    return FolderItem(
      id: json['id'] as String,
      kind: json['kind'] as String,
      title: json['title'] as String?,
      body: json['body'] as String?,
      originalFilename: json['originalFilename'] as String?,
      mime: json['mime'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
      labelName: label?['name'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      createdByName: json['createdByName'] as String?,
    );
  }

  /// Título para lista.
  String get displayTitle {
    if (kind == 'NOTE') {
      return title?.trim().isNotEmpty == true ? title! : 'Nota';
    }
    return originalFilename ?? title ?? 'Archivo';
  }
}

/// Lista y descarga de la carpeta propia (`GET /me/folder`).
///
/// CU-FOL-003. Solo lectura en la app.
class FolderRepository {
  /// Crea el repositorio.
  FolderRepository(this._api);

  final ApiClient _api;

  /// Lista ítems del usuario autenticado (socio o staff).
  Future<List<FolderItem>> listMine() {
    return _api.getJson<List<FolderItem>>(
      '/api/me/folder',
      parse: (json) {
        if (json is! List) {
          return [];
        }
        return json
            .whereType<Map>()
            .map((e) => FolderItem.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  /// Bytes de un file propio.
  Future<Uint8List> downloadMine(String itemId) async {
    final bytes = await _api.getBytes('/api/me/folder/$itemId/file');
    return Uint8List.fromList(bytes);
  }
}
