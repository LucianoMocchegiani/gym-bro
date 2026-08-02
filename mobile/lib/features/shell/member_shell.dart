import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../access/qr_screen.dart';
import '../account/account_screen.dart';
import '../auth/auth_controller.dart';
import '../home/home_screen.dart';
import '../sessions/sessions_placeholder_screen.dart';

/// Shell con bottom nav: Inicio · Sesiones · QR · Cuenta.
class MemberShell extends StatefulWidget {
  /// Crea el shell.
  const MemberShell({super.key});

  @override
  State<MemberShell> createState() => _MemberShellState();
}

class _MemberShellState extends State<MemberShell> {
  int _index = 0;

  static const _pages = [
    HomeScreen(),
    SessionsPlaceholderScreen(),
    QrScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final slug =
        context.watch<AuthController>().session?.tenantSlug.toUpperCase() ??
        'GYM';

    return Scaffold(
      appBar: AppBar(title: Text(slug)),
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Sesiones',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_2_outlined),
            selectedIcon: Icon(Icons.qr_code_2),
            label: 'QR',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Cuenta',
          ),
        ],
      ),
    );
  }
}
