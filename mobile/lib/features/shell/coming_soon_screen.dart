import 'package:flutter/material.dart';

/// Pantalla placeholder de un atajo aún no implementado.
class ComingSoonScreen extends StatelessWidget {
  /// Crea la pantalla.
  const ComingSoonScreen({
    super.key,
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          message,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ),
    );
  }
}
