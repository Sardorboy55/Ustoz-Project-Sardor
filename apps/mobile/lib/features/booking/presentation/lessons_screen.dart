import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/countdown_text.dart';
import '../../../common/widgets/empty_state.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/loading_button.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../common/widgets/status_chip.dart';
import '../../../l10n/app_localizations.dart';
import '../../chat/data/chat_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../../reviews/data/reviews_repository.dart';
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
          loading: () => ListView.separated(
            padding: const EdgeInsets.all(AppTokens.s16),
            itemCount: 4,
            separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
            itemBuilder: (_, _) => const SkeletonCard(),
          ),
          error: (e, _) => ErrorState(
            onRetry: () => ref.invalidate(myLessonsProvider),
          ),
          data: (rows) {
            final now = DateTime.now();
            bool upcoming(Map<String, dynamic> b) =>
                DateTime.parse(b['start_at'] as String).toLocal().isAfter(now) &&
                ['pending_payment', 'paid', 'in_progress'].contains(b['status']);
            final up = rows.where(upcoming).toList().reversed.toList();
            final past = rows.where((b) => !upcoming(b)).toList();
            return TabBarView(children: [
              _LessonList(
                rows: up,
                asTeacher: _asTeacher,
                isUpcomingTab: true,
                onChanged: () => ref.invalidate(myLessonsProvider),
              ),
              _LessonList(
                rows: past,
                asTeacher: _asTeacher,
                isUpcomingTab: false,
                onChanged: () => ref.invalidate(myLessonsProvider),
              ),
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
    required this.isUpcomingTab,
    required this.onChanged,
  });

  final List<Map<String, dynamic>> rows;
  final bool asTeacher;
  final bool isUpcomingTab;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    if (rows.isEmpty) {
      return isUpcomingTab
          ? EmptyState(
              icon: Icons.event_available_outlined,
              title: l10n.lessonsEmptyUpcomingTitle,
              body: l10n.lessonsEmptyUpcomingBody,
              actionLabel: l10n.lessonsFindTeacher,
              onAction: () => context.go('/catalog'),
            )
          : EmptyState(
              icon: Icons.history_rounded,
              title: l10n.lessonsEmptyPastTitle,
            );
    }
    return RefreshIndicator(
      onRefresh: () async => onChanged(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppTokens.s16),
        itemCount: rows.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
        itemBuilder: (context, i) => _LessonCard(
          booking: rows[i],
          asTeacher: asTeacher,
          showCountdown: isUpcomingTab && i == 0,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _LessonCard extends ConsumerWidget {
  const _LessonCard({
    required this.booking,
    required this.asTeacher,
    required this.showCountdown,
    required this.onChanged,
  });

  final Map<String, dynamic> booking;
  final bool asTeacher;
  final bool showCountdown;
  final VoidCallback onChanged;

  int? _myReviewStars() {
    final r = booking['review'];
    if (r is Map) return (r['stars'] as num?)?.toInt();
    if (r is List && r.isNotEmpty) {
      return ((r.first as Map)['stars'] as num?)?.toInt();
    }
    return null;
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final start = DateTime.parse(booking['start_at'] as String).toLocal();
    final lessThan12h =
        start.difference(DateTime.now()) < const Duration(hours: 12);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.cancelLessonTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.cancelLessonBody),
            if (lessThan12h && !asTeacher) ...[
              const SizedBox(height: AppTokens.s12),
              Text(
                l10n.cancelLessonLate,
                style: TextStyle(
                  color: AppTokens.of(context).danger,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
              backgroundColor: AppTokens.of(context).danger,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.cancelLessonConfirm),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      final res = await ref
          .read(bookingRepositoryProvider)
          .cancelBooking(booking['id'] as String);
      onChanged();
      if (context.mounted) {
        final refundPct = (res['refundPct'] as num?)?.toInt() ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(refundPct == 100 && !asTeacher
              ? '${l10n.lessonCancelled}. ${l10n.refundToBalance}'
              : l10n.lessonCancelled),
        ));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.commonError)),
        );
      }
    }
  }

  Future<void> _write(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      final repo = ref.read(chatRepositoryProvider);
      final String? chatId;
      if (asTeacher) {
        // teachers cannot start chats — the student writes first
        chatId = await repo.findChatWithStudent(booking['student_id'] as String);
        if (chatId == null) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(l10n.chatTeacherNoChat)),
            );
          }
          return;
        }
      } else {
        chatId =
            await repo.ensureChatWithTeacher(booking['teacher_id'] as String);
      }
      if (context.mounted) context.push('/chats/$chatId');
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.commonError)),
        );
      }
    }
  }

  Future<void> _leaveReview(BuildContext context) async {
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ReviewSheet(
        bookingId: booking['id'] as String,
        teacherId: booking['teacher_id'] as String,
      ),
    );
    if (submitted == true) onChanged();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final start = DateTime.parse(booking['start_at'] as String);
    final status = booking['status'] as String;
    final subj = ((booking['teacher_subjects'] as Map?)?['subjects'] as Map?)
            ?.cast<String, dynamic>() ??
        const {};
    final subjectName = (locale.languageCode == 'ru'
            ? subj['name_ru']
            : subj['name_uz']) as String? ??
        '';

    final Map<String, dynamic>? otherProfile;
    if (asTeacher) {
      otherProfile = (booking['student'] as Map?)?.cast<String, dynamic>();
    } else {
      otherProfile = ((booking['teacher'] as Map?)?['profiles'] as Map?)
          ?.cast<String, dynamic>();
    }
    final otherName = otherProfile?['full_name'] as String? ?? '';
    final price = booking['price'] as num? ?? 0;
    final isTrial = booking['kind'] == 'trial_free';

    final cancellable = ['pending_payment', 'paid'].contains(status) &&
        start.toLocal().isAfter(DateTime.now());
    final reviewStars = _myReviewStars();
    final canReview = !asTeacher && status == 'completed' && reviewStars == null;
    final canPay = !asTeacher &&
        status == 'pending_payment' &&
        !isTrial &&
        price > 0;

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppAvatar(
                imageUrl: otherProfile?['avatar_url'] as String?,
                name: otherName,
                size: 44,
              ),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subjectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      otherName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 13, color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppTokens.s8),
              StatusChip(status: status),
            ],
          ),
          const SizedBox(height: AppTokens.s12),
          Row(
            children: [
              Icon(Icons.schedule_rounded,
                  size: 15, color: scheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                '${formatTkDayMonth(start)} · ${formatTkTime(start)} · ${booking['duration_min']} ${l10n.minutes}',
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Text(
                isTrial
                    ? l10n.bookingFreeTrialLabel
                    : formatTiyin(price, locale),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: scheme.primary,
                ),
              ),
            ],
          ),
          if (showCountdown && status != 'pending_payment') ...[
            const SizedBox(height: AppTokens.s4),
            CountdownText(target: start.toLocal()),
          ],
          if (reviewStars != null) ...[
            const SizedBox(height: AppTokens.s8),
            Row(
              children: [
                Text(
                  '${l10n.yourRating}: ',
                  style: TextStyle(
                      fontSize: 13, color: scheme.onSurfaceVariant),
                ),
                Icon(Icons.star_rounded, size: 16, color: AppColors.accent),
                Text(
                  '$reviewStars',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
          if (canPay) ...[
            const SizedBox(height: AppTokens.s12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => context.push(
                  '/booking/${booking['id']}/pay',
                  extra: booking,
                ),
                icon: const Icon(Icons.payments_rounded, size: 18),
                label: Text(locale.languageCode == 'ru'
                    ? 'Оплатить урок'
                    : 'Darsni to\'lash'),
              ),
            ),
          ],
          if (cancellable || canReview) ...[
            const SizedBox(height: AppTokens.s8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (cancellable) ...[
                  TextButton(
                    style: TextButton.styleFrom(
                        foregroundColor: AppTokens.of(context).danger),
                    onPressed: () => _cancel(context, ref),
                    child: Text(l10n.cancelLessonConfirm),
                  ),
                  const SizedBox(width: AppTokens.s4),
                  TextButton.icon(
                    onPressed: () => _write(context, ref),
                    icon: const Icon(Icons.chat_bubble_outline_rounded,
                        size: 18),
                    label: Text(l10n.teacherWrite),
                  ),
                ],
                if (canReview)
                  TextButton.icon(
                    onPressed: () => _leaveReview(context),
                    icon: const Icon(Icons.star_border_rounded, size: 18),
                    label: Text(l10n.leaveReview),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// review bottom sheet
// ---------------------------------------------------------------------------

class _ReviewSheet extends ConsumerStatefulWidget {
  const _ReviewSheet({required this.bookingId, required this.teacherId});

  final String bookingId;
  final String teacherId;

  @override
  ConsumerState<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends ConsumerState<_ReviewSheet> {
  int _stars = 5;
  final Set<String> _tags = {};
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    // Capture before popping: after Navigator.pop the sheet's context is gone,
    // so ScaffoldMessenger.of(context) would fail to surface the confirmation.
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() => _sending = true);
    final text = [
      if (_tags.isNotEmpty) _tags.join(', '),
      if (_controller.text.trim().isNotEmpty) _controller.text.trim(),
    ].join('\n');
    try {
      await ref.read(reviewsRepositoryProvider).submitReview(
            bookingId: widget.bookingId,
            teacherId: widget.teacherId,
            stars: _stars,
            body: text,
          );
      if (!mounted) return;
      navigator.pop(true);
      messenger.showSnackBar(SnackBar(content: Text(l10n.reviewThanks)));
    } on DuplicateReviewException {
      if (!mounted) return;
      navigator.pop(true); // refresh — the card will show the stars
      messenger.showSnackBar(SnackBar(content: Text(l10n.reviewAlready)));
    } catch (_) {
      if (mounted) {
        setState(() => _sending = false);
        messenger.showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tags = [
      l10n.tagPunctual,
      l10n.tagClear,
      l10n.tagPolite,
      l10n.tagRecommend,
    ];

    return Padding(
      padding: EdgeInsets.only(
        left: AppTokens.s16,
        right: AppTokens.s16,
        top: AppTokens.s8,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppTokens.s16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Text(l10n.reviewTitle,
                style: Theme.of(context).textTheme.titleLarge),
          ),
          const SizedBox(height: AppTokens.s12),
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 1; i <= 5; i++)
                  IconButton(
                    iconSize: 40,
                    visualDensity: VisualDensity.compact,
                    onPressed: () => setState(() => _stars = i),
                    icon: Icon(
                      i <= _stars
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: i <= _stars
                          ? AppColors.accent
                          : Theme.of(context).colorScheme.outline,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppTokens.s12),
          Wrap(
            spacing: AppTokens.s8,
            runSpacing: AppTokens.s8,
            children: [
              for (final tag in tags)
                FilterChip(
                  label: Text(tag),
                  selected: _tags.contains(tag),
                  onSelected: (sel) => setState(() {
                    if (sel) {
                      _tags.add(tag);
                    } else {
                      _tags.remove(tag);
                    }
                  }),
                ),
            ],
          ),
          const SizedBox(height: AppTokens.s12),
          TextField(
            controller: _controller,
            maxLines: 4,
            maxLength: 600,
            decoration: InputDecoration(hintText: l10n.reviewHint),
          ),
          const SizedBox(height: AppTokens.s8),
          LoadingButton(
            loading: _sending,
            onPressed: _submit,
            child: Text(l10n.reviewSend),
          ),
        ],
      ),
    );
  }
}
