import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:video_player/video_player.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/badges.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/rating_stars.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../core/providers/supabase_providers.dart';
import '../../../l10n/app_localizations.dart';
import '../../booking/presentation/booking_sheet.dart';
import '../../chat/data/chat_repository.dart';
import '../../favorites/data/favorites_repository.dart';
import '../../reviews/data/reviews_repository.dart';
import '../data/catalog_repository.dart';

const _reviewsPageSize = 5;

class TeacherProfileScreen extends ConsumerStatefulWidget {
  const TeacherProfileScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<TeacherProfileScreen> createState() =>
      _TeacherProfileScreenState();
}

class _TeacherProfileScreenState extends ConsumerState<TeacherProfileScreen> {
  // reviews are paged manually ("show more")
  final List<Map<String, dynamic>> _reviews = [];
  bool _reviewsLoading = false;
  bool _reviewsError = false;
  bool _reviewsHasMore = true;
  String? _reviewsTeacherId;

  Future<void> _loadReviews(String teacherId) async {
    if (_reviewsLoading) return;
    setState(() {
      _reviewsLoading = true;
      _reviewsError = false;
    });
    try {
      final rows = await ref.read(reviewsRepositoryProvider).fetchTeacherReviews(
            teacherId,
            limit: _reviewsPageSize,
            offset: _reviews.length,
          );
      if (!mounted) return;
      setState(() {
        _reviews.addAll(rows);
        _reviewsHasMore = rows.length == _reviewsPageSize;
        _reviewsLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _reviewsLoading = false;
          _reviewsError = true;
        });
      }
    }
  }

  Future<void> _writeToTeacher(String teacherId) async {
    final l10n = AppLocalizations.of(context)!;
    if (ref.read(sessionControllerProvider) == null) {
      context.push('/auth');
      return;
    }
    try {
      final chatId =
          await ref.read(chatRepositoryProvider).ensureChatWithTeacher(teacherId);
      if (mounted) context.push('/chats/$chatId');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    }
  }

  void _book(Map<String, dynamic> teacher, {DateTime? initialStart}) {
    if (ref.read(sessionControllerProvider) == null) {
      context.push('/auth');
      return;
    }
    showBookingSheet(context, teacher, initialStart: initialStart);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final teacher = ref.watch(teacherBySlugProvider(widget.slug));

    return teacher.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(l10n.teacherProfileTitle)),
        body: ListView(
          padding: const EdgeInsets.all(AppTokens.s16),
          children: const [
            SkeletonCard(height: 180),
            SizedBox(height: AppTokens.s12),
            SkeletonCard(),
            SizedBox(height: AppTokens.s12),
            SkeletonCard(),
          ],
        ),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: Text(l10n.teacherProfileTitle)),
        body: ErrorState(
            onRetry: () => ref.invalidate(teacherBySlugProvider(widget.slug))),
      ),
      data: (t) {
        if (t == null) {
          return Scaffold(
            appBar: AppBar(title: Text(l10n.teacherProfileTitle)),
            body: ErrorState(
              message: l10n.catalogEmpty,
              onRetry: () =>
                  ref.invalidate(teacherBySlugProvider(widget.slug)),
            ),
          );
        }
        final teacherId = t['user_id'] as String;
        if (_reviewsTeacherId != teacherId) {
          _reviewsTeacherId = teacherId;
          WidgetsBinding.instance
              .addPostFrameCallback((_) => _loadReviews(teacherId));
        }
        return _buildLoaded(context, t);
      },
    );
  }

  Widget _buildLoaded(BuildContext context, Map<String, dynamic> t) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final scheme = Theme.of(context).colorScheme;

    final teacherId = t['user_id'] as String;
    final profile = (t['profiles'] as Map?)?.cast<String, dynamic>();
    final name = profile?['full_name'] as String? ?? '';
    final avatarUrl = profile?['avatar_url'] as String?;
    final headline =
        (locale == 'ru' ? t['headline_ru'] : t['headline_uz']) as String? ?? '';
    final bio = (locale == 'ru' ? t['bio_ru'] : t['bio_uz']) as String? ?? '';
    final rating = (t['rating_avg'] as num?)?.toDouble() ?? 0;
    final ratingCount = (t['rating_count'] as num?)?.toInt() ?? 0;
    final lessonsDone = (t['lessons_done'] as num?)?.toInt() ?? 0;
    final years = (t['experience_years'] as num?)?.toInt() ?? 0;
    final langs = (t['teaching_langs'] as List? ?? [])
        .cast<String>()
        .map((s) => s.toUpperCase())
        .toList();
    final videoUrl = t['intro_video_url'] as String?;
    final subjects = (t['teacher_subjects'] as List? ?? [])
        .cast<Map<String, dynamic>>()
        .where((s) => s['is_active'] == true)
        .toList();
    final isSelf =
        ref.watch(sessionControllerProvider)?.user.id == teacherId;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            foregroundColor: Colors.white,
            backgroundColor: AppColors.primaryDark,
            actions: [
              _AppBarHeart(teacherId: teacherId),
            ],
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.parallax,
              background: _HeroHeader(avatarUrl: avatarUrl, name: name),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppTokens.s16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      if (t['is_verified'] == true) ...[
                        const VerifiedBadge(withLabel: true, size: 18),
                        const SizedBox(width: AppTokens.s8),
                      ],
                      if (t['tier'] == 'pro') const ProBadge(),
                    ],
                  ),
                  if (headline.isNotEmpty) ...[
                    const SizedBox(height: AppTokens.s4),
                    Text(
                      headline,
                      style: TextStyle(
                          fontSize: 15,
                          height: 1.35,
                          color: scheme.onSurfaceVariant),
                    ),
                  ],
                  const SizedBox(height: AppTokens.s12),
                  Wrap(
                    spacing: AppTokens.s8,
                    runSpacing: AppTokens.s8,
                    children: [
                      _MetricChip(
                        icon: Icons.star_rounded,
                        iconColor: AppColors.accent,
                        label:
                            '${rating.toStringAsFixed(1)} ($ratingCount)',
                      ),
                      _MetricChip(
                        icon: Icons.school_outlined,
                        label: l10n.cardLessonsCount(lessonsDone),
                      ),
                      _MetricChip(
                        icon: Icons.work_outline_rounded,
                        label: '$years ${l10n.years}',
                      ),
                      if (langs.isNotEmpty)
                        _MetricChip(
                          icon: Icons.language_rounded,
                          label: langs.join(' · '),
                        ),
                    ],
                  ),
                  if (videoUrl != null && videoUrl.isNotEmpty) ...[
                    const SizedBox(height: AppTokens.s24),
                    Text(l10n.teacherVideoIntro,
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: AppTokens.s8),
                    _IntroVideo(url: videoUrl),
                  ],
                  if (bio.trim().isNotEmpty) ...[
                    const SizedBox(height: AppTokens.s24),
                    Text(l10n.teacherAbout,
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: AppTokens.s8),
                    _ExpandableText(text: bio),
                  ],
                  const SizedBox(height: AppTokens.s24),
                  Text(l10n.teacherServices,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: AppTokens.s8),
                  for (final s in subjects) ...[
                    _SubjectCard(subject: s),
                    const SizedBox(height: AppTokens.s8),
                  ],
                  const SizedBox(height: AppTokens.s16),
                  Text(l10n.teacherFreeSlots,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    l10n.teacherSlotsHint,
                    style: TextStyle(
                        fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: AppTokens.s8),
                  _SlotsPreview(
                    teacherId: teacherId,
                    onPick: isSelf
                        ? null
                        : (slot) => _book(t, initialStart: slot),
                  ),
                  const SizedBox(height: AppTokens.s24),
                  _ReviewsSection(
                    rating: rating,
                    ratingCount: ratingCount,
                    reviews: _reviews,
                    loading: _reviewsLoading,
                    error: _reviewsError,
                    hasMore: _reviewsHasMore,
                    onMore: () => _loadReviews(teacherId),
                  ),
                  const SizedBox(height: AppTokens.s32),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(
              AppTokens.s16, AppTokens.s12, AppTokens.s16, AppTokens.s12),
          decoration: BoxDecoration(
            color: scheme.surface,
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isSelf ? null : () => _writeToTeacher(teacherId),
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                  label: Text(l10n.teacherWrite),
                ),
              ),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: isSelf ? null : () => _book(t),
                  child: Text(l10n.bookingCta),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// hero header: avatar photo background or teal gradient
