import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';
import '../staff_caja/staff_caja_screen.dart';
import '../staff_sessions/staff_calendar_screen.dart';

/// Hub Inicio staff: saludo y atajos Sesiones / Caja.
class StaffHomeScreen extends StatelessWidget {
  /// Crea la pantalla.
  const StaffHomeScreen({super.key});

  void _open(BuildContext context, Widget page) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final session = auth.session;
    final hello = session?.name?.trim().isNotEmpty == true
        ? session!.name!
        : (session?.email ?? 'staff');
    final scheme = Theme.of(context).colorScheme;
    final caja = auth.canOperateCashier;
    final sesiones = auth.canWriteSessions;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        Text(
          'Hola,',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: scheme.onSurface.withValues(alpha: 0.55),
              ),
        ),
        Text(
          hello,
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                letterSpacing: 0.2,
              ),
        ),
        const SizedBox(height: 28),
        Text(
          'Ir a',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            if (sesiones)
              Expanded(
                child: _HubTile(
                  icon: Icons.calendar_today_outlined,
                  label: 'Sesiones',
                  subtitle: 'Clases',
                  onTap: () => _open(context, const StaffCalendarScreen()),
                ),
              ),
            if (sesiones && caja) const SizedBox(width: 12),
            if (caja)
              Expanded(
                child: _HubTile(
                  icon: Icons.point_of_sale_outlined,
                  label: 'Caja',
                  subtitle: 'Cobros',
                  onTap: () => _open(context, const StaffCajaScreen()),
                ),
              ),
          ],
        ),
        if (!sesiones && !caja)
          Text(
            'Tu rol no tiene Sesiones ni Caja. Pedile al admin que te asigne permisos.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
      ],
    );
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.55)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 28, color: scheme.primary),
                const SizedBox(height: 12),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.55),
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
