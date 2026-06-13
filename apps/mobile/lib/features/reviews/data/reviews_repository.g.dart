// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reviews_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(reviewsRepository)
const reviewsRepositoryProvider = ReviewsRepositoryProvider._();

final class ReviewsRepositoryProvider
    extends
        $FunctionalProvider<
          ReviewsRepository,
          ReviewsRepository,
          ReviewsRepository
        >
    with $Provider<ReviewsRepository> {
  const ReviewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'reviewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$reviewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ReviewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReviewsRepository create(Ref ref) {
    return reviewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReviewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReviewsRepository>(value),
    );
  }
}

String _$reviewsRepositoryHash() => r'e927792c47e71d8baadd4cd89b502242b52a8ec7';
