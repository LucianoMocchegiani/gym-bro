import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/network/api_client.dart';
import 'core/theme/gymbro_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/account/account_repository.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/auth_repository.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/session_store.dart';
import 'features/cart/member_cart_controller.dart';
import 'features/credentials/credential_offers_repository.dart';
import 'features/credentials/member_wallet_service.dart';
import 'features/sessions/sessions_repository.dart';
import 'features/shell/member_shell.dart';
import 'features/store/store_repository.dart';
import 'features/store/refund_repository.dart';
import 'features/store/receipts_repository.dart';

/// Punto de entrada de la app afiliado GymBro.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GymBroMemberApp());
}

/// App raíz: tema + auth + shell.
class GymBroMemberApp extends StatefulWidget {
  /// Crea la app.
  const GymBroMemberApp({super.key});

  @override
  State<GymBroMemberApp> createState() => _GymBroMemberAppState();
}

class _GymBroMemberAppState extends State<GymBroMemberApp> {
  late final ApiClient _api;
  late final SessionStore _store;
  late final AuthRepository _authRepo;
  late final AuthController _auth;
  late final ThemeController _theme;
  late final AccountRepository _accountRepo;
  late final CredentialOffersRepository _offersRepo;
  late final SessionsRepository _sessionsRepo;
  late final StoreRepository _storeRepo;
  late final RefundRepository _refundRepo;
  late final ReceiptsRepository _receiptsRepo;
  late final MemberWalletService _wallet;
  late final MemberCartController _cart;

  @override
  void initState() {
    super.initState();
    _api = ApiClient();
    _store = SessionStore();
    _authRepo = AuthRepository(api: _api, store: _store);
    _theme = ThemeController();
    _accountRepo = AccountRepository(_api);
    _offersRepo = CredentialOffersRepository(_api);
    _sessionsRepo = SessionsRepository(_api);
    _storeRepo = StoreRepository(_api);
    _refundRepo = RefundRepository(_api);
    _receiptsRepo = ReceiptsRepository(_api);
    _wallet = MemberWalletService();
    _cart = MemberCartController();
    _auth = AuthController(auth: _authRepo, api: _api, wallet: _wallet);
    _auth.addListener(_clearCartOnLogout);
    _bootstrap();
  }

  void _clearCartOnLogout() {
    if (!_auth.isAuthenticated) _cart.clear();
  }

  @override
  void dispose() {
    _auth.removeListener(_clearCartOnLogout);
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await Future.wait([_theme.load(), _auth.bootstrap()]);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _theme),
        Provider.value(value: _accountRepo),
        Provider.value(value: _offersRepo),
        Provider.value(value: _sessionsRepo),
        Provider.value(value: _storeRepo),
        Provider.value(value: _refundRepo),
        Provider.value(value: _receiptsRepo),
        ChangeNotifierProvider.value(value: _wallet),
        ChangeNotifierProvider.value(value: _cart),
      ],
      child: Consumer2<ThemeController, AuthController>(
        builder: (context, theme, auth, _) {
          return MaterialApp(
            title: 'GymBro',
            debugShowCheckedModeBanner: false,
            theme: GymBroTheme.light(),
            darkTheme: GymBroTheme.dark(),
            themeMode: theme.isDark ? ThemeMode.dark : ThemeMode.light,
            home: !auth.ready || !theme.ready
                ? const Scaffold(
                    body: Center(child: CircularProgressIndicator()),
                  )
                : auth.isAuthenticated
                ? const MemberShell()
                : const LoginScreen(),
          );
        },
      ),
    );
  }
}
