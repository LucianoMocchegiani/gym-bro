import 'package:flutter/material.dart';

/// Ejecuta [action] mostrando un diálogo de carga no cancelable.
///
/// Cierra el popup al terminar (éxito o error). Usar tras confirmaciones
/// (reiniciar wallet, eliminar VC, logout, aceptar offer, etc.).
Future<T> runWithLoadingDialog<T>(
  BuildContext context, {
  required Future<T> Function() action,
  String message = 'Esperá un momento…',
}) async {
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (ctx) {
      return PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 3),
              ),
              const SizedBox(width: 20),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
    },
  );

  try {
    return await action();
  } finally {
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
    }
  }
}
