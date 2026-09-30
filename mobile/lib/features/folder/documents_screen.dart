import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/network/api_client.dart';
import 'folder_repository.dart';

/// Documentos: notas y files de la carpeta (solo lectura).
///
/// CU-FOL-003. Socio y staff usan el mismo `GET /me/folder`.
class DocumentsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  List<FolderItem>? _items;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
    });
    try {
      final items = await context.read<FolderRepository>().listMine();
      if (!mounted) {
        return;
      }
      setState(() => _items = items);
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _error = e);
    }
  }

  Future<void> _openFile(FolderItem item) async {
    final repo = context.read<FolderRepository>();
    try {
      final bytes = await repo.downloadMine(item.id);
      if (!mounted) {
        return;
      }
      if (item.mime?.startsWith('image/') == true) {
        await showDialog<void>(
          context: context,
          builder: (ctx) => Dialog(
            child: Image.memory(bytes, fit: BoxFit.contain),
          ),
        );
        return;
      }
      final dir = await getTemporaryDirectory();
      final name = item.originalFilename ?? 'documento.pdf';
      final file = File('${dir.path}/$name');
      await file.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(files: [XFile(file.path)]),
      );
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _openNote(FolderItem item) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(item.displayTitle),
        content: SingleChildScrollView(child: Text(item.body ?? '')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    return Scaffold(
      appBar: AppBar(title: const Text('Documentos')),
      body: items == null && _error == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Text(
                    _error is ApiException
                        ? (_error as ApiException).message
                        : 'No se pudo cargar',
                  ),
                )
              : items!.isEmpty
                  ? const Center(child: Text('No hay documentos'))
                  : ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, index) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final it = items[i];
                        final sub = [
                          if (it.labelName != null) it.labelName!,
                          it.createdAt.toLocal().toString().split('.').first,
                        ].join(' · ');
                        return ListTile(
                          leading: Icon(
                            it.kind == 'NOTE'
                                ? Icons.notes_outlined
                                : Icons.insert_drive_file_outlined,
                          ),
                          title: Text(it.displayTitle),
                          subtitle: Text(sub),
                          onTap: () {
                            if (it.kind == 'NOTE') {
                              _openNote(it);
                            } else {
                              _openFile(it);
                            }
                          },
                        );
                      },
                    ),
    );
  }
}
