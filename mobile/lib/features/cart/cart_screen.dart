import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/shared_widgets.dart';
import '../store/store_repository.dart';
import 'member_cart_controller.dart';

/// Abre la pantalla del carrito (Tienda / Sesiones).
void openMemberCart(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => const CartScreen()),
  );
}

/// Botón de AppBar con badge de cantidad.
class CartAppBarButton extends StatelessWidget {
  /// Crea el botón.
  const CartAppBarButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<MemberCartController>(
      builder: (context, cart, _) {
        return IconButton(
          tooltip: 'Carrito',
          onPressed: () => openMemberCart(context),
          icon: Badge(
            isLabelVisible: cart.count > 0,
            label: Text('${cart.count}'),
            child: const Icon(Icons.shopping_cart_outlined),
          ),
        );
      },
    );
  }
}

/// Snackbar al agregar un ítem al carrito, con atajo para abrirlo.
void showAddedToCartSnack(BuildContext context) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: const Text('Agregado al carrito'),
        action: SnackBarAction(
          label: 'Ver',
          onPressed: () => openMemberCart(context),
        ),
      ),
    );
}

/// Lista el carrito y dispara `POST /me/transaction-items/mp/cart`.
class CartScreen extends StatefulWidget {
  /// Crea la pantalla.
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _busy = false;

  MemberCartController get _cart => context.read<MemberCartController>();
  StoreRepository get _store => context.read<StoreRepository>();

  Future<void> _pay() async {
    final cart = _cart;
    if (cart.isEmpty || _busy) return;

    setState(() => _busy = true);
    try {
      final mpOk = await _store.getMpConnected();
      if (!mounted) return;
      if (!mpOk) {
        _snack('El pago online no está disponible. Consultá en el gym.');
        return;
      }

      final result = await _store.startMpCart(
        items: cart.lines
            .map((line) => {'kind': line.apiKind, 'id': line.id})
            .toList(),
        idempotencyKey:
            'mp-cart-${DateTime.now().millisecondsSinceEpoch}',
      );
      if (!mounted) return;

      final url = result.checkoutUrl;
      if (url == null || url.isEmpty) {
        _snack('El pago no está disponible en este momento');
        return;
      }

      cart.clear();
      await _showCheckoutLinkDialog(url, result.amount);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('Algo salió mal, intentá de nuevo');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showCheckoutLinkDialog(String url, int amount) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Pagar en Mercado Pago'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Total \$$amount. Se abrirá Mercado Pago para completar el pago.',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            SelectableText(
              url,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                Navigator.pop(context);
                _snack('Link copiado');
              }
            },
            child: const Text('Copiar link'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } else if (mounted) {
                _snack('No se pudo abrir el navegador');
              }
            },
            child: const Text('Pagar'),
          ),
        ],
      ),
    );
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Consumer<MemberCartController>(
      builder: (context, cart, _) {
        return Scaffold(
          appBar: AppBar(title: const Text('Carrito')),
          body: cart.isEmpty
              ? const GymBroMessagePane(
                  icon: Icons.shopping_cart_outlined,
                  message: 'El carrito está vacío. Agregá packs o drop-in.',
                )
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                        itemCount: cart.lines.length,
                        itemBuilder: (context, i) {
                          final line = cart.lines[i];
                          return Padding(
                            padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
                            child: _CartLineCard(
                              line: line,
                              onRemove: _busy
                                  ? null
                                  : () => cart.remove(line.kind, line.id),
                            ),
                          );
                        },
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Total \$${cart.total}',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    color: scheme.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: _busy ? null : _pay,
                              child: _busy
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text('Pagar con Mercado Pago'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
        );
      },
    );
  }
}

class _CartLineCard extends StatelessWidget {
  const _CartLineCard({required this.line, required this.onRemove});

  final MemberCartLine line;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final kindLabel =
        line.kind == MemberCartKind.pack ? 'Pack' : 'Drop-in';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        line.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    GymBroBadge(label: kindLabel, color: scheme.secondary),
                  ],
                ),
                if (line.subtitle != null && line.subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    line.subtitle!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurface.withValues(alpha: 0.7),
                        ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  '\$${line.amount}',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Quitar',
            onPressed: onRemove,
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
    );
  }
}
