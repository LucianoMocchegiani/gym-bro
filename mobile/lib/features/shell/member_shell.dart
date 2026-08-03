import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../access/access_screen.dart';
import '../auth/auth_controller.dart';
import '../home/home_screen.dart';
import '../settings/settings_screen.dart';

/// Shell con 3 hubs: Inicio · Acceso · Ajustes.
class MemberShell extends StatefulWidget {
  /// Crea el shell.
  const MemberShell({super.key});

  @override
  State<MemberShell> createState() => _MemberShellState();
}

class _MemberShellState extends State<MemberShell> {
  int _index = 0;

  static const _titles = ['Inicio', 'Acceso', 'Ajustes'];

  @override
  Widget build(BuildContext context) {
    final slug =
        context.watch<AuthController>().session?.tenantSlug.toUpperCase() ??
        'GYM';

    return Scaffold(
      appBar: AppBar(
        title: Text(_index == 0 ? slug : _titles[_index]),
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          HomeScreen(),
          AccessScreen(),
          SettingsScreen(),
        ],
      ),
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
            icon: Icon(Icons.qr_code_scanner_outlined),
            selectedIcon: Icon(Icons.qr_code_scanner),
            label: 'Acceso',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }
}