// ---------------------------------------------------------------------------

class _HeroHeader extends StatelessWidget {
  const _HeroHeader({required this.avatarUrl, required this.name});

  final String? avatarUrl;
  final String name;

  @override
  Widget build(BuildContext context) {
    final hasPhoto = avatarUrl != null && avatarUrl!.isNotEmpty;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (hasPhoto)
          CachedNetworkImage(
            imageUrl: avatarUrl!,
            fit: BoxFit.cover,
            errorWidget: (_, _, _) => const _HeroFallback(),
          )
        else
          const _HeroFallback(),
        if (hasPhoto)
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.25),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.35),
                ],
              ),
            ),
          )
        else
          Center(
            child: AppAvatar(name: name, size: 112),
          ),
      ],
    );
  }
}

class _HeroFallback extends StatelessWidget {
  const _HeroFallback();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
      ),
    );
  }
}

class _AppBarHeart extends ConsumerWidget {
  const _AppBarHeart({required this.teacherId});

  final String teacherId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final favorites = ref.watch(favoriteIdsProvider).value ?? const <String>{};
    final isFavorite = favorites.contains(teacherId);
    return Padding(
      padding: const EdgeInsets.only(right: AppTokens.s4),
      child: IconButton(
        style: IconButton.styleFrom(
          backgroundColor: Colors.black.withValues(alpha: 0.25),
        ),
        icon: Icon(
          isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFavorite ? const Color(0xFFFF6B6B) : Colors.white,
        ),
        onPressed: () async {
          if (ref.read(sessionControllerProvider) == null) {
            context.push('/auth');
            return;
          }
          try {
            await ref.read(favoriteIdsProvider.notifier).toggle(teacherId);
          } catch (_) {
            if (context.mounted) {
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text(l10n.commonError)));
            }
          }
        },
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.icon,
    required this.label,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.s12, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(AppTokens.radiusChip),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: iconColor ?? scheme.onSurfaceVariant),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// intro video (lazy network init, tap to play/pause)
