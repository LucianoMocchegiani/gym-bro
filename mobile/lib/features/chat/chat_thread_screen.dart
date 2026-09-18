import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/loading_dialog.dart';
import '../auth/auth_controller.dart';
import 'assistant_icons.dart';
import 'chat_last_store.dart';
import 'chat_list_screen.dart';
import 'chat_repository.dart';

/// Conversación: historial + envío. El stream no bloquea; Parar aborta.
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
  late ChatRepository _repo;
  List<ChatMessage> _messages = const [];
  bool _listBusy = true;
  String? _listError;
  bool _streaming = false;
  bool _sseOpen = false;
  bool _completing = false;
  ChatMessage? _pendingUser;
  String _liveAssistant = '';
  String _queue = '';
  Timer? _tick;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _thread = widget.thread;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _repo = context.read<ChatRepository>();
    if (!_started) {
      _started = true;
      unawaited(_loadMessages());
    }
  }

  @override
  void dispose() {
    _tick?.cancel();
    _repo.abortTurn();
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

  Future<void> _loadMessages() async {
    try {
      final items = await _repo.listMessages(_thread.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages = items;
        _listBusy = false;
        _listError = null;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _listBusy = false;
        _listError = e is ApiException
            ? e.message
            : 'No se pudo cargar el hilo';
      });
    }
  }

  Future<void> _showThread(ChatThread thread) async {
    _repo.abortTurn();
    await _remember(thread.id);
    if (!mounted) {
      return;
    }
    setState(() {
      _thread = thread;
      _streaming = false;
      _sseOpen = false;
      _pendingUser = null;
      _liveAssistant = '';
      _queue = '';
      _tick?.cancel();
      _tick = null;
      _listBusy = true;
      _listError = null;
      _messages = const [];
    });
    await _loadMessages();
  }

  Future<void> _newChat() async {
    _repo.abortTurn();
    try {
      final created = await runWithLoadingDialog(
        context,
        message: 'Nuevo chat…',
        action: _repo.createThread,
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
    _repo.abortTurn();
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
    if (text.isEmpty || _streaming) {
      return;
    }
    _input.clear();
    _tick?.cancel();
    _tick = null;
    _completing = false;
    setState(() {
      _streaming = true;
      _sseOpen = true;
      _liveAssistant = '';
      _queue = '';
      _pendingUser = ChatMessage(
        id: 'pending',
        role: 'user',
        content: text,
      );
    });
    try {
      await _repo.sendTurn(
        _thread.id,
        text,
        onDelta: (delta) {
          _queue += delta;
          _scheduleDrain();
        },
      );
    } on ChatTurnAbortedException {
      // Recargamos lo tipeado / persistido.
    } catch (e) {
      if (mounted) {
        final msg = e is ApiException ? e.message : 'No se pudo enviar';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      _sseOpen = false;
      if (_queue.isEmpty) {
        await _completeStreaming();
      } else {
        _scheduleDrain();
      }
    }
  }

  String _nextChunk(String queue) {
    if (queue.isEmpty) {
      return '';
    }
    final space = queue.indexOf(' ');
    if (space > 0 && space <= 18) {
      return queue.substring(0, space + 1);
    }
    return queue.substring(0, queue.length < 2 ? queue.length : 2);
  }

  void _scheduleDrain() {
    _tick ??= Timer(const Duration(milliseconds: 32), _drain);
  }

  void _drain() {
    _tick = null;
    if (!mounted) {
      return;
    }
    final chunk = _nextChunk(_queue);
    if (chunk.isEmpty) {
      if (!_sseOpen) {
        unawaited(_completeStreaming());
      }
      return;
    }
    _queue = _queue.substring(chunk.length);
    setState(() {
      _liveAssistant += chunk;
    });
    _scheduleDrain();
  }

  Future<void> _completeStreaming() async {
    if (_completing || !mounted) {
      return;
    }
    _completing = true;
    _tick?.cancel();
    _tick = null;
    setState(() {
      _streaming = false;
      _pendingUser = null;
      _liveAssistant = '';
      _queue = '';
    });
    await _loadMessages();
    _completing = false;
  }

  void _stop() {
    _repo.abortTurn();
  }

  @override
  Widget build(BuildContext context) {
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
          Expanded(child: _buildThread(scheme)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      enabled: !_streaming,
                      decoration: const InputDecoration(
                        hintText: 'Mensaje',
                      ),
                      minLines: 1,
                      maxLines: 5,
                      keyboardType: TextInputType.multiline,
                      textInputAction: TextInputAction.newline,
                    ),
                  ),
                  IconButton(
                    tooltip: _streaming ? 'Parar' : 'Enviar',
                    onPressed: _streaming ? _stop : _send,
                    icon: Icon(_streaming ? Icons.stop_circle : Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThread(ColorScheme scheme) {
    if (_listBusy && _messages.isEmpty && _pendingUser == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_listError != null && _messages.isEmpty && _pendingUser == null) {
      return Center(child: Text(_listError!));
    }
    final live = _liveAssistant;
    final items = [
      ..._messages,
      ?_pendingUser,
      if (live.isNotEmpty)
        ChatMessage(id: 'live', role: 'assistant', content: live),
    ];
    if (items.isEmpty && !_streaming) {
      return const Center(child: Text('Escribí el primer mensaje.'));
    }
    final thinking = _streaming && live.isEmpty;
    final extra = thinking ? 1 : 0;
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      itemCount: items.length + extra,
      itemBuilder: (context, i) {
        if (thinking && i == 0) {
          return _thinkingBubble(scheme);
        }
        final m = items[items.length - 1 - (i - extra)];
        return _messageBubble(scheme, m);
      },
    );
  }

  Widget _thinkingBubble(ColorScheme scheme) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: scheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Pensando…',
              style: TextStyle(
                color: scheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageBubble(ColorScheme scheme, ChatMessage m) {
    final mine = m.role == 'user';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
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
  }
}
