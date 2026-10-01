import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'auth_controller.dart';

/// Cambiar contraseña (si tiene) o crearla (cuenta solo Google/Apple).
///
/// Cambiar cierra las sesiones de la persona en todos lados; la app vuelve a
/// entrar sola con la nueva. Crear no cierra nada (RN-MIG-003).
class PasswordScreen extends StatefulWidget {
  /// Crea la pantalla. [hasPassword] decide el modo.
  const PasswordScreen({super.key, required this.hasPassword});

  /// True → cambiar (pide la actual). False → crear.
  final bool hasPassword;

  @override
  State<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends State<PasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _repeat = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = context.read<AuthController>();
    try {
      if (widget.hasPassword) {
        await auth.changePassword(
          currentPassword: _current.text,
          newPassword: _next.text,
        );
      } else {
        await auth.createPassword(newPassword: _next.text);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.hasPassword ? 'Contraseña cambiada' : 'Contraseña creada',
          ),
        ),
      );
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() {
        _error = e.statusCode == 401
            ? 'La contraseña actual no es correcta'
            : e.message;
      });
    } catch (_) {
      setState(() => _error = 'No se pudo guardar la contraseña');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _validateNew(String? value) {
    final v = value ?? '';
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (v.length > 128) return 'Máximo 128 caracteres';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.hasPassword
        ? 'Cambiar contraseña'
        : 'Crear contraseña';
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                widget.hasPassword
                    ? 'Se cierran tus sesiones en otros dispositivos. '
                          'En este celular seguís adentro.'
                    : 'Vas a poder entrar también con tu mail y esta contraseña.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              if (widget.hasPassword) ...[
                TextFormField(
                  controller: _current,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: const InputDecoration(
                    labelText: 'Contraseña actual',
                  ),
                  validator: (v) =>
                      (v ?? '').isEmpty ? 'Ingresá la contraseña actual' : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _next,
                obscureText: true,
                autofillHints: const [AutofillHints.newPassword],
                decoration: const InputDecoration(
                  labelText: 'Nueva contraseña',
                ),
                validator: _validateNew,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _repeat,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Repetir contraseña',
                ),
                validator: (v) =>
                    v != _next.text ? 'No coincide con la nueva' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? 'Guardando…' : title),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
