import 'package:flutter/material.dart';

/// Iconos stroke del asistente (mismos trazos que el panel web).
class AssistantIcons {
  AssistantIcons._();

  /// Destellos de la burbuja / título.
  static Widget sparkle({double size = 22, Color? color}) {
    return _StrokeIcon(size: size, color: color, kind: _Kind.sparkle);
  }

  /// Lápiz: nuevo chat.
  static Widget newChat({double size = 22, Color? color}) {
    return _StrokeIcon(size: size, color: color, kind: _Kind.newChat);
  }

  /// Reloj: chats anteriores.
  static Widget history({double size = 22, Color? color}) {
    return _StrokeIcon(size: size, color: color, kind: _Kind.history);
  }
}

enum _Kind { sparkle, newChat, history }

class _StrokeIcon extends StatelessWidget {
  const _StrokeIcon({
    required this.size,
    required this.kind,
    this.color,
  });

  final double size;
  final Color? color;
  final _Kind kind;

  @override
  Widget build(BuildContext context) {
    final resolved =
        color ?? IconTheme.of(context).color ?? Theme.of(context).colorScheme.onSurface;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _StrokePainter(kind: kind, color: resolved),
      ),
    );
  }
}

class _StrokePainter extends CustomPainter {
  _StrokePainter({required this.kind, required this.color});

  final _Kind kind;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.75
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    switch (kind) {
      case _Kind.sparkle:
        _line(canvas, paint, const Offset(12, 3), const Offset(12, 6));
        _line(canvas, paint, const Offset(12, 18), const Offset(12, 21));
        _line(canvas, paint, const Offset(3, 12), const Offset(6, 12));
        _line(canvas, paint, const Offset(18, 12), const Offset(21, 12));
        _line(canvas, paint, const Offset(6.2, 6.2), const Offset(8.3, 8.3));
        _line(canvas, paint, const Offset(15.7, 15.7), const Offset(17.8, 17.8));
        _line(canvas, paint, const Offset(17.8, 6.2), const Offset(15.7, 8.3));
        _line(canvas, paint, const Offset(8.3, 15.7), const Offset(6.2, 17.8));
        canvas.drawCircle(const Offset(12, 12), 2.2, paint);
      case _Kind.newChat:
        _line(canvas, paint, const Offset(12, 20), const Offset(21, 20));
        final pencil = Path()
          ..moveTo(16.5, 3.5)
          ..lineTo(19.5, 6.5)
          ..lineTo(7, 19)
          ..lineTo(3, 20)
          ..lineTo(4, 16)
          ..close();
        canvas.drawPath(pencil, paint);
      case _Kind.history:
        canvas.drawCircle(const Offset(12, 12), 9, paint);
        _line(canvas, paint, const Offset(12, 7), const Offset(12, 12));
        _line(canvas, paint, const Offset(12, 12), const Offset(16, 14));
    }
    canvas.restore();
  }

  void _line(Canvas canvas, Paint paint, Offset a, Offset b) {
    canvas.drawLine(a, b, paint);
  }

  @override
  bool shouldRepaint(covariant _StrokePainter oldDelegate) {
    return oldDelegate.kind != kind || oldDelegate.color != color;
  }
}
