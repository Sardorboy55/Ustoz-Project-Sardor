// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'catalog_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(catalogRepository)
const catalogRepositoryProvider = CatalogRepositoryProvider._();

final class CatalogRepositoryProvider
    extends
        $FunctionalProvider<
          CatalogRepository,
          CatalogRepository,
          CatalogRepository
        >
    with $Provider<CatalogRepository> {
  const CatalogRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'catalogRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$catalogRepositoryHash();

  @$internal
  @override
  $ProviderElement<CatalogRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CatalogRepository create(Ref ref) {
    return catalogRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CatalogRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CatalogRepository>(value),
    );
  }
}

String _$catalogRepositoryHash() => r'ee3647f658e5c4a04e83a636f5249d79d736f72f';

@ProviderFor(catalogCards)
const catalogCardsProvider = CatalogCardsFamily._();

final class CatalogCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<String, dynamic>>>,
          List<Map<String, dynamic>>,
          FutureOr<List<Map<String, dynamic>>>
        >
    with
        $FutureModifier<List<Map<String, dynamic>>>,
        $FutureProvider<List<Map<String, dynamic>>> {
  const CatalogCardsProvider._({
    required CatalogCardsFamily super.from,
    required CatalogFilters super.argument,
  }) : super(
         retry: null,
         name: r'catalogCardsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$catalogCardsHash();

  @override
  String toString() {
    return r'catalogCardsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<Map<String, dynamic>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Map<String, dynamic>>> create(Ref ref) {
    final argument = this.argument as CatalogFilters;
    return catalogCards(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is CatalogCardsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$catalogCardsHash() => r'e79f770e401e7d15633399d7562b7b233dc6657c';

final class CatalogCardsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<Map<String, dynamic>>>,
          CatalogFilters
        > {
  const CatalogCardsFamily._()
    : super(
        retry: null,
        name: r'catalogCardsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  CatalogCardsProvider call(CatalogFilters filters) =>
      CatalogCardsProvider._(argument: filters, from: this);

  @override
  String toString() => r'catalogCardsProvider';
}

@ProviderFor(teacherBySlug)
const teacherBySlugProvider = TeacherBySlugFamily._();

final class TeacherBySlugProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, dynamic>?>,
          Map<String, dynamic>?,
          FutureOr<Map<String, dynamic>?>
        >
    with
        $FutureModifier<Map<String, dynamic>?>,
        $FutureProvider<Map<String, dynamic>?> {
  const TeacherBySlugProvider._({
    required TeacherBySlugFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'teacherBySlugProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$teacherBySlugHash();

  @override
  String toString() {
    return r'teacherBySlugProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, dynamic>?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, dynamic>?> create(Ref ref) {
    final argument = this.argument as String;
    return teacherBySlug(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is TeacherBySlugProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$teacherBySlugHash() => r'31926a63ff3e5551bf917511cb0a9251ebbdd28d';

final class TeacherBySlugFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Map<String, dynamic>?>, String> {
  const TeacherBySlugFamily._()
    : super(
        retry: null,
        name: r'teacherBySlugProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  TeacherBySlugProvider call(String slug) =>
      TeacherBySlugProvider._(argument: slug, from: this);

  @override
  String toString() => r'teacherBySlugProvider';
}
