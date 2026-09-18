import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/loading_dialog.dart';
import '../auth/auth_controller.dart';
import 'assistant_icons.dart';
import 'chat_last_store.dart';
import 'chat_list_screen.dart';
import 'chat_repository.dart';

/// Conversación: historial + envío (el stream se espera y luego se recarga).
class ChatThreadScreen extends StatefulWidget {
  /// Crea la pantalla.
  const ChatThreadScreen({super.key, required this.thread});

  final ChatThread thread;

  @override
  State<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends State<ChatThreadScreen> {
  final _input = TextEditingController();
  late ChatThread _thread;
  Future<List<ChatMessage>>? _future;

  @override
  void initState() {
    super.initState();
    _thread = widget.thread;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??=
        context.read<ChatRepository>().listMessages(_thread.id);
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _remember(String conversationId) async {
    final session = context.read<AuthController>().session;
    if (session == null) {
      return;
    }
    await ChatLastStore.write(
      tenantId: session.tenantId,
      userId: session.userId,
      conversationId: conversationId,
    );
  }

  Future<void> _showThread(ChatThread thread) async {
    await _remember(thread.id);
    if (!mounted) {
      return;
    }
    setState(() {
      _thread = thread;
      _future = context.read<ChatRepository>().listMessages(thread.id);
    });
    await _future;
  }

  Future<void> _reload() async {
    setState(() {
      _future = context.read<ChatRepository>().listMessages(_thread.id);
    });
    await _future;
  }

  Future<void> _newChat() async {
    final repo = context.read<ChatRepository>();
    try {
      final created = await runWithLoadingDialog(
        context,
        message: 'Nuevo chat…',
        action: repo.createThread,
      );
      if (!mounted) {
        return;
      }
      await _showThread(created);
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo crear el chat';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _openHistory() async {
    final picked = await Navigator.of(context).push<ChatThread>(
      MaterialPageRoute(
        builder: (_) => const ChatListScreen(),
      ),
    );
    if (picked == null || !mounted) {
      return;
    }
    await _showThread(picked);
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) {
      return;
    }
    final repo = context.read<ChatRepository>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Pensando…',
        action: () => repo.sendTurn(_thread.id, text),
      );
      _input.clear();
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo enviar';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final future = _future;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            AssistantIcons.sparkle(color: scheme.onSurface),
            const SizedBox(width: 8),
            const Text('Asistente'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Nuevo chat',
            onPressed: _newChat,
            icon: AssistantIcons.newChat(color: scheme.onSurface),
          ),
          IconButton(
            tooltip: 'Chats anteriores',
            onPressed: _openHistory,
            icon: AssistantIcons.history(color: scheme.onSurface),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: future == null
                ? const Center(child: CircularProgressIndicator())
                : FutureBuilder<List<ChatMessage>>(
                    future: future,
                    builder: (context, snap) {
                      if (snap.connectionState != ConnectionState.done) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snap.hasError) {
                        final msg = snap.error is ApiException
                            ? (snap.error! as ApiException).message
                            : 'No se pudo cargar el hilo';
                        return Center(child: Text(msg));
                      }
                      final items = snap.data ?? const <ChatMessage>[];
                      if (items.isEmpty) {
                        return const Center(
                          child: Text('Escribí el primer mensaje.'),
                        );
                      }
                      return ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        itemCount: items.length,
                        itemBuilder: (context, i) {
                          final m = items[items.length - 1 - i];
                          final mine = m.role == 'user';
                          return Align(
                            alignment: mine
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              constraints: const BoxConstraints(maxWidth: 320),
                              decoration: BoxDecoration(
                                color: mine
                                    ? scheme.primaryContainer
                                    : scheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(m.content),
                            ),
                          );
                        },
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(
                        hintText: 'Mensaje',
                      ),
                      minLines: 1,
                      maxLines: 4,
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(
                    onPressed: _send,
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
