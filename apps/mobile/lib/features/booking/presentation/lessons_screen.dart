import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../profile/data/profile_repository.dart';
import '../data/booking_repository.dart';

class LessonsScreen extends ConsumerStatefulWidget {
  const LessonsScreen({super.key});

  @override
  ConsumerState<LessonsScreen> createState() => _LessonsScreenState();
}

class _LessonsScreenState extends ConsumerState<LessonsScreen> {
  bool _asTeacher = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(ownProfileProvider).value;
    final isTeacher = profile?['is_teacher'] == true;
    final lessons = ref.watch(myLessonsProvider(asTeacher: _asTeacher));

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.lessonsTitle),
          actions: [
            if (isTeacher)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: SegmentedButton<bool>(
                  showSelectedIcon: false,
                  style: const ButtonStyle(visualDensity: VisualDensity.compact),
                  segments: [
                    ButtonSegment(value: false, label: Text(l10n.roleStudent)),
                    ButtonSegment(value: true, label: Text(l10n.roleTeacher)),
                  ],
                  selected: {_asTeacher},
                  onSelectionChanged: (s) => setState(() => _asTeacher = s.first),
                ),
              ),
          ],
          bottom: TabBar(tabs: [
            Tab(text: l10n.lessonsUpcoming),
            Tab(text: l10n.lessonsPast),
          ]),
        ),
        body: lessons.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text(l10n.commonError)),
          data: (rows) {
            final now = DateTime.now();
            bool upcoming(Map<String, dynamic> b) =>
                DateTime.parse(b['start_at'] as String).toLocal().isAfter(now) &&
                ['pending_payment', 'paid', 'in_progress'].contains(b['status']);
            final up = rows.where(upcoming).toList().reversed.toList();
            final past = rows.where((b) => !upcoming(b)).toList();
            return TabBarView(children: [
              _LessonList(rows: up, asTeacher: _asTeacher, onChanged: () {
                ref.invalidate(myLessonsProvider);
              }),
              _LessonList(rows: past, asTeacher: _asTeacher, onChanged: () {
                ref.invalidate(myLessonsProvider);
              }),
            ]);
          },
        ),
      ),
    );
  }
}

class _LessonList extends ConsumerWidget {
  const _LessonList({
    required this.rows,
    required this.asTeacher,
    required this.onChanged,
  });

  final List<Map<String, dynamic>> rows;
  final bool asTeacher;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    if (rows.isEmpty) {
      return Center(child: Text(l10n.lessonsEmpty));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _LessonCard(
        booking: rows[i],
        asTeacher: asTeacher,
        onChanged: onChanged,
      ),
    );
  }
}

class _LessonCard extends ConsumerWidget {
  const _LessonCard({
    required this.booking,
    required this.asTeacher,
    required this.onChanged,
  });

  final Map<String, dynamic> booking;
  final bool asTeacher;
  final VoidCallback onChanged;

  (Color, String) _statusChip(BuildContext context, AppLocalizations l10n) {
    final scheme = Theme.of(context).colorScheme;
    return switch (booking['status'] as String) {
      'pending_payment' => (Colors.orange.shade100, l10n.statusPendingPayment),
      'paid' => (scheme.primaryContainer, l10n.statusPaid),
      'in_progress' => (scheme.tertiaryContainer, l10n.statusInProgress),
      'completed' => (Colors.green.shade100, l10n.statusCompleted),
      'cancelled_by_student' || 'cancelled_by_teacher' => (
          Colors.red.shade100,
          l10n.statusCancelled
        ),
      'expired' => (Colors.grey.shade300, l10n.statusExpired),
      _ => (Colors.grey.shade200, booking['status'] as String),
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;
    final start = DateTime.parse(booking['start_at'] as String).toLocal();
    final subj = ((booking['teacher_subjects'] as Map?)?['subjects'] as Map?)
            ?.cast<String, dynamic>() ??
        const {};
    final subjectName =
        (locale == 'ru' ? subj['name_ru'] : subj['name_uz']) as String? ?? '';
    final other = asTeacher
        ? ((booking['student'] as Map?)?['full_name'] as String? ?? '')
        : (((booking['teacher'] as Map?)?['profiles'] as Map?)?['full_name']
                as String? ??
            '');
    final (chipColor, chipText) = _statusChip(context, l10n);
    final cancellable =
        ['pending_payment', 'paid'].contains(booking['status']) &&
            start.isAfter(DateTime.now());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${start.day.toString().padLeft(2, '0')}.${start.month.toString().padLeft(2, '0')} '
                    '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}'
                    ' · ${booking['duration_min']} ${l10n.minutes}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: chipColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(chipText, style: const TextStyle(fontSize: 11)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('$subjectName · $other'),
            if (booking['kind'] == 'trial_free')
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  l10n.bookingFreeTrialLabel,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            if (cancellable)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(l10n.cancelLessonTitle),
                        content: Text(l10n.cancelLessonBody),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: Text(l10n.commonCancel),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: Text(l10n.cancelLessonConfirm),
                          ),
                        ],
                      ),
                    );
                    if (confirmed != true || !context.mounted) return;
                    try {
                      await ref
                          .read(bookingRepositoryProvider)
                          .cancelBooking(booking['id'] as String);
                      onChanged();
                    } catch (_) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(l10n.commonError)),
                        );
                      }
                    }
                  },
                  child: Text(l10n.cancelLessonConfirm),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
