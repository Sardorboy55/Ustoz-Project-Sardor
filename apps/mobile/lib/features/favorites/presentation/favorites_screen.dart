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
import '../../../l10n/app_localizations.dart';
import '../data/favorites_repository.dart';

/// Bookmarked teachers as a 2-column grid with quick unfavorite.
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final cards = ref.watch(favoriteCardsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.menuFavorites)),
      body: cards.when(
        loading: () => GridView.builder(
          padding: const EdgeInsets.all(AppTokens.s16),
          gridDelegate: _gridDelegate,
          itemCount: 4,
          itemBuilder: (_, _) => const SkeletonPulse(child: SkeletonCard()),
        ),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(favoriteCardsProvider)),
        data: (rows) {
          if (rows.isEmpty) {
            return EmptyState(
              icon: Icons.favorite_border_rounded,
              title: l10n.favoritesEmptyTitle,
              body: l10n.favoritesEmptyBody,
              actionLabel: l10n.chatsEmptyAction,
              onAction: () => context.go('/catalog'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(favoriteCardsProvider);
              await ref
                  .read(favoriteCardsProvider.future)
                  .catchError((_) => <Map<String, dynamic>>[]);
            },
            child: GridView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppTokens.s16),
              gridDelegate: _gridDelegate,
              itemCount: rows.length,
              itemBuilder: (context, i) => _FavoriteCard(card: rows[i]),
            ),
          );
        },
      ),
    );
  }
}

const _gridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  mainAxisSpacing: AppTokens.s12,
  crossAxisSpacing: AppTokens.s12,
  childAspectRatio: 0.74,
);

class _FavoriteCard extends ConsumerWidget {
  const _FavoriteCard({required this.card});

  final Map<String, dynamic> card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final name = card['full_name'] as String? ?? '';
    final rating = (card['rating_avg'] as num?)?.toDouble() ?? 0;
    final minPrice = card['min_price_60'] as num?;
    final teacherId = card['user_id'] as String;

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      onTap: () => context.push('/t/${card['slug']}'),
      child: Stack(
        children: [
          Positioned(
            top: -6,
            right: -6,
            child: IconButton(
              visualDensity: VisualDensity.compact,
              icon: Icon(
                Icons.favorite_rounded,
                size: 22,
                color: AppTokens.of(context).danger,
              ),
              onPressed: () => ref
                  .read(favoriteIdsProvider.notifier)
                  .toggle(teacherId)
                  .catchError((_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.commonError)),
                  );
                }
              }),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: AppTokens.s8),
              Stack(
                clipBehavior: Clip.none,
                children: [
                  AppAvatar(
                    imageUrl: card['avatar_url'] as String?,
                    name: name,
                    size: 64,
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
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (card['is_verified'] == true) ...[
                    const SizedBox(width: 3),
                    const VerifiedBadge(size: 14),
                  ],
                ],
              ),
              const SizedBox(height: AppTokens.s4),
              RatingStars(rating: rating, size: 14, showValue: true),
              const Spacer(),
              if (minPrice != null)
                Text(
                  locale.languageCode == 'ru'
                      ? '${l10n.catalogFrom} ${formatTiyin(minPrice, locale)}'
                      : '${formatTiyin(minPrice, locale)} ${l10n.catalogFrom}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                  ),
                ),
              const SizedBox(height: AppTokens.s4),
            ],
          ),
        ],
      ),
    );
  }
}
