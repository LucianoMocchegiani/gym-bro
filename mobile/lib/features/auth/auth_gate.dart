import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../shell/member_shell.dart';
import '../shell/staff_shell.dart';
import 'auth_controller.dart';
import 'gym_picker_screen.dart';
import 'login_screen.dart';

/// Enruta login, picker de gym o shell (RN-ROL-005).
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
    if (auth.isAuthenticated) {
      if (auth.isStaff) {
        return const StaffShell();
      }
      return const MemberShell();
    }
    if (auth.needsGymPicker) {
      return const GymPickerScreen();
    }
    return const LoginScreen();
  }
}
