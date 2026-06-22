import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/badges.dart';
import '../../../common/widgets/empty_state.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/rating_stars.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../core/providers/supabase_providers.dart';
import '../../../l10n/app_localizations.dart';
import '../../favorites/data/favorites_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../data/catalog_repository.dart';

const _pageSize = 20;
const _priceSliderMaxUzs = 500000.0; // RangeSlider upper bound, in UZS

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({
    super.key,
    this.initialCategoryId,
    this.initialTrialOnly = false,
    this.autofocusSearch = false,
    this.initialQuery,
  });

  final String? initialCategoryId;
  final bool initialTrialOnly;
  final bool autofocusSearch;
  final String? initialQuery;

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  CatalogFilters _filters = const CatalogFilters(limit: _pageSize);
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  final _scroll = ScrollController();
  Timer? _debounce;

  List<Map<String, dynamic>> _items = const [];
  int _total = 0;
  int _page = 1;
  bool _loading = true;
  bool _loadingMore = false;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _filters = _filters.copyWith(
      categoryId: () => widget.initialCategoryId,
      trialOnly: widget.initialTrialOnly,
      query: widget.initialQuery,
    );
    if ((widget.initialQuery ?? '').isNotEmpty) {
      _searchController.text = widget.initialQuery!;
    }
    _scroll.addListener(_onScroll);
    _load();
    if (widget.autofocusSearch) {
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _searchFocus.requestFocus());
    }
  }

  @override
  void didUpdateWidget(CatalogScreen old) {
    super.didUpdateWidget(old);
    // home navigates here with query params while the branch keeps state
    var changed = false;
    if (widget.initialCategoryId != old.initialCategoryId &&
        widget.initialCategoryId != null) {
      _filters = _filters.copyWith(categoryId: () => widget.initialCategoryId);
      changed = true;
    }
    if (widget.initialTrialOnly != old.initialTrialOnly &&
        widget.initialTrialOnly) {
      _filters = _filters.copyWith(trialOnly: true);
      changed = true;
    }
    if (widget.initialQuery != old.initialQuery &&
        (widget.initialQuery ?? '').isNotEmpty) {
      _filters = _filters.copyWith(query: widget.initialQuery);
      _searchController.text = widget.initialQuery!;
      changed = true;
    }
    if (changed) _load();
    if (widget.autofocusSearch && !old.autofocusSearch) {
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _searchFocus.requestFocus());
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.extentAfter < 400) _loadMore();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final rows = await ref
          .read(catalogRepositoryProvider)
          .fetchCards(_filters.copyWith(page: 1));
      if (!mounted) return;
      setState(() {
        _items = rows;
        _page = 1;
        _total = rows.isEmpty
            ? 0
            : (rows.first['total_count'] as num?)?.toInt() ?? rows.length;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = true;
        });
      }
    }
  }

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || _error || _items.length >= _total) return;
    setState(() => _loadingMore = true);
    try {
      final rows = await ref
          .read(catalogRepositoryProvider)
          .fetchCards(_filters.copyWith(page: _page + 1));
      if (!mounted) return;
      setState(() {
        _page += 1;
        _items = [..._items, ...rows];
        _loadingMore = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _applyFilters(CatalogFilters next) {
    setState(() => _filters = next);
    _load();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) _applyFilters(_filters.copyWith(query: value));
    });
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<CatalogFilters>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FiltersSheet(filters: _filters),
    );
    if (next != null) _applyFilters(next);
  }

  Future<void> _openSort() async {
    final l10n = AppLocalizations.of(context)!;
    final sort = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppTokens.s16, 0, AppTokens.s16, AppTokens.s8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(l10n.catalogSortTitle,
                    style: Theme.of(context).textTheme.titleLarge),
              ),
            ),
            for (final (value, label) in [
              ('recommended', l10n.sortRecommended),
              ('price_asc', l10n.sortPriceAsc),
              ('price_desc', l10n.sortPriceDesc),
              ('rating', l10n.sortRating),
            ])
              RadioListTile<String>(
                value: value,
                // ignore: deprecated_member_use
                groupValue: _filters.sort,
                // ignore: deprecated_member_use
                onChanged: (v) => Navigator.pop(context, v),
                title: Text(label),
              ),
            const SizedBox(height: AppTokens.s8),
          ],
        ),
      ),
    );
    if (sort != null && sort != _filters.sort) {
      _applyFilters(_filters.copyWith(sort: sort));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final hasFilters = _filters.hasActiveFilters;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.catalogTitle),
        actions: [
          IconButton(
            tooltip: l10n.catalogSortTitle,
            icon: const Icon(Icons.swap_vert_rounded),
            onPressed: _openSort,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppTokens.s16, AppTokens.s8, AppTokens.s16, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocus,
                    onChanged: _onQueryChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: l10n.catalogSearchHint,
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded),
                              onPressed: () {
                                _searchController.clear();
                                _onQueryChanged('');
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: AppTokens.s8),
                _FilterButton(active: hasFilters, onTap: _openFilters),
              ],
            ),
          ),
          _ActiveFilterChips(
            filters: _filters,
            onChanged: _applyFilters,
          ),
          Expanded(child: _buildList(l10n)),
        ],
      ),
    );
  }

  Widget _buildList(AppLocalizations l10n) {
    if (_loading) {
      return ListView.separated(
        padding: const EdgeInsets.all(AppTokens.s16),
        itemCount: 6,
        separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
        itemBuilder: (_, _) => const SkeletonCard(),
      );
    }
    if (_error) return ErrorState(onRetry: _load);
    if (_items.isEmpty) {
      final canReset = _filters.hasActiveFilters ||
          (_filters.query?.isNotEmpty ?? false);
      return EmptyState(
        icon: Icons.search_off_rounded,
        title: l10n.catalogEmpty,
        body: l10n.catalogEmptyBody,
        actionLabel: canReset ? l10n.catalogResetFilters : null,
        onAction: canReset
            ? () {
                _searchController.clear();
                _applyFilters(const CatalogFilters(limit: _pageSize));
              }
            : null,
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppTokens.s16),
        itemCount: _items.length + (_loadingMore ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
        itemBuilder: (context, i) {
          if (i >= _items.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(AppTokens.s12),
                child: SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(strokeWidth: 2.6),
                ),
              ),
            );
          }
          return TeacherCard(card: _items[i]);
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// filter trigger button (with active dot)
// ---------------------------------------------------------------------------

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        SizedBox(
          width: 48,
          height: 48,
          child: Material(
            color: active ? AppColors.primaryTint : scheme.surface,
            borderRadius: BorderRadius.circular(AppTokens.radiusButton),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppTokens.radiusButton),
              onTap: onTap,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppTokens.radiusButton),
                  border: Border.all(
                      color:
                          active ? scheme.primary : scheme.outlineVariant),
                ),
                child: Tooltip(
                  message: l10n.catalogFilters,
                  child: Icon(Icons.tune_rounded,
                      color:
                          active ? scheme.primary : scheme.onSurfaceVariant),
                ),
              ),
            ),
          ),
        ),
        if (active)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
                border: Border.all(color: scheme.surface, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// active filter chips (deletable)
// ---------------------------------------------------------------------------

class _ActiveFilterChips extends ConsumerWidget {
  const _ActiveFilterChips({required this.filters, required this.onChanged});

  final CatalogFilters filters;
  final ValueChanged<CatalogFilters> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    if (!filters.hasActiveFilters) return const SizedBox.shrink();

    final categories = ref.watch(activeCategoriesProvider).value ?? const [];
    final subjects = ref.watch(activeSubjectsProvider).value ?? const [];

    String? nameOf(List<Map<String, dynamic>> rows, String? id) {
      if (id == null) return null;
      for (final r in rows) {
        if (r['id'] == id) {
          return (locale.languageCode == 'ru' ? r['name_ru'] : r['name_uz'])
              as String?;
        }
      }
      return null;
    }

    final chips = <(String, CatalogFilters Function())>[
      if (filters.categoryId != null)
        (
          nameOf(categories, filters.categoryId) ?? l10n.filterCategory,
          () => filters.copyWith(categoryId: () => null, subjectId: () => null),
        ),
      if (filters.subjectId != null)
        (
          nameOf(subjects, filters.subjectId) ?? l10n.filterSubject,
          () => filters.copyWith(subjectId: () => null),
        ),
      if (filters.priceMinTiyin != null || filters.priceMaxTiyin != null)
        (
          '${formatTiyinBare(filters.priceMinTiyin ?? 0)}–'
              '${formatTiyinBare(filters.priceMaxTiyin ?? (_priceSliderMaxUzs * 100).round())}',
          () => filters.copyWith(
              priceMinTiyin: () => null, priceMaxTiyin: () => null),
        ),
      if (filters.ratingMin != null)
        ('4+ ★', () => filters.copyWith(ratingMin: () => null)),
      if (filters.lang != null)
        (
          filters.lang!.toUpperCase(),
          () => filters.copyWith(lang: () => null),
        ),
      if (filters.trialOnly)
        (l10n.catalogTrialChip, () => filters.copyWith(trialOnly: false)),
    ];

    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s16, vertical: AppTokens.s8),
        itemCount: chips.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s8),
        itemBuilder: (context, i) {
          final (label, remove) = chips[i];
          return InputChip(
            label: Text(label),
            onDeleted: () => onChanged(remove()),
            deleteIcon: const Icon(Icons.close_rounded, size: 16),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// teacher card v2 (shared look for the catalog list)
// ---------------------------------------------------------------------------

class TeacherCard extends ConsumerWidget {
  const TeacherCard({super.key, required this.card});

  final Map<String, dynamic> card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;

    final teacherId = card['user_id'] as String;
    final name = card['full_name'] as String? ?? '';
    final headline =
        (locale.languageCode == 'ru' ? card['headline_ru'] : card['headline_uz'])
                as String? ??
            '';
    final rating = (card['rating_avg'] as num?)?.toDouble() ?? 0;
    final ratingCount = (card['rating_count'] as num?)?.toInt() ?? 0;
    final lessonsDone = (card['lessons_done'] as num?)?.toInt() ?? 0;
    final langs = (card['teaching_langs'] as List? ?? [])
        .cast<String>()
        .map((s) => s.toUpperCase())
        .toList();
    final subjects = ((locale.languageCode == 'ru'
                ? card['subjects_ru']
                : card['subjects_uz']) as List? ??
            [])
        .cast<String>();
    final minPrice = card['min_price_60'] as num?;
    final favorites = ref.watch(favoriteIdsProvider).value ?? const <String>{};
    final isFavorite = favorites.contains(teacherId);

    final priceLine = minPrice == null
        ? null
        : (locale.languageCode == 'ru'
            ? '${l10n.catalogFrom} ${formatTiyin(minPrice, locale)}'
            : '${formatTiyin(minPrice, locale)} ${l10n.catalogFrom}');

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      onTap: () => context.push('/t/${card['slug']}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppAvatar(
                  imageUrl: card['avatar_url'] as String?,
                  name: name,
                  size: 64),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (card['is_verified'] == true) ...[
                          const SizedBox(width: 4),
                          const VerifiedBadge(size: 15),
                        ],
                        if (card['tier'] == 'pro') ...[
                          const SizedBox(width: 6),
                          const ProBadge(),
                        ],
                      ],
                    ),
                    if (headline.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        headline,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 13,
                            height: 1.3,
                            color: scheme.onSurfaceVariant),
                      ),
                    ],
                    const SizedBox(height: AppTokens.s4),
                    Row(
                      children: [
                        RatingStars(
                            rating: rating, size: 14, showValue: true),
                        if (ratingCount > 0)
                          Text(
                            ' ($ratingCount)',
                            style: TextStyle(
                                fontSize: 12,
                                color: scheme.onSurfaceVariant),
                          ),
                        Text(
                          '  ·  ${l10n.cardLessonsCount(lessonsDone)}',
                          style: TextStyle(
                              fontSize: 12, color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _FavoriteHeart(teacherId: teacherId, isFavorite: isFavorite),
            ],
          ),
          if (langs.isNotEmpty || subjects.isNotEmpty) ...[
            const SizedBox(height: AppTokens.s8),
            Row(
              children: [
                if (langs.isNotEmpty) ...[
                  Icon(Icons.language_rounded,
                      size: 14, color: scheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    langs.join(' · '),
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(width: AppTokens.s12),
                ],
                if (subjects.isNotEmpty)
                  Expanded(
                    child: Text(
                      subjects.take(3).join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: AppTokens.s8),
          Row(
            children: [
              if (priceLine != null)
                Text(
                  priceLine,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                  ),
                ),
              if (card['has_free_trial'] == true) ...[
                const SizedBox(width: AppTokens.s8),
                const TrialBadge(),
              ],
              const Spacer(),
              FilledButton(
                onPressed: () => context.push('/t/${card['slug']}'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  textStyle:
                      const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                child: Text(locale.languageCode == 'ru' ? 'Выбрать' : 'Tanlash'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Optimistic favorite toggle; guests are sent to auth.
class _FavoriteHeart extends ConsumerWidget {
  const _FavoriteHeart({required this.teacherId, required this.isFavorite});

  final String teacherId;
  final bool isFavorite;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tokens = AppTokens.of(context);
    return IconButton(
      visualDensity: VisualDensity.compact,
      icon: Icon(
        isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
        color: isFavorite
            ? tokens.danger
            : Theme.of(context).colorScheme.onSurfaceVariant,
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
    );
  }
}

// ---------------------------------------------------------------------------
// filters bottom sheet
// ---------------------------------------------------------------------------

class _FiltersSheet extends ConsumerStatefulWidget {
  const _FiltersSheet({required this.filters});

  final CatalogFilters filters;

  @override
  ConsumerState<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<_FiltersSheet> {
  late String? _categoryId = widget.filters.categoryId;
  late String? _subjectId = widget.filters.subjectId;
  late RangeValues _price = RangeValues(
    (widget.filters.priceMinTiyin ?? 0) / 100,
    (widget.filters.priceMaxTiyin ?? (_priceSliderMaxUzs * 100).round()) / 100,
  );
  late bool _rating4 = widget.filters.ratingMin != null;
  late String? _lang = widget.filters.lang;
  late bool _trialOnly = widget.filters.trialOnly;

  bool get _priceTouched =>
      _price.start > 0 || _price.end < _priceSliderMaxUzs;

  void _reset() {
    setState(() {
      _categoryId = null;
      _subjectId = null;
      _price = const RangeValues(0, _priceSliderMaxUzs);
      _rating4 = false;
      _lang = null;
      _trialOnly = false;
    });
  }

  void _apply() {
    Navigator.pop(
      context,
      widget.filters.copyWith(
        categoryId: () => _categoryId,
        subjectId: () => _subjectId,
        priceMinTiyin: () =>
            _price.start > 0 ? (_price.start.round() * 100) : null,
        priceMaxTiyin: () => _price.end < _priceSliderMaxUzs
            ? (_price.end.round() * 100)
            : null,
        ratingMin: () => _rating4 ? 4 : null,
        lang: () => _lang,
        trialOnly: _trialOnly,
        page: 1,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final categories = ref.watch(activeCategoriesProvider).value ?? const [];
    final allSubjects = ref.watch(activeSubjectsProvider).value ?? const [];
    final subjects = _categoryId == null
        ? allSubjects
        : allSubjects
            .where((s) => s['category_id'] == _categoryId)
            .toList(growable: false);
    final scheme = Theme.of(context).colorScheme;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, scroll) => Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(
                  AppTokens.s16, AppTokens.s8, AppTokens.s16, AppTokens.s16),
              children: [
                Text(l10n.catalogFilters,
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppTokens.s16),
                Text(l10n.filterCategory,
                    style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: AppTokens.s8),
                Wrap(
                  spacing: AppTokens.s8,
                  runSpacing: AppTokens.s8,
                  children: [
                    ChoiceChip(
                      label: Text(l10n.catalogAll),
                      selected: _categoryId == null,
                      onSelected: (_) => setState(() {
                        _categoryId = null;
                        _subjectId = null;
                      }),
                    ),
                    for (final c in categories)
                      ChoiceChip(
                        label: Text((locale == 'ru'
                            ? c['name_ru']
                            : c['name_uz']) as String),
                        selected: _categoryId == c['id'],
                        onSelected: (_) => setState(() {
                          _categoryId = c['id'] as String;
                          _subjectId = null;
                        }),
                      ),
                  ],
                ),
                const SizedBox(height: AppTokens.s16),
                Text(l10n.filterSubject,
                    style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: AppTokens.s8),
                DropdownButtonFormField<String?>(
                  key: ValueKey(_categoryId),
                  initialValue: _subjectId,
                  isExpanded: true,
                  items: [
                    DropdownMenuItem<String?>(
                      value: null,
                      child: Text(l10n.filterAnySubject),
                    ),
                    for (final s in subjects)
                      DropdownMenuItem<String?>(
                        value: s['id'] as String,
                        child: Text(
                          (locale == 'ru' ? s['name_ru'] : s['name_uz'])
                              as String,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (v) => setState(() => _subjectId = v),
                ),
                const SizedBox(height: AppTokens.s16),
                Text(l10n.filterPrice,
                    style: Theme.of(context).textTheme.titleSmall),
                RangeSlider(
                  values: _price,
                  max: _priceSliderMaxUzs,
                  divisions: 50,
                  labels: RangeLabels(
                    formatTiyinBare(_price.start * 100),
                    formatTiyinBare(_price.end * 100),
                  ),
                  onChanged: (v) => setState(() => _price = v),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      formatTiyin(_price.start * 100,
                          Localizations.localeOf(context)),
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant),
                    ),
                    Text(
                      _price.end >= _priceSliderMaxUzs
                          ? '${formatTiyin(_price.end * 100, Localizations.localeOf(context))}+'
                          : formatTiyin(_price.end * 100,
                              Localizations.localeOf(context)),
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
                const SizedBox(height: AppTokens.s8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.filterRatingMin,
                      style: const TextStyle(fontSize: 15)),
                  value: _rating4,
                  onChanged: (v) => setState(() => _rating4 = v),
                ),
                const SizedBox(height: AppTokens.s8),
                Text(l10n.filterLang,
                    style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: AppTokens.s8),
                Wrap(
                  spacing: AppTokens.s8,
                  children: [
                    for (final (code, label) in [
                      ('uz', l10n.languageUzbek),
                      ('ru', l10n.languageRussian),
                      ('en', l10n.languageEnglish),
                    ])
                      ChoiceChip(
                        label: Text(label),
                        selected: _lang == code,
                        onSelected: (sel) =>
                            setState(() => _lang = sel ? code : null),
                      ),
                  ],
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.filterTrialOnly,
                      style: const TextStyle(fontSize: 15)),
                  value: _trialOnly,
                  onChanged: (v) => setState(() => _trialOnly = v),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppTokens.s16, AppTokens.s8, AppTokens.s16, AppTokens.s16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: (_categoryId != null ||
                              _subjectId != null ||
                              _priceTouched ||
                              _rating4 ||
                              _lang != null ||
                              _trialOnly)
                          ? _reset
                          : null,
                      child: Text(l10n.filterReset),
                    ),
                  ),
                  const SizedBox(width: AppTokens.s12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _apply,
                      child: Text(l10n.filterShow),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
