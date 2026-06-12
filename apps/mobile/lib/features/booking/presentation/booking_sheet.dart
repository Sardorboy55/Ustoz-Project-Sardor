import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../data/booking_repository.dart';

String _fmtUzs(num tiyin) {
  final uzs = (tiyin / 100).round().toString();
  return uzs.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ');
}

/// Books a lesson with [teacher] (docs/04 §4.3): subject → duration → slot.
Future<void> showBookingSheet(BuildContext context, Map<String, dynamic> teacher) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => BookingSheet(teacher: teacher),
  );
}

class BookingSheet extends ConsumerStatefulWidget {
  const BookingSheet({super.key, required this.teacher});

  final Map<String, dynamic> teacher;

  @override
  ConsumerState<BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends ConsumerState<BookingSheet> {
  late final List<Map<String, dynamic>> _subjects;
  Map<String, dynamic>? _subject;
  int? _duration;
  bool _trial = false;
  DateTime _day = DateTime.now();
  List<DateTime>? _slots;
  DateTime? _slot;
  bool _booking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _subjects = (widget.teacher['teacher_subjects'] as List? ?? [])
        .cast<Map<String, dynamic>>()
        .where((s) => s['is_active'] == true)
        .toList();
    if (_subjects.length == 1) _subject = _subjects.first;
  }

  List<int> get _durations {
    final s = _subject;
    if (s == null) return const [];
    return [
      if (s['price_30'] != null) 30,
      60,
      if (s['price_90'] != null) 90,
    ];
  }

  num? get _price {
    final s = _subject;
    if (s == null || _duration == null) return null;
    if (_trial) return 0;
    return s['price_$_duration'] as num?;
  }

  Future<void> _loadSlots() async {
    if (_subject == null || _duration == null) return;
    setState(() => _slots = null);
    try {
      final all = await ref.read(bookingRepositoryProvider).fetchFreeSlots(
            teacherId: widget.teacher['user_id'] as String,
            from: _day,
            to: _day,
            durationMin: _trial ? 20 : _duration!,
          );
      if (mounted) setState(() => _slots = all);
    } catch (_) {
      if (mounted) setState(() => _slots = const []);
    }
  }

  Future<void> _confirm() async {
    final l10n = AppLocalizations.of(context)!;
    if (_subject == null || _slot == null) return;
    setState(() {
      _booking = true;
      _error = null;
    });
    try {
      await ref.read(bookingRepositoryProvider).createBooking(
            teacherSubjectId: _subject!['id'] as String,
            startAt: _slot!,
            durationMin: _trial ? 20 : _duration!,
            kind: _trial ? 'trial_free' : 'regular',
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.bookingCreated)));
      context.push('/lessons');
    } on BookingException catch (e) {
      if (e.code == 'UNAUTHENTICATED') {
        // dead session (e.g. revoked server-side) — restart auth
        if (mounted) {
          Navigator.of(context).pop();
          context.go('/');
        }
        return;
      }
      setState(() {
        _error = switch (e.code) {
          'SLOT_TAKEN' => l10n.bookingSlotTaken,
          'TRIAL_USED' => l10n.bookingTrialUsed,
          'TEACHER_LIMIT' => l10n.bookingSlotTaken,
          _ => l10n.commonError,
        };
      });
    } catch (_) {
      setState(() => _error = l10n.commonError);
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;
    final scheme = Theme.of(context).colorScheme;
    final days = List.generate(14, (i) => DateTime.now().add(Duration(days: i)));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        children: [
          Text(l10n.bookingTitle, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          DropdownButtonFormField<Map<String, dynamic>>(
            initialValue: _subject,
            isExpanded: true,
            decoration: InputDecoration(labelText: l10n.teacherSubject),
            items: [
              for (final s in _subjects)
                DropdownMenuItem(
                  value: s,
                  child: Builder(builder: (context) {
                    final subj =
                        (s['subjects'] as Map?)?.cast<String, dynamic>() ?? const {};
                    return Text(
                      (locale == 'ru' ? subj['name_ru'] : subj['name_uz'])
                              as String? ??
                          '',
                      overflow: TextOverflow.ellipsis,
                    );
                  }),
                ),
            ],
            onChanged: (v) => setState(() {
              _subject = v;
              _duration = null;
              _trial = false;
              _slots = null;
              _slot = null;
            }),
          ),
          const SizedBox(height: 12),
          if (_subject != null) ...[
            Wrap(
              spacing: 8,
              children: [
                for (final d in _durations)
                  ChoiceChip(
                    label: Text('$d ${l10n.minutes}'),
                    selected: !_trial && _duration == d,
                    onSelected: (_) => setState(() {
                      _duration = d;
                      _trial = false;
                      _slot = null;
                      _loadSlots();
                    }),
                  ),
                if (_subject!['trial_free_enabled'] == true)
                  ChoiceChip(
                    label: Text(l10n.bookingTrialChoice),
                    selected: _trial,
                    onSelected: (_) => setState(() {
                      _trial = true;
                      _duration = 20;
                      _slot = null;
                      _loadSlots();
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          if (_duration != null) ...[
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: days.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final d = days[i];
                  final selected = d.day == _day.day && d.month == _day.month;
                  return ChoiceChip(
                    label: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${d.day}.${d.month.toString().padLeft(2, '0')}'),
                        Text(
                          ['', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'][d.weekday],
                          style: const TextStyle(fontSize: 11),
                        ),
                      ],
                    ),
                    selected: selected,
                    onSelected: (_) => setState(() {
                      _day = d;
                      _slot = null;
                      _loadSlots();
                    }),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            if (_slots == null)
              const Center(
                  child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ))
            else if (_slots!.isEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Center(child: Text(l10n.bookingNoSlots)),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in _slots!)
                    ChoiceChip(
                      label: Text(
                        '${s.toLocal().hour.toString().padLeft(2, '0')}:${s.toLocal().minute.toString().padLeft(2, '0')}',
                      ),
                      selected: _slot == s,
                      onSelected: (_) => setState(() => _slot = s),
                    ),
                ],
              ),
            const SizedBox(height: 16),
          ],
          if (_price != null && _slot != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _trial
                    ? l10n.bookingFreeTrialLabel
                    : '${l10n.bookingTotal}: ${_fmtUzs(_price!)} UZS',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: TextStyle(color: scheme.error)),
            ),
          FilledButton(
            onPressed: _slot != null && !_booking ? _confirm : null,
            child: _booking
                ? const SizedBox(
                    width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                : Text(l10n.bookingConfirm),
          ),
        ],
      ),
    );
  }
}