// ---------------------------------------------------------------------------

class _IntroVideo extends StatefulWidget {
  const _IntroVideo({required this.url});

  final String url;

  @override
  State<_IntroVideo> createState() => _IntroVideoState();
}

class _IntroVideoState extends State<_IntroVideo> {
  VideoPlayerController? _controller;
  bool _initializing = false;
  bool _failed = false;

  Future<void> _start() async {
    if (_initializing) return;
    setState(() => _initializing = true);
    try {
      final c = VideoPlayerController.networkUrl(Uri.parse(widget.url));
      await c.initialize();
      if (!mounted) {
        await c.dispose();
        return;
      }
      setState(() {
        _controller = c;
        _initializing = false;
      });
      await c.play();
      c.addListener(() {
        if (mounted) setState(() {});
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _initializing = false;
          _failed = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final c = _controller;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTokens.radiusCard),
      child: AspectRatio(
        aspectRatio: (c != null && c.value.isInitialized)
            ? c.value.aspectRatio
            : 16 / 9,
        child: c != null && c.value.isInitialized
            ? GestureDetector(
                onTap: () => c.value.isPlaying ? c.pause() : c.play(),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    VideoPlayer(c),
                    if (!c.value.isPlaying)
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.45),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.play_arrow_rounded,
                            color: Colors.white, size: 36),
                      ),
                  ],
                ),
              )
            : GestureDetector(
                onTap: _failed ? null : _start,
                child: Container(
                  color: AppColors.primaryDark,
                  child: Center(
                    child: _initializing
                        ? const SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 3),
                          )
                        : _failed
                            ? Text(
                                l10n.commonError,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 13),
                              )
                            : Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.18),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.play_arrow_rounded,
                                    color: Colors.white, size: 42),
                              ),
                  ),
                ),
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// expandable bio
// ---------------------------------------------------------------------------

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text});

  final String text;

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final style = const TextStyle(height: 1.5, fontSize: 14);

    return LayoutBuilder(
      builder: (context, constraints) {
        final painter = TextPainter(
          text: TextSpan(text: widget.text, style: style),
          maxLines: 4,
          textDirection: Directionality.of(context),
        )..layout(maxWidth: constraints.maxWidth);
        final overflows = painter.didExceedMaxLines;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.text,
              style: style,
              maxLines: _expanded ? null : 4,
              overflow: _expanded ? null : TextOverflow.ellipsis,
            ),
            if (overflows)
              TextButton(
                style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 36)),
                onPressed: () => setState(() => _expanded = !_expanded),
                child: Text(_expanded ? l10n.readLess : l10n.readMore),
              ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// subject price card
