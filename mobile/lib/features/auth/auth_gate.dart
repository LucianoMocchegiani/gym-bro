import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../shell/member_shell.dart';
import '../shell/staff_shell.dart';
import 'auth_controller.dart';
import 'login_screen.dart';

/// Enruta a login o al shell según la sesión (RN-ROL-005).
///
/// Si el token no vale, vuelve al login. El [MaterialApp] debe llevar una
/// [ValueKey] de sesión para tirar el stack de rutas (Caja, roster, etc.).
class AuthGate extends StatelessWidget {
  /// Crea el protector.
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.ready) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    if (auth.isStaff) {
      return const StaffShell();
    }
    return const MemberShell();
  }
}
