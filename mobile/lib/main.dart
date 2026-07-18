import 'package:flutter/material.dart';

/// Punto de entrada de la app móvil GymBro (scaffold).
void main() {
  runApp(const GymBroApp());
}

/// Shell mínimo de la app afiliado hasta E9.
class GymBroApp extends StatelessWidget {
  /// Crea la app raíz.
  const GymBroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GymBro',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text('GymBro Mobile — scaffold'),
        ),
      ),
    );
  }
}
