import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';

/// Login afiliado o staff: slug + email + password (RN-ROL-005).
class LoginScreen extends StatefulWidget {
  /// Crea la pantalla.
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _slug = TextEditingController(text: 'gym-de-prueba');
  final _email = TextEditingController(text: 'socio@gymdeprueba.com');
  final _password = TextEditingController(text: 'ChangeMe123!');
  final _formKey = GlobalKey<FormState>();
  String _profile = 'MEMBER';

  @override
  void dispose() {
    _slug.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _setProfile(String profile) {
    setState(() {
      _profile = profile;
      if (profile == 'STAFF') {
        _email.text = 'admin@gymdeprueba.com';
      } else {
        _email.text = 'socio@gymdeprueba.com';
      }
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    final auth = context.read<AuthController>();
    final ok = await auth.login(
      tenantSlug: _slug.text,
      email: _email.text,
      password: _password.text,
      profileType: _profile,
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
                      _profile == 'STAFF'
                          ? 'Acceso staff'
                          : 'Acceso afiliado',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'MEMBER',
                          label: Text('Afiliado'),
                        ),
                        ButtonSegment(
                          value: 'STAFF',
                          label: Text('Staff'),
                        ),
                      ],
                      selected: {_profile},
                      onSelectionChanged: (s) => _setProfile(s.first),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _slug,
                      decoration: const InputDecoration(
                        labelText: 'Gym (slug)',
                        hintText: 'demo',
                      ),
                      textInputAction: TextInputAction.next,
                      validator: (v) => (v == null || v.trim().length < 2)
                          ? 'Slug requerido'
                          : null,
                    ),
                    const SizedBox(height: 12),
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
