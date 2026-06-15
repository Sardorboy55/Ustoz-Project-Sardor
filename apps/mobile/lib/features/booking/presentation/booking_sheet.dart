import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/loading_button.dart';
import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../data/booking_repository.dart';
import 'booking_success_screen.dart';

/// Books a lesson with [teacher] (docs/04 §4.3): subject → time → confirm.
/// [initialStart] preselects a slot (e.g. from the profile slots preview).
Future<void> showBookingSheet(
  BuildContext context,
  Map<String, dynamic> teacher, {
  DateTime? initialStart,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => BookingSheet(teacher: teacher, initialStart: initialStart),
  );
}

class BookingSheet extends ConsumerStatefulWidget {
  const BookingSheet({super.key, required this.teacher, this.initialStart});

  final Map<String, dynamic> teacher;
  final DateTime? initialStart;

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
  DateTime? _pendingSlot; // preselected from the profile preview
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

    final start = widget.initialStart;
    if (start != null && _subjects.isNotEmpty) {
      _subject ??= _subjects.first;
      _duration = 60;
      _day = start.toLocal();
      _pendingSlot = start;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadSlots());
    }
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

  // 0 = subject, 1 = time (duration + slot), 2 = confirm
  int get _step {
    if (_subject == null) return 0;
    if (_slot == null) return 1;
    return 2;
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
      if (!mounted) return;
      setState(() {
        _slots = all;
        final pending = _pendingSlot;
        if (pending != null) {
          _pendingSlot = null;
          for (final s in all) {
            if (s.millisecondsSinceEpoch == pending.millisecondsSinceEpoch) {
              _slot = s;
              break;
            }
          }
        }
      });
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
      final booking = await ref.read(bookingRepositoryProvider).createBooking(
            teacherSubjectId: _subject!['id'] as String,
            startAt: _slot!,
            durationMin: _trial ? 20 : _duration!,
            kind: _trial ? 'trial_free' : 'regular',
          );
      if (!mounted) return;
      final subj =
          (_subject!['subjects'] as Map?)?.cast<String, dynamic>() ?? const {};
      final teacherProfile =
          (widget.teacher['profiles'] as Map?)?.cast<String, dynamic>();
      final args = BookingSuccessArgs(
        booking: booking,
        teacherId: widget.teacher['user_id'] as String,
        teacherName: teacherProfile?['full_name'] as String? ?? '',
        subjectNameUz: subj['name_uz'] as String? ?? '',
        subjectNameRu: subj['name_ru'] as String? ?? '',
      );
      Navigator.of(context).pop();
      context.go('/booking-success', extra: args);
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
      _loadSlots(); // the chosen slot may be gone — refresh the grid
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
          _StepIndicator(
            current: _step,
            labels: [
              l10n.bookingStepSubject,
              l10n.bookingStepTime,
              l10n.bookingStepConfirm,
            ],
          ),
          const SizedBox(height: 16),
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
                  final selected = d.year == _day.year &&
                      d.month == _day.month &&
                      d.day == _day.day;
                  return ChoiceChip(
                    label: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${d.day}.${d.month.toString().padLeft(2, '0')}'),
                        Text(
                          formatTkWeekdayShort(d, locale),
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
                      label: Text(formatTkTime(s)),
                      selected: _slot == s,
                      onSelected: (_) => setState(() => _slot = s),
                    ),
                ],
              ),
            const SizedBox(height: 16),
          ],
          if (_slot != null && _subject != null) ...[
            _SummaryCard(
              teacher: widget.teacher,
              subject: _subject!,
              slot: _slot!,
              durationMin: _trial ? 20 : (_duration ?? 60),
              price: _price,
              trial: _trial,
            ),
            const SizedBox(height: 12),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: TextStyle(color: scheme.error)),
            ),
          LoadingButton(
            loading: _booking,
            onPressed: _slot != null ? _confirm : null,
            child: Text(l10n.bookingConfirm),
          ),
        ],
      ),
    );
  }
}

/// "1 Predmet — 2 Vaqt — 3 Tasdiqlash" progress strip.
class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.current, required this.labels});

  final int current; // 0-based
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final inactive = Theme.of(context).brightness == Brightness.light
        ? AppColors.zinc300
        : AppColors.zinc700;

    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                color: i <= current ? scheme.primary : inactive,
              ),
            ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i <= current ? scheme.primary : Colors.transparent,
                  border: Border.all(
                      color: i <= current ? scheme.primary : inactive,
                      width: 1.6),
                ),
                child: Center(
                  child: i < current
                      ? const Icon(Icons.check_rounded,
                          size: 16, color: Colors.white)
                      : Text(
                          '${i + 1}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: i <= current
                                ? Colors.white
                                : scheme.onSurfaceVariant,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                labels[i],
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: i == current ? FontWeight.w700 : FontWeight.w500,
                  color: i <= current
                      ? scheme.primary
                      : scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Order summary shown before confirming.
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.teacher,
    required this.subject,
    required this.slot,
    required this.durationMin,
    required this.price,
    required this.trial,
  });

  final Map<String, dynamic> teacher;
  final Map<String, dynamic> subject;
  final DateTime slot;
  final int durationMin;
  final num? price;
  final bool trial;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final teacherProfile =
        (teacher['profiles'] as Map?)?.cast<String, dynamic>();
    final subj = (subject['subjects'] as Map?)?.cast<String, dynamic>() ??
        const <String, dynamic>{};
    final subjectName = (locale.languageCode == 'ru'
            ? subj['name_ru']
            : subj['name_uz']) as String? ??
        '';

    Widget row(String label, String value, {bool bold = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 120,
                child: Text(
                  label,
                  style: TextStyle(
                      fontSize: 13, color: scheme.onSurfaceVariant),
                ),
              ),
              Expanded(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        );

    return Container(
      padding: const EdgeInsets.all(AppTokens.s12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.light
            ? AppColors.primaryTint
            : scheme.primaryContainer,
        borderRadius: BorderRadius.circular(AppTokens.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          row(l10n.roleTeacher,
              teacherProfile?['full_name'] as String? ?? ''),
          row(l10n.teacherSubject, subjectName),
          row(l10n.bookingDateTime,
              formatTkDateTime(slot, locale.languageCode)),
          row(l10n.bookingDuration, '$durationMin ${l10n.minutes}'),
          row(
            l10n.bookingTotal,
            trial
                ? l10n.bookingFreeTrialLabel
                : formatTiyin(price ?? 0, locale),
            bold: true,
          ),
          const SizedBox(height: AppTokens.s8),
          Row(
            children: [
              Icon(Icons.verified_user_outlined,
                  size: 15, color: scheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l10n.bookingPolicyFree,
                  style: TextStyle(fontSize: 12, color: scheme.primary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
