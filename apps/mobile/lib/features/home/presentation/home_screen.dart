import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../app/theme.dart';
import '../../../core/providers/supabase_providers.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/badges.dart';
import '../../../common/widgets/countdown_text.dart';
import '../../../common/widgets/rating_stars.dart';
import '../../../common/widgets/section_header.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../common/widgets/status_chip.dart';
import '../../../l10n/app_localizations.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../favorites/data/favorites_repository.dart';
import '../../notifications/data/notifications_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../data/home_repository.dart';

const _popularFilters = CatalogFilters(limit: 5);
const _trialFilters = CatalogFilters(trialOnly: true, limit: 5);

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(ownProfileProvider);
    ref.invalidate(nextLessonProvider);
    ref.invalidate(activeCategoriesProvider);
    ref.invalidate(catalogCardsProvider);
    ref.invalidate(favoriteCardsProvider);
    ref.invalidate(teacherTodayCountProvider);
    ref.invalidate(unreadNotificationsCountProvider);
    await Future.wait([
      ref.read(nextLessonProvider.future),
      ref.read(activeCategoriesProvider.future),
    ]).catchError((_) => <Object?>[]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(ownProfileProvider);
    final favorites = ref.watch(favoriteCardsProvider);
    final isTeacher = profile.value?['is_teacher'] == true;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(ref),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: AppTokens.s32),
            children: [
              const _Hero(),
              const _TrustBand(),
              const SizedBox(height: AppTokens.s8),
              const _NextLessonSection(),
              const SizedBox(height: AppTokens.s24),
              SectionHeader(
                title: l10n.homeCategories,
                padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
              ),
              const SizedBox(height: AppTokens.s8),
              const _CategoriesRow(),
              const SizedBox(height: AppTokens.s24),
              SectionHeader(
                title: l10n.homePopular,
                padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
                onAction: () => context.go('/catalog'),
              ),
              const SizedBox(height: AppTokens.s8),
              const _TeacherRow(filters: _popularFilters),
              const SizedBox(height: AppTokens.s24),
              SectionHeader(
                title: l10n.homeTrialSection,
                padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
                onAction: () => context.go('/catalog?trial=1'),
              ),
              const SizedBox(height: AppTokens.s8),
              const _TeacherRow(filters: _trialFilters),
              if ((favorites.value ?? const []).isNotEmpty) ...[
                const SizedBox(height: AppTokens.s24),
                SectionHeader(
                  title: l10n.homeFavorites,
                  padding:
                      const EdgeInsets.symmetric(horizontal: AppTokens.s16),
                ),
                const SizedBox(height: AppTokens.s8),
                _CardsRow(cards: favorites.value!),
              ],
              const SizedBox(height: AppTokens.s24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
                child: isTeacher
                    ? const _TeacherDashboardBanner()
                    : const _BecomeTeacherBanner(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// header: greeting by Tashkent time of day + name + avatar
// ---------------------------------------------------------------------------

class _Header extends ConsumerWidget {
  const _Header({required this.profile});

  final AsyncValue<Map<String, dynamic>?> profile;

  String _greeting(AppLocalizations l10n) {
    final hour = toTashkent(DateTime.now()).hour;
    if (hour >= 5 && hour < 11) return l10n.homeGreetingMorning;
    if (hour >= 11 && hour < 17) return l10n.homeGreetingDay;
    if (hour >= 17 && hour < 22) return l10n.homeGreetingEvening;
    return l10n.homeGreetingNight;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final name = (profile.value?['full_name'] as String? ?? '').trim();
    final firstName = name.isEmpty ? '' : name.split(RegExp(r'\s+')).first;
    final unread = ref.watch(unreadNotificationsCountProvider).value ?? 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _greeting(l10n),
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
                const SizedBox(height: 2),
                profile.isLoading
                    ? const SkeletonPulse(
                        child: SkeletonBox(width: 140, height: 22))
                    : Text(
                        firstName.isEmpty ? l10n.appTitle : firstName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
              ],
            ),
          ),
          IconButton(
            tooltip: l10n.notificationsTitle,
            onPressed: () => context.push('/notifications'),
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.notifications_none_rounded, size: 26),
            ),
          ),
          const SizedBox(width: AppTokens.s4),
          GestureDetector(
            onTap: () => context.go('/profile'),
            child: AppAvatar(
              imageUrl: profile.value?['avatar_url'] as String?,
              name: name,
              size: 44,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// search pill → catalog with focused search
// ---------------------------------------------------------------------------

class _SearchBarStub extends StatelessWidget {
  const _SearchBarStub();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
      child: Material(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTokens.radiusButton),
          onTap: () => context.go('/catalog?focus=1'),
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.s12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTokens.radiusButton),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              children: [
                Icon(Icons.search_rounded, color: scheme.onSurfaceVariant),
                const SizedBox(width: AppTokens.s8),
                Expanded(
                  child: Text(
                    l10n.homeSearchHint,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).brightness == Brightness.light
                          ? AppColors.zinc400
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// next lesson
// ---------------------------------------------------------------------------

class _NextLessonSection extends ConsumerWidget {
  const _NextLessonSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final next = ref.watch(nextLessonProvider);

    return next.when(
      loading: () => const Padding(
        padding: EdgeInsets.fromLTRB(
            AppTokens.s16, AppTokens.s16, AppTokens.s16, 0),
        child: SkeletonCard(height: 116),
      ),
      error: (e, _) => const SizedBox.shrink(),
      data: (b) {
        if (b == null) return const SizedBox.shrink();
        final start = DateTime.parse(b['start_at'] as String);
        final subj = ((b['teacher_subjects'] as Map?)?['subjects'] as Map?)
                ?.cast<String, dynamic>() ??
            const {};
        final subjectName =
            (locale == 'ru' ? subj['name_ru'] : subj['name_uz']) as String? ??
                '';
        final teacher = (b['teacher'] as Map?)?.cast<String, dynamic>();
        final teacherProfile =
            (teacher?['profiles'] as Map?)?.cast<String, dynamic>();
        final teacherName = teacherProfile?['full_name'] as String? ?? '';
        final pending = b['status'] == 'pending_payment';
        final tokens = AppTokens.of(context);

        return Padding(
          padding: const EdgeInsets.fromLTRB(
              AppTokens.s16, AppTokens.s16, AppTokens.s16, 0),
          child: AppCard(
            onTap: () => context.go('/lessons'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.homeNextLesson,
                        style: Theme.of(context)
                            .textTheme
                            .labelLarge
                            ?.copyWith(
                                color:
                                    Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ),
                    StatusChip(status: b['status'] as String),
                  ],
                ),
                const SizedBox(height: AppTokens.s12),
                Row(
                  children: [
                    AppAvatar(
                      imageUrl: teacherProfile?['avatar_url'] as String?,
                      name: teacherName,
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
                            style:
                                const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            teacherName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTokens.s12),
                Row(
                  children: [
                    Icon(Icons.schedule_rounded,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        formatTkDateTime(start, locale),
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (pending)
                      Text(
                        l10n.statusPendingPayment,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: tokens.warning,
                        ),
                      )
                    else
                      CountdownText(target: start.toLocal()),
                  ],
                ),
                const SizedBox(height: AppTokens.s12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => context.go('/lessons'),
                    style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(44)),
                    child: Text(pending
                        ? (locale == 'ru' ? 'Оплатить' : 'To\'lash')
                        : (locale == 'ru'
                            ? 'Перейти к уроку'
                            : 'Darsga o\'tish')),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

IconData categoryIcon(String? icon) => switch (icon) {
      'languages' => Icons.translate_rounded,
      'school' => Icons.school_outlined,
      'code' => Icons.code_rounded,
      'brain' => Icons.psychology_outlined,
      'briefcase' => Icons.work_outline_rounded,
      'music' => Icons.music_note_rounded,
      'dumbbell' => Icons.fitness_center_rounded,
      'sparkles' => Icons.auto_awesome_rounded,
      _ => Icons.interests_outlined,
    };

/// Per-category accent (fg) + tint (bg), matching the web palette
/// (indigo / emerald / sky / violet / amber / rose / teal / fuchsia).
({Color fg, Color bg}) categoryColors(String? icon) => switch (icon) {
      'languages' => (fg: Color(0xFF4F46E5), bg: Color(0xFFEEF2FF)),
      'school' => (fg: Color(0xFF059669), bg: Color(0xFFECFDF5)),
      'code' => (fg: Color(0xFF0284C7), bg: Color(0xFFF0F9FF)),
      'brain' => (fg: Color(0xFF7C3AED), bg: Color(0xFFF5F3FF)),
      'briefcase' => (fg: Color(0xFFD97706), bg: Color(0xFFFFFBEB)),
      'music' => (fg: Color(0xFFE11D48), bg: Color(0xFFFFF1F2)),
      'dumbbell' => (fg: Color(0xFF0D9488), bg: Color(0xFFF0FDFA)),
      'sparkles' => (fg: Color(0xFFC026D3), bg: Color(0xFFFDF4FF)),
      _ => (fg: AppColors.primary, bg: AppColors.primaryTint),
    };

class _CategoriesRow extends ConsumerWidget {
  const _CategoriesRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context).languageCode;
    final categories = ref.watch(activeCategoriesProvider);

    return SizedBox(
      height: 96,
      child: categories.when(
        loading: () => SkeletonPulse(
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
            itemCount: 5,
            separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
            itemBuilder: (_, _) => const Column(
              children: [
                SkeletonBox.circle(size: 56),
                SizedBox(height: AppTokens.s8),
                SkeletonBox(width: 56, height: 10),
              ],
            ),
          ),
        ),
        error: (e, _) => _InlineRetry(
            onRetry: () => ref.invalidate(activeCategoriesProvider)),
        data: (rows) => ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
          itemCount: rows.length,
          separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
          itemBuilder: (context, i) {
            final c = rows[i];
            final name = (locale == 'ru' ? c['name_ru'] : c['name_uz'])
                    as String? ??
                '';
            final colors = categoryColors(c['icon'] as String?);
            return _CategoryTile(
              icon: categoryIcon(c['icon'] as String?),
              label: name,
              fg: colors.fg,
              bg: colors.bg,
              onTap: () => context.go('/catalog?category=${c['id']}'),
            );
          },
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.fg,
    required this.bg,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color fg;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTokens.radiusCard),
      child: SizedBox(
        width: 76,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: bg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: fg, size: 26),
            ),
            const SizedBox(height: AppTokens.s8),
            Text(
              label,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, height: 1.15),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// horizontal teacher rows
// ---------------------------------------------------------------------------

class _TeacherRow extends ConsumerWidget {
  const _TeacherRow({required this.filters});

  final CatalogFilters filters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cards = ref.watch(catalogCardsProvider(filters));
    return cards.when(
      loading: () => SizedBox(
        height: 224,
        child: SkeletonPulse(
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
            itemCount: 3,
            separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
            itemBuilder: (_, _) => Container(
              width: 168,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(AppTokens.radiusCard),
                border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant),
              ),
            ),
          ),
        ),
      ),
      error: (e, _) => SizedBox(
        height: 90,
        child: _InlineRetry(
            onRetry: () => ref.invalidate(catalogCardsProvider(filters))),
      ),
      data: (rows) =>
          rows.isEmpty ? const SizedBox.shrink() : _CardsRow(cards: rows),
    );
  }
}

class _CardsRow extends StatelessWidget {
  const _CardsRow({required this.cards});

  final List<Map<String, dynamic>> cards;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 224,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
        itemCount: cards.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
        itemBuilder: (context, i) => _TeacherMiniCard(card: cards[i]),
      ),
    );
  }
}

class _TeacherMiniCard extends StatelessWidget {
  const _TeacherMiniCard({required this.card});

  final Map<String, dynamic> card;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final name = card['full_name'] as String? ?? '';
    final rating = (card['rating_avg'] as num?)?.toDouble() ?? 0;
    final minPrice = card['min_price_60'] as num?;
    final priceLine = minPrice == null
        ? null
        : (locale.languageCode == 'ru'
            ? '${l10n.catalogFrom} ${formatTiyin(minPrice, locale)}'
            : '${formatTiyin(minPrice, locale)} ${l10n.catalogFrom}');

    final ru = locale.languageCode == 'ru';
    return SizedBox(
      width: 168,
      child: AppCard(
        padding: const EdgeInsets.all(AppTokens.s12),
        onTap: () => context.push('/t/${card['slug']}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AppAvatar(
                  imageUrl: card['avatar_url'] as String?,
                  name: name,
                  size: 60,
                ),
                if (card['tier'] == 'pro')
                  const Positioned(right: -10, top: -4, child: ProBadge()),
              ],
            ),
            const SizedBox(height: AppTokens.s8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
                if (card['is_verified'] == true) ...[
                  const SizedBox(width: 3),
                  const VerifiedBadge(size: 14),
                ],
              ],
            ),
            const SizedBox(height: 3),
            RatingStars(rating: rating, size: 13, showValue: true),
            const Spacer(),
            if (priceLine != null)
              Text(
                priceLine,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            if (card['has_free_trial'] == true) ...[
              const SizedBox(height: AppTokens.s4),
              const TrialBadge(),
            ],
            const SizedBox(height: AppTokens.s8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => context.push('/t/${card['slug']}'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(36),
                  textStyle: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700),
                ),
                child: Text(ru ? 'Выбрать' : 'Tanlash'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// hero — marketing landing matching the website (apps/web home)
// ---------------------------------------------------------------------------

class _Hero extends ConsumerStatefulWidget {
  const _Hero();

  @override
  ConsumerState<_Hero> createState() => _HeroState();
}

class _HeroState extends ConsumerState<_Hero> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _search() {
    final q = _searchCtrl.text.trim();
    context.go(q.isEmpty
        ? '/catalog?focus=1'
        : '/catalog?focus=1&q=${Uri.encodeComponent(q)}');
  }

  @override
  Widget build(BuildContext context) {
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final loggedIn = ref.watch(sessionControllerProvider) != null;
    final title =
        ru ? 'Найдите своего учителя' : "O'zingizga mos ustozni toping";
    final subtitle = ru
        ? 'Живые онлайн-уроки: удобное расписание, оплата и общение с преподавателем — всё на одной платформе. Более 35 предметов, от языков до IT.'
        : "Jonli onlayn darslar: qulay jadval, to'lov va ustoz bilan muloqot — hammasi bitta platformada. Tillardan IT gacha 35+ fan.";
    final hint = ru ? 'Предмет или преподаватель' : 'Fan yoki ustoz';
    final findBtn = ru ? 'Найти' : 'Qidirish';
    final ctaFind = ru ? 'Найти преподавателя' : 'Ustoz topish';
    final ctaBecome = ru ? 'Стать преподавателем' : "Ustoz bo'lish";
    const overlayDark = Color(0xFF09090B);

    return Stack(
      children: [
        Positioned.fill(
          child: Image.asset('assets/images/hero.jpg', fit: BoxFit.cover),
        ),
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  overlayDark.withValues(alpha: 0.78),
                  AppColors.zinc900.withValues(alpha: 0.62),
                  overlayDark.withValues(alpha: 0.85),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 48),
          child: Column(
            children: [
              Row(
                children: [
                  SvgPicture.asset(
                    'assets/logo/logo.svg',
                    height: 28,
                  ),
                  const Spacer(),
                  if (loggedIn)
                    IconButton(
                      onPressed: () => context.go('/profile'),
                      icon: const Icon(Icons.account_circle_outlined,
                          color: Colors.white, size: 28),
                    )
                  else
                    TextButton(
                      onPressed: () => context.go('/auth'),
                      style:
                          TextButton.styleFrom(foregroundColor: Colors.white),
                      child: Text(ru ? 'Войти' : 'Kirish'),
                    ),
                ],
              ),
              const SizedBox(height: 36),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  children: [
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.92),
                        fontSize: 15,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
                        child: Row(
                          children: [
                            const Icon(Icons.search_rounded,
                                color: AppColors.zinc400),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchCtrl,
                                textInputAction: TextInputAction.search,
                                onSubmitted: (_) => _search(),
                                style: const TextStyle(
                                    color: AppColors.zinc900, fontSize: 15),
                                decoration: InputDecoration(
                                  isCollapsed: true,
                                  filled: false,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  contentPadding: EdgeInsets.zero,
                                  hintText: hint,
                                  hintStyle: const TextStyle(
                                      color: AppColors.zinc400),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            FilledButton(
                              onPressed: _search,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size(0, 44),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 18),
                              ),
                              child: Text(findBtn),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Стопкой и на всю ширину — текст помещается в одну строку
                    // (как на мобильной версии сайта).
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => context.go('/catalog'),
                        style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 52)),
                        child: Text(ctaFind),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => context.go('/profile'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primaryDark,
                          minimumSize: const Size(0, 52),
                        ),
                        child: Text(ctaBecome),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TrustBand extends StatelessWidget {
  const _TrustBand();

  @override
  Widget build(BuildContext context) {
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final items = <(IconData, String, String)>[
      (Icons.grid_view_rounded, '8', ru ? 'направлений' : "yo'nalish"),
      (Icons.menu_book_rounded, '35+', ru ? 'предметов' : 'fan'),
      (
        Icons.verified_user_rounded,
        ru ? 'Безопасно' : 'Xavfsiz',
        ru ? 'Оплата внутри платформы' : "To'lov platforma ichida"
      ),
      (
        Icons.forum_rounded,
        ru ? 'Честно' : 'Halol',
        ru ? 'Отзывы после уроков' : 'Sharhlar darslardan keyin'
      ),
    ];

    Widget cell((IconData, String, String) it) => Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primaryTint,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(it.$1, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(it.$2,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w800)),
                  Text(it.$3,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.zinc500,
                          height: 1.15)),
                ],
              ),
            ),
          ],
        );

    return Container(
      width: double.infinity,
      color: AppColors.primaryTint.withValues(alpha: 0.5),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        children: [
          Row(children: [
            Expanded(child: cell(items[0])),
            const SizedBox(width: 12),
            Expanded(child: cell(items[1])),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: cell(items[2])),
            const SizedBox(width: 12),
            Expanded(child: cell(items[3])),
          ]),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// banners
// ---------------------------------------------------------------------------

class _BecomeTeacherBanner extends StatelessWidget {
  const _BecomeTeacherBanner();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Material(
      borderRadius: BorderRadius.circular(AppTokens.radiusCard),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/profile'),
        child: Ink(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          padding: const EdgeInsets.all(AppTokens.s16),
          child: Row(
            children: [
              const Icon(Icons.school_rounded, color: Colors.white, size: 36),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.becomeTeacherTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: AppTokens.s4),
                    Text(
                      l10n.becomeTeacherBody,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _TeacherDashboardBanner extends ConsumerWidget {
  const _TeacherDashboardBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final count = ref.watch(teacherTodayCountProvider);
    return AppCard(
      onTap: () => context.push('/teacher'),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.light
                  ? AppColors.primaryTint
                  : Theme.of(context).colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.co_present_outlined,
                color: Theme.of(context).colorScheme.primary, size: 22),
          ),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.homeTeacherToday(count.value ?? 0),
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  l10n.homeTeacherPanelCta,
                  style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// compact inline error for a single section
// ---------------------------------------------------------------------------

class _InlineRetry extends StatelessWidget {
  const _InlineRetry({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: TextButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: Text(l10n.commonRetry),
      ),
    );
  }
}
