import 'package:flutter/material.dart';

/// Pestaña individual para [GymBroTabs].
class GymBroTab {
  /// Crea la pestaña.
  const GymBroTab({required this.label, this.icon});

  /// Texto de la pestaña.
  final String label;

  /// Icono opcional (antes del texto).
  final IconData? icon;
}

/// Barra de pestañas estilo web GymBro (texto + indicador lime inferior).
///
/// Reemplaza `SegmentedButton` y `TabBar` nativos con un look unificado:
/// - Fondo transparente (sin bloques grises).
/// - Texto selected = primary (lime), unselected = muted.
/// - Indicador inferior de 2px en primary.
/// - Icono opcional a la izquierda del texto.
///
/// Ejemplo:
/// ```dart
/// GymBroTabs(
///   tabs: [
///     GymBroTab(label: 'Clases', icon: Icons.calendar_month_outlined),
///     GymBroTab(label: 'Reservas', icon: Icons.event_available_outlined),
///   ],
///   selectedIndex: _tab.index,
///   onChanged: (i) => setState(() => _tab = _Tab.values[i]),
/// )
/// ```
class GymBroTabs extends StatelessWidget {
  /// Crea la barra de pestañas.
  const GymBroTabs({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    required this.onChanged,
    this.padding = const EdgeInsets.fromLTRB(20, 8, 20, 0),
  });

  /// Lista de pestañas.
  final List<GymBroTab> tabs;

  /// Índice de la pestaña seleccionada.
  final int selectedIndex;

  /// Callback al cambiar de pestaña.
  final ValueChanged<int> onChanged;

  /// Padding externo (default: misma que usaban las pantallas).
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              for (var i = 0; i < tabs.length; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                Expanded(
                  child: _TabItem(
                    tab: tabs[i],
                    selected: i == selectedIndex,
                    onTap: () => onChanged(i),
                  ),
                ),
              ],
            ],
          ),
          // Indicador inferior: línea de 2px
          _UnderlineIndicator(
            selectedIndex: selectedIndex,
            tabCount: tabs.length,
          ),
        ],
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final GymBroTab tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = selected ? scheme.primary : scheme.onSurface.withValues(alpha: 0.6);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (tab.icon != null) ...[
              Icon(tab.icon, size: 18, color: color),
              const SizedBox(width: 6),
            ],
            Text(
              tab.label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: color,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnderlineIndicator extends StatelessWidget {
  const _UnderlineIndicator({
    required this.selectedIndex,
    required this.tabCount,
  });

  final int selectedIndex;
  final int tabCount;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, constraints) {
        final tabWidth = constraints.maxWidth / tabCount;
        return Stack(
          children: [
            Container(
              height: 2,
              decoration: BoxDecoration(
                color: scheme.outline.withValues(alpha: 0.3),
              ),
            ),
            AnimatedPositioned(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              left: tabWidth * selectedIndex,
              width: tabWidth,
              child: Container(
                height: 2,
                decoration: BoxDecoration(
                  color: scheme.primary,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
