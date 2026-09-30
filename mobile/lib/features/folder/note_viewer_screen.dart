import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import 'folder_repository.dart';

/// Lectura de una nota en Markdown (CU-FOL-003 / RN-FOL-005).
class NoteViewerScreen extends StatelessWidget {
  /// Crea el visor.
  const NoteViewerScreen({required this.item, super.key});

  /// Ítem `NOTE` con `body` Markdown.
  final FolderItem item;

  @override
  Widget build(BuildContext context) {
    final body = item.body?.trim() ?? '';
    return Scaffold(
      appBar: AppBar(title: Text(item.displayTitle)),
      body: body.isEmpty
          ? const Center(child: Text('Sin contenido'))
          : Markdown(
              data: body,
              selectable: true,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              onTapLink: (text, href, title) {
                if (href == null) {
                  return;
                }
                final uri = Uri.tryParse(href);
                if (uri == null) {
                  return;
                }
                unawaited(
                  launchUrl(uri, mode: LaunchMode.externalApplication),
                );
              },
            ),
    );
  }
}
