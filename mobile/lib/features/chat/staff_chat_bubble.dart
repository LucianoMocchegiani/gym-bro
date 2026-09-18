import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/loading_dialog.dart';
import '../auth/auth_controller.dart';
import 'assistant_icons.dart';
import 'chat_last_store.dart';
import 'chat_repository.dart';
import 'chat_thread_screen.dart';

/// Burbuja del asistente, arrastrable (como el panel web).
class StaffChatBubble extends StatefulWidget {
  /// Crea la burbuja.
  const StaffChatBubble({super.key});

  @override
  State<StaffChatBubble> createState() => _StaffChatBubbleState();
}

class _StaffChatBubbleState extends State<StaffChatBubble> {
  static const _size = 56.0;
  static const _margin = 16.0;
  static const _posXKey = 'faciliter.staff.chat.bubble.x';
  static const _posYKey = 'faciliter.staff.chat.bubble.y';

  Offset? _pos;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadPos();
  }

  Future<void> _loadPos() async {
    final prefs = await SharedPreferences.getInstance();
    final x = prefs.getDouble(_posXKey);
    final y = prefs.getDouble(_posYKey);
    if (!mounted) {
      return;
    }
    setState(() {
      if (x != null && y != null) {
        _pos = Offset(x, y);
      }
      _loaded = true;
    });
  }

  Future<void> _savePos(Offset pos) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_posXKey, pos.dx);
    await prefs.setDouble(_posYKey, pos.dy);
  }

  Offset _defaultPos(Size screen, EdgeInsets padding) {
    return Offset(
      screen.width - _size - _margin - padding.right,
      screen.height - _size - _margin - padding.bottom - 88,
    );
  }

  Offset _clamp(Offset raw, Size screen, EdgeInsets padding) {
    final minX = padding.left + _margin;
    final minY = padding.top + _margin;
    final maxX = screen.width - _size - padding.right - _margin;
    final maxY = screen.height - _size - padding.bottom - _margin;
    return Offset(
      raw.dx.clamp(minX, maxX < minX ? minX : maxX),
      raw.dy.clamp(minY, maxY < minY ? minY : maxY),
    );
  }

  Future<void> _openChat() async {
    final repo = context.read<ChatRepository>();
    final session = context.read<AuthController>().session;
    if (session == null) {
      return;
    }
    try {
      final thread = await runWithLoadingDialog(
        context,
        message: 'Abriendo chat…',
        action: () async {
          final items = await repo.listThreads();
          final lastId = await ChatLastStore.read(
            tenantId: session.tenantId,
            userId: session.userId,
          );
          ChatThread? picked;
          if (lastId != null) {
            for (final item in items) {
              if (item.id == lastId) {
                picked = item;
                break;
              }
            }
          }
          picked ??= items.isNotEmpty ? items.first : await repo.createThread();
          await ChatLastStore.write(
            tenantId: session.tenantId,
            userId: session.userId,
            conversationId: picked.id,
          );
          return picked;
        },
      );
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatThreadScreen(thread: thread),
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo abrir el chat';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return const SizedBox.shrink();
    }
    final media = MediaQuery.of(context);
    final screen = media.size;
    final padding = media.padding;
    final pos = _clamp(_pos ?? _defaultPos(screen, padding), screen, padding);

    return Positioned(
      left: pos.dx,
      top: pos.dy,
      child: GestureDetector(
        onTap: _openChat,
        onPanUpdate: (d) {
          final current = _pos ?? pos;
          setState(() {
            _pos = _clamp(current + d.delta, screen, padding);
          });
        },
        onPanEnd: (_) {
          final next = _clamp(_pos ?? pos, screen, padding);
          _pos = next;
          _savePos(next);
        },
        child: Tooltip(
          message: 'Asistente',
          child: Material(
            elevation: 6,
            shape: const CircleBorder(),
            color: Theme.of(context).colorScheme.primary,
            child: SizedBox(
              width: _size,
              height: _size,
              child: Center(
                child: AssistantIcons.sparkle(
                  size: 26,
                  color: Theme.of(context).colorScheme.onPrimary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