// ---------------------------------------------------------------------------

class _SubjectCard extends StatelessWidget {
  const _SubjectCard({required this.subject});

  final Map<String, dynamic> subject;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final subj =
        (subject['subjects'] as Map?)?.cast<String, dynamic>() ?? const {};
    final title = (locale.languageCode == 'ru'
            ? subj['name_ru']
            : subj['name_uz']) as String? ??
        '';
    final discount = (subject['trial_discount_pct'] as num?)?.toInt() ?? 0;

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
              ),
              if (subject['trial_free_enabled'] == true) const TrialBadge(),
            ],
          ),
          const SizedBox(height: AppTokens.s8),
          Wrap(
            spacing: AppTokens.s8,
            runSpacing: AppTokens.s8,
            children: [
              for (final d in [30, 60, 90])
                if (subject['price_$d'] != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppTokens.s12, vertical: 6),
                    decoration: BoxDecoration(
                      color: d == 60
                          ? (Theme.of(context).brightness == Brightness.light
                              ? AppColors.primaryTint
                              : scheme.primaryContainer)
                          : scheme.surface,
                      borderRadius:
                          BorderRadius.circular(AppTokens.radiusChip),
                      border: Border.all(
                          color: d == 60
                              ? scheme.primary.withValues(alpha: 0.4)
                              : scheme.outlineVariant),
                    ),
                    child: Text(
                      '$d${l10n.minShort} · ${formatTiyin(subject['price_$d'] as num, locale)}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            d == 60 ? FontWeight.w700 : FontWeight.w500,
                        color: d == 60 ? scheme.primary : scheme.onSurface,
                      ),
                    ),
                  ),
              if (discount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppTokens.s8, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(AppTokens.radiusChip),
                  ),
                  child: Text(
                    '-$discount%',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF92400E),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// free slots preview
// ---------------------------------------------------------------------------

class _SlotsPreview extends ConsumerWidget {
  const _SlotsPreview({required this.teacherId, required this.onPick});

  final String teacherId;
  final ValueChanged<DateTime>? onPick;

