import 'package:flutter/foundation.dart';

/// Tipo de ítem del carrito del afiliado (CU-PAG-001).
enum MemberCartKind {
  /// Pack del catálogo (`GET /me/packs`).
  pack,

  /// Drop-in de una sesión publicada.
  dropIn,
}

/// Línea del carrito: un pack o un drop-in (cantidad 1).
///
/// La clave de duplicado es [kind] + [id]. No se suman dos veces el mismo pack
/// ni dos drop-in de la misma sesión.
class MemberCartLine {
  /// Crea la línea.
  const MemberCartLine({
    required this.kind,
    required this.id,
    required this.title,
    required this.amount,
    this.subtitle,
  });

  final MemberCartKind kind;
  final String id;
  final String title;
  final String? subtitle;
  final int amount;

  /// Valor `kind` del body `POST /me/transaction-items/mp/cart`.
  String get apiKind => switch (kind) {
        MemberCartKind.pack => 'PACK',
        MemberCartKind.dropIn => 'DROP_IN',
      };
}

/// Carrito compartido entre Tienda y Sesiones (un Preference al pagar).
class MemberCartController extends ChangeNotifier {
  final List<MemberCartLine> _lines = [];

  /// Ítems actuales (inmutables).
  List<MemberCartLine> get lines => List.unmodifiable(_lines);

  /// Cantidad de líneas.
  int get count => _lines.length;

  /// Suma de montos (cantidad 1 por línea).
  int get total => _lines.fold(0, (sum, line) => sum + line.amount);

  /// ¿Hay al menos un ítem?
  bool get isEmpty => _lines.isEmpty;

  /// Agrega una línea. Devuelve `false` si ya estaba (mismo [kind] + [id]).
  bool add(MemberCartLine line) {
    final exists = _lines.any((e) => e.kind == line.kind && e.id == line.id);
    if (exists) return false;
    _lines.add(line);
    notifyListeners();
    return true;
  }

  /// Quita la línea [kind] + [id] si existe.
  void remove(MemberCartKind kind, String id) {
    final before = _lines.length;
    _lines.removeWhere((e) => e.kind == kind && e.id == id);
    if (_lines.length != before) notifyListeners();
  }

  /// Vacía el carrito (logout o checkout iniciado).
  void clear() {
    if (_lines.isEmpty) return;
    _lines.clear();
    notifyListeners();
  }
}
