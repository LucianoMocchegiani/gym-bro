import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Preferencia de tema claro/oscuro (default oscuro).
class ThemeController extends ChangeNotifier {
  static const _key = 'gymbro.theme';

  bool _dark = true;
  bool _ready = false;

  /// Oscuro si true.
  bool get isDark => _dark;

  /// Preferencia cargada.
  bool get ready => _ready;

  /// Carga desde SharedPreferences.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    _dark = raw != 'light';
    _ready = true;
    notifyListeners();
  }

  /// Alterna tema y persiste.
  Future<void> toggle() async {
    _dark = !_dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, _dark ? 'dark' : 'light');
  }
}
