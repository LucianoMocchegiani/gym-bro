import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/features/auth/session_store.dart';

void main() {
  test('clears only an undecryptable session value', () async {
    final storage = _FakeSecureStorage()
      ..values['faciliter.app.session'] = 'unreadable'
      ..values['faciliter.wallet.secret'] = 'wallet-secret'
      ..failures['faciliter.app.session'] = PlatformException(
        code: 'Exception encountered',
        message: 'read, javax.crypto.BadPaddingException: BAD_DECRYPT',
      );

    expect(await SessionStore(storage: storage).read(), isNull);
    expect(storage.values, {'faciliter.wallet.secret': 'wallet-secret'});
  });

  test('propagates unrelated secure-storage errors', () async {
    final storage = _FakeSecureStorage()
      ..values['faciliter.app.session'] = 'session'
      ..failures['faciliter.app.session'] = PlatformException(
        code: 'storage unavailable',
      );

    await expectLater(
      SessionStore(storage: storage).read(),
      throwsA(isA<PlatformException>()),
    );
    expect(storage.values, contains('faciliter.app.session'));
  });
}

class _FakeSecureStorage extends FlutterSecureStorage {
  final values = <String, String>{};
  final failures = <String, PlatformException>{};

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    final failure = failures[key];
    if (failure != null) throw failure;
    return values[key];
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    values.remove(key);
  }
}
