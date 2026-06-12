// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'favorites_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(favoritesRepository)
const favoritesRepositoryProvider = FavoritesRepositoryProvider._();

final class FavoritesRepositoryProvider
    extends
        $FunctionalProvider<
          FavoritesRepository,
          FavoritesRepository,
          FavoritesRepository
        >
    with $Provider<FavoritesRepository> {
  const FavoritesRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'favoritesRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$favoritesRepositoryHash();

  @$internal
  @override
  $ProviderElement<FavoritesRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  FavoritesRepository create(Ref ref) {
    return favoritesRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FavoritesRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FavoritesRepository>(value),
    );
  }
}

String _$favoritesRepositoryHash() =>
    r'7c37260c994200f1cee0294afce29bb6e4797148';

/// Set of bookmarked teacher ids with optimistic [toggle].
/// Empty set for guests — heart taps must route guests to auth instead.

@ProviderFor(FavoriteIds)
const favoriteIdsProvider = FavoriteIdsProvider._();

/// Set of bookmarked teacher ids with optimistic [toggle].
/// Empty set for guests — heart taps must route guests to auth instead.
final class FavoriteIdsProvider
    extends $AsyncNotifierProvider<FavoriteIds, Set<String>> {
  /// Set of bookmarked teacher ids with optimistic [toggle].
  /// Empty set for guests — heart taps must route guests to auth instead.
  const FavoriteIdsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'favoriteIdsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$favoriteIdsHash();

  @$internal
  @override
  FavoriteIds create() => FavoriteIds();
}

String _$favoriteIdsHash() => r'd538d6e51f6a12406002f67a6d552e8129584ce0';

/// Set of bookmarked teacher ids with optimistic [toggle].
/// Empty set for guests — heart taps must route guests to auth instead.

abstract class _$FavoriteIds extends $AsyncNotifier<Set<String>> {
  FutureOr<Set<String>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final created = build();
    final ref = this.ref as $Ref<AsyncValue<Set<String>>, Set<String>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<Set<String>>, Set<String>>,
              AsyncValue<Set<String>>,
              Object?,
              Object?
            >;
    element.handleValue(ref, created);
  }
}

/// Favorite teacher cards for the home row.

@ProviderFor(favoriteCards)
const favoriteCardsProvider = FavoriteCardsProvider._();

/// Favorite teacher cards for the home row.

final class FavoriteCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<String, dynamic>>>,
          List<Map<String, dynamic>>,
          FutureOr<List<Map<String, dynamic>>>
        >
    with
        $FutureModifier<List<Map<String, dynamic>>>,
        $FutureProvider<List<Map<String, dynamic>>> {
  /// Favorite teacher cards for the home row.
  const FavoriteCardsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'favoriteCardsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$favoriteCardsHash();

  @$internal
  @override
  $FutureProviderElement<List<Map<String, dynamic>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Map<String, dynamic>>> create(Ref ref) {
    return favoriteCards(ref);
  }
}

String _$favoriteCardsHash() => r'c23c8aec47d8b9b216a5c36285db41d4c15dff52';
