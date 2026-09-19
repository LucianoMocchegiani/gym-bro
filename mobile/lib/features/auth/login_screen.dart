import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';

/// Login de cuenta Faciliter (email + password). Sin slug ni switch de perfil.
class LoginScreen extends StatefulWidget {
  /// Crea la pantalla.
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'socio@gymdeprueba.com');
  final _password = TextEditingController(text: 'ChangeMe123!');
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    final auth = context.read<AuthController>();
    final ok = await auth.login(
      email: _email.text,
      password: _password.text,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(auth.error ?? 'Error de login')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Faciliter',
                      style: Theme.of(context).textTheme.headlineLarge
                          ?.copyWith(color: scheme.primary, letterSpacing: 2),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tu cuenta',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _email,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      validator: (v) => (v == null || !v.contains('@'))
                          ? 'Email inválido'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _password,
                      decoration: const InputDecoration(labelText: 'Password'),
                      obscureText: true,
                      onFieldSubmitted: (_) => _submit(),
                      validator: (v) => (v == null || v.length < 8)
                          ? 'Mínimo 8 caracteres'
                          : null,
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: auth.busy ? null : _submit,
                      child: Text(auth.busy ? 'Entrando…' : 'Entrar'),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Demo',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        ActionChip(
                          label: const Text('Socio'),
                          onPressed: () {
                            _email.text = 'socio@gymdeprueba.com';
                          },
                        ),
                        ActionChip(
                          label: const Text('Admin'),
                          onPressed: () {
                            _email.text = 'admin@gymdeprueba.com';
                          },
                        ),
                        ActionChip(
                          label: const Text('Entrenador'),
                          onPressed: () {
                            _email.text = 'entrenador@gymdeprueba.com';
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
