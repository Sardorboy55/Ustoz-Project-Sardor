import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../profile/data/profile_repository.dart';
import '../data/catalog_repository.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  CatalogFilters _filters = const CatalogFilters();
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      setState(() => _filters = _filters.copyWith(query: value, page: 1));
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;
    final cards = ref.watch(catalogCardsProvider(_filters));
    final categories = ref.watch(activeCategoriesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.catalogTitle)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchController,
              onChanged: _onQueryChanged,
              decoration: InputDecoration(
                hintText: l10n.catalogSearchHint,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onQueryChanged('');
                        },
                      )
                    : null,
              ),
            ),
          ),
          SizedBox(
            height: 56,
            child: categories.when(
              loading: () => const SizedBox.shrink(),
              error: (e, _) => const SizedBox.shrink(),
              data: (rows) => ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                children: [
                  FilterChip(
                    label: Text(l10n.catalogAll),
                    selected: _filters.categoryId == null,
                    onSelected: (_) => setState(() =>
                        _filters = _filters.copyWith(categoryId: () => null, page: 1)),
                  ),
                  const SizedBox(width: 8),
                  for (final c in rows) ...[
                    FilterChip(
                      label: Text(
                          locale == 'ru' ? c['name_ru'] as String : c['name_uz'] as String),
                      selected: _filters.categoryId == c['id'],
                      onSelected: (_) => setState(() => _filters = _filters.copyWith(
                          categoryId: () => c['id'] as String, page: 1)),
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: SegmentedButton<String>(
                    showSelectedIcon: false,
                    style: const ButtonStyle(visualDensity: VisualDensity.compact),
                    segments: [
                      ButtonSegment(value: 'recommended', label: Text(l10n.sortRecommended)),
                      ButtonSegment(value: 'price_asc', label: Text(l10n.sortCheap)),
                      ButtonSegment(value: 'rating', label: Text(l10n.sortRating)),
                    ],
                    selected: {_filters.sort},
                    onSelectionChanged: (s) => setState(
                        () => _filters = _filters.copyWith(sort: s.first, page: 1)),
                  ),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: Text(l10n.catalogTrialChip),
                  selected: _filters.trialOnly,
                  onSelected: (v) => setState(
                      () => _filters = _filters.copyWith(trialOnly: v, page: 1)),
                ),
              ],
            ),
          ),
          Expanded(
            child: cards.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(l10n.commonError)),
              data: (rows) => rows.isEmpty
                  ? Center(child: Text(l10n.catalogEmpty))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: rows.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, i) =>
                          _TeacherCard(card: rows[i], locale: locale),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

String _fmtUzs(num tiyin) {
  final uzs = (tiyin / 100).round().toString();
  return uzs.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ');
}

class _TeacherCard extends ConsumerWidget {
  const _TeacherCard({required this.card, required this.locale});

  final Map<String, dynamic> card;
  final String locale;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final name = card['full_name'] as String? ?? '';
    final headline =
        (locale == 'ru' ? card['headline_ru'] : card['headline_uz']) as String? ?? '';
    final price = _fmtUzs((card['min_price_60'] as num?) ?? 0);
    final rating = (card['rating_avg'] as num?)?.toDouble() ?? 0;
    final isPro = card['tier'] == 'pro';
    final hasTrial = card['has_free_trial'] == true;
    final avatarUrl = card['avatar_url'] as String?;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/t/${card['slug']}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                child: avatarUrl == null
                    ? Text(name.isEmpty
                        ? '?'
                        : name
                            .trim()
                            .split(RegExp(r'\s+'))
                            .map((w) => w[0])
                            .take(2)
                            .join()
                            .toUpperCase())
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        if (isPro) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade100,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('PRO',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.amber.shade800)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(headline,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant)),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 10,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('${l10n.catalogFrom} $price UZS',
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600)),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star_rounded,
                                size: 16, color: Colors.amber.shade600),
                            Text(rating.toStringAsFixed(1),
                                style: const TextStyle(fontSize: 13)),
                          ],
                        ),
                        if (hasTrial)
                          Container(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: scheme.primaryContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(l10n.catalogTrialBadge,
                                style: TextStyle(
                                    fontSize: 11, color: scheme.onPrimaryContainer)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
