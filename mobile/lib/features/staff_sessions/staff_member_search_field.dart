import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'staff_sessions_repository.dart';

/// Combobox de afiliado: debounce 300 ms, 20 por página y «Cargar más».
///
/// Replica [MemberPicker] de la web (`CU-PAY-001` / roster staff).
class StaffMemberSearchField extends StatefulWidget {
  /// Crea el combobox.
  const StaffMemberSearchField({
    super.key,
    required this.onSelected,
    this.selected,
  });

  final StaffMemberHit? selected;
  final ValueChanged<StaffMemberHit?> onSelected;

  @override
  State<StaffMemberSearchField> createState() => _StaffMemberSearchFieldState();
}

class _StaffMemberSearchFieldState extends State<StaffMemberSearchField> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  final _overlay = OverlayPortalController();
  final _link = LayerLink();
  Timer? _debounce;
  int _seq = 0;
  String _query = '';
  List<StaffMemberHit> _hits = const [];
  int _page = 1;
  int _total = 0;
  bool _hasMore = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final sel = widget.selected;
    if (sel != null) {
      _controller.text = sel.displayName;
    }
    _focus.addListener(_onFocus);
  }

  @override
  void didUpdateWidget(covariant StaffMemberSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.selected;
    if (next != null && next.id != oldWidget.selected?.id) {
      _controller.text = next.displayName;
    }
    if (next == null && oldWidget.selected != null && !_focus.hasFocus) {
      _controller.clear();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _focus.removeListener(_onFocus);
    _focus.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocus() {
    if (_focus.hasFocus) {
      if (!_overlay.isShowing) {
        _overlay.show();
      }
      if (_hits.isEmpty && !_busy) {
        unawaited(_search(reset: true));
      }
    } else {
      Future<void>.delayed(const Duration(milliseconds: 180), () {
        if (!mounted || _focus.hasFocus) {
          return;
        }
        _overlay.hide();
      });
    }
  }

  void _onChanged(String text) {
    if (widget.selected != null) {
      widget.onSelected(null);
    }
    _query = text;
    if (!_overlay.isShowing) {
      _overlay.show();
    }
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      unawaited(_search(reset: true));
    });
  }

  Future<void> _search({required bool reset}) async {
    final seq = ++_seq;
    final page = reset ? 1 : _page + 1;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await context.read<StaffSessionsRepository>().searchMembers(
        query: _query,
        page: page,
      );
      if (!mounted || seq != _seq) {
        return;
      }
      setState(() {
        _hits = reset ? res.items : [..._hits, ...res.items];
        _page = res.page;
        _total = res.total;
        _hasMore = res.hasMore;
        _busy = false;
      });
    } catch (e) {
      if (!mounted || seq != _seq) {
        return;
      }
      setState(() {
        _busy = false;
        _error = e is ApiException ? e.message : 'No se pudo buscar afiliados';
        if (reset) {
          _hits = const [];
          _hasMore = false;
        }
      });
    }
  }

  void _pick(StaffMemberHit hit) {
    widget.onSelected(hit);
    _controller.text = hit.displayName;
    _query = '';
    setState(() => _hits = const []);
    _overlay.hide();
    _focus.unfocus();
  }

  void _close() {
    _overlay.hide();
    _focus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected != null;
    return LayoutBuilder(
      builder: (context, constraints) {
        final fieldWidth = constraints.maxWidth;
        return OverlayPortal(
          controller: _overlay,
          overlayChildBuilder: (context) {
            return CompositedTransformFollower(
              link: _link,
              showWhenUnlinked: false,
              targetAnchor: Alignment.bottomLeft,
              followerAnchor: Alignment.topLeft,
              offset: const Offset(0, 4),
              child: TapRegion(
                groupId: this,
                child: _DropdownPanel(
                  width: fieldWidth,
                  hits: _hits,
                  selectedId: widget.selected?.id,
                  busy: _busy,
                  error: _error,
                  hasMore: _hasMore,
                  total: _total,
                  onPick: _pick,
                  onLoadMore: () => unawaited(_search(reset: false)),
                ),
              ),
            );
          },
          child: CompositedTransformTarget(
            link: _link,
            child: TapRegion(
              groupId: this,
              onTapOutside: (_) {
                if (_overlay.isShowing) {
                  _close();
                }
              },
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                onChanged: _onChanged,
                decoration: InputDecoration(
                  labelText: 'Afiliado',
                  hintText: 'Buscar por nombre o email…',
                  suffixIcon: selected
                      ? const Icon(Icons.check_circle, color: Colors.green)
                      : _busy
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : const Icon(Icons.expand_more),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DropdownPanel extends StatelessWidget {
  const _DropdownPanel({
    required this.width,
    required this.hits,
    required this.selectedId,
    required this.busy,
    required this.error,
    required this.hasMore,
    required this.total,
    required this.onPick,
    required this.onLoadMore,
  });

  final double width;
  final List<StaffMemberHit> hits;
  final String? selectedId;
  final bool busy;
  final String? error;
  final bool hasMore;
  final int total;
  final ValueChanged<StaffMemberHit> onPick;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      elevation: 8,
      color: scheme.surface,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        width: width,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 280),
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 6),
            shrinkWrap: true,
            children: [
              if (error != null)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(error!, style: TextStyle(color: scheme.error)),
                )
              else if (hits.isEmpty && !busy)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('Sin resultados'),
                ),
              ...hits.map((h) {
                final name = h.displayName;
                final showEmail = h.name?.trim().isNotEmpty == true;
                return ListTile(
                  dense: true,
                  selected: h.id == selectedId,
                  title: Text(name),
                  subtitle: showEmail ? Text(h.email) : null,
                  onTap: () => onPick(h),
                );
              }),
              if (busy)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('Buscando…'),
                ),
              if (hasMore)
                TextButton(
                  onPressed: onLoadMore,
                  child: Text('Cargar más ($total en total)'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
