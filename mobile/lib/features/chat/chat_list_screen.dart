import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'assistant_icons.dart';
import 'chat_repository.dart';

/// Historial de hilos (reloj del asistente).
class ChatListScreen extends StatefulWidget {
  /// Crea la pantalla.
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  Future<List<ChatThread>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= context.read<ChatRepository>().listThreads();
  }

  Future<void> _reload() async {
    setState(() {
      _future = context.read<ChatRepository>().listThreads();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final future = _future;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            AssistantIcons.history(color: scheme.onSurface),
            const SizedBox(width: 8),
            const Text('Chats anteriores'),
          ],
        ),
      ),
      body: future == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _reload,
              child: FutureBuilder<List<ChatThread>>(
                future: future,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snap.hasError) {
                    final msg = snap.error is ApiException
                        ? (snap.error! as ApiException).message
                        : 'No se pudo cargar el chat';
                    return ListView(
                      children: [
                        ListTile(
                          title: Text(msg),
                          trailing: TextButton(
                            onPressed: _reload,
                            child: const Text('Reintentar'),
                          ),
                        ),
                      ],
                    );
                  }
                  final items = snap.data ?? const <ChatThread>[];
                  if (items.isEmpty) {
                    return ListView(
                      children: const [
                        Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('No hay chats anteriores.'),
                        ),
                      ],
                    );
                  }
                  return ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, i) {
                      final t = items[i];
                      return ListTile(
                        title: Text(t.displayTitle),
                        onTap: () => Navigator.of(context).pop(t),
                      );
                    },
                  );
                },
              ),
            ),
    );
  }
}