  String _dayLabel(BuildContext context, DateTime slot) {
    final l10n = AppLocalizations.of(context)!;
    final now = DateTime.now();
    if (isSameTkDay(slot, now)) return l10n.todayLabel;
    if (isSameTkDay(slot, now.add(const Duration(days: 1)))) {
      return l10n.tomorrowLabel;
    }
    return formatTkDayMonth(slot);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final slots = ref.watch(teacherSlotPreviewProvider(teacherId));
    final scheme = Theme.of(context).colorScheme;

    return slots.when(
      loading: () => SkeletonPulse(
        child: Wrap(
          spacing: AppTokens.s8,
          runSpacing: AppTokens.s8,
          children: List.generate(
              4, (_) => const SkeletonBox(width: 104, height: 36, radius: 18)),
        ),
      ),
      error: (e, _) => TextButton.icon(
        onPressed: () =>
            ref.invalidate(teacherSlotPreviewProvider(teacherId)),
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: Text(l10n.commonRetry),
      ),
      data: (list) {
        if (list.isEmpty) {
          return Text(
            l10n.teacherNoUpcomingSlots,
            style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
          );
        }
        return Wrap(
          spacing: AppTokens.s8,
          runSpacing: AppTokens.s8,
          children: [
            for (final slot in list)
              ActionChip(
                avatar: Icon(Icons.schedule_rounded,
                    size: 16, color: scheme.primary),
                label: Text(
                    '${_dayLabel(context, slot)} ${formatTkTime(slot)}'),
                onPressed: onPick == null ? null : () => onPick!(slot),
              ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// reviews
// ---------------------------------------------------------------------------

class _ReviewsSection extends StatelessWidget {
  const _ReviewsSection({
    required this.rating,
    required this.ratingCount,
    required this.reviews,
    required this.loading,
    required this.error,
    required this.hasMore,
    required this.onMore,
  });

  final double rating;
  final int ratingCount;
  final List<Map<String, dynamic>> reviews;
  final bool loading;
  final bool error;
  final bool hasMore;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.teacherReviewsTitle,
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppTokens.s12),
        if (ratingCount > 0) ...[
          Row(
            children: [
              Text(
                rating.toStringAsFixed(1),
                style: Theme.of(context)
                    .textTheme
                    .displaySmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(width: AppTokens.s12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RatingStars(rating: rating, size: 18),
                  const SizedBox(height: 2),
                  Text(
                    l10n.reviewsCountLabel(ratingCount),
                    style: TextStyle(
                        fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s12),
        ],
        if (reviews.isEmpty && !loading && !error)
          Text(
            l10n.teacherReviewsEmpty,
            style: TextStyle(fontSize: 14, color: scheme.onSurfaceVariant),
          ),
        for (final r in reviews) ...[
          _ReviewTile(review: r),
          const SizedBox(height: AppTokens.s8),
        ],
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppTokens.s8),
            child: SkeletonListTile(padding: EdgeInsets.zero),
          ),
        if (error)
          TextButton.icon(
            onPressed: onMore,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: Text(l10n.commonRetry),
          )
        else if (!loading && hasMore && reviews.isNotEmpty)
          Center(
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding:
                    const EdgeInsets.symmetric(horizontal: AppTokens.s24),
              ),
              onPressed: onMore,
              child: Text(l10n.showMore),
            ),
          ),
      ],
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});

  final Map<String, dynamic> review;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final scheme = Theme.of(context).colorScheme;
    final stars = (review['stars'] as num?)?.toDouble() ?? 0;
    final body = review['body'] as String? ?? '';
    final created = DateTime.tryParse(review['created_at'] as String? ?? '');

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AppAvatar(name: '', size: 32),
              const SizedBox(width: AppTokens.s8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // author names are hidden by RLS — render anonymously
                    Text(
                      l10n.reviewAnonymous,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    if (created != null)
                      Text(
                        DateFormat('d MMM yyyy', locale)
                            .format(toTashkent(created)),
                        style: TextStyle(
                            fontSize: 11, color: scheme.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
              RatingStars(rating: stars, size: 14),
            ],
          ),
          if (body.trim().isNotEmpty) ...[
            const SizedBox(height: AppTokens.s8),
            Text(body, style: const TextStyle(fontSize: 14, height: 1.4)),
          ],
        ],
      ),
    );
  }
}
