// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'teacher_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(teacherRepository)
const teacherRepositoryProvider = TeacherRepositoryProvider._();

final class TeacherRepositoryProvider
    extends
        $FunctionalProvider<
          TeacherRepository,
          TeacherRepository,
          TeacherRepository
        >
    with $Provider<TeacherRepository> {
  const TeacherRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherRepositoryHash();

  @$internal
  @override
  $ProviderElement<TeacherRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  TeacherRepository create(Ref ref) {
    return teacherRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TeacherRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TeacherRepository>(value),
    );
  }
}

String _$teacherRepositoryHash() => r'afbeb736970d7057c8bc2e0eceea899b9a220ff0';

@ProviderFor(teacherUpcomingLessons)
const teacherUpcomingLessonsProvider = TeacherUpcomingLessonsProvider._();

final class TeacherUpcomingLessonsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<String, dynamic>>>,
          List<Map<String, dynamic>>,
          FutureOr<List<Map<String, dynamic>>>
        >
    with
        $FutureModifier<List<Map<String, dynamic>>>,
        $FutureProvider<List<Map<String, dynamic>>> {
  const TeacherUpcomingLessonsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherUpcomingLessonsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherUpcomingLessonsHash();

  @$internal
  @override
  $FutureProviderElement<List<Map<String, dynamic>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Map<String, dynamic>>> create(Ref ref) {
    return teacherUpcomingLessons(ref);
  }
}

String _$teacherUpcomingLessonsHash() =>
    r'cba10f47f534b331b775572265bb54472c5320b4';

@ProviderFor(teacherMonthIncome)
const teacherMonthIncomeProvider = TeacherMonthIncomeProvider._();

final class TeacherMonthIncomeProvider
    extends $FunctionalProvider<AsyncValue<int>, int, FutureOr<int>>
    with $FutureModifier<int>, $FutureProvider<int> {
  const TeacherMonthIncomeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherMonthIncomeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherMonthIncomeHash();

  @$internal
  @override
  $FutureProviderElement<int> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<int> create(Ref ref) {
    return teacherMonthIncome(ref);
  }
}

String _$teacherMonthIncomeHash() =>
    r'796ce4ba3330e3dc199fc5190a450df6379d548e';

@ProviderFor(teacherLessonsDone)
const teacherLessonsDoneProvider = TeacherLessonsDoneProvider._();

final class TeacherLessonsDoneProvider
    extends $FunctionalProvider<AsyncValue<int>, int, FutureOr<int>>
    with $FutureModifier<int>, $FutureProvider<int> {
  const TeacherLessonsDoneProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherLessonsDoneProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherLessonsDoneHash();

  @$internal
  @override
  $FutureProviderElement<int> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<int> create(Ref ref) {
    return teacherLessonsDone(ref);
  }
}

String _$teacherLessonsDoneHash() =>
    r'e5b6beb6818d77c8a3ed10f0a8a1175fadc75111';

@ProviderFor(teacherWallet)
const teacherWalletProvider = TeacherWalletProvider._();

final class TeacherWalletProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, int>>,
          Map<String, int>,
          FutureOr<Map<String, int>>
        >
    with $FutureModifier<Map<String, int>>, $FutureProvider<Map<String, int>> {
  const TeacherWalletProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherWalletProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherWalletHash();

  @$internal
  @override
  $FutureProviderElement<Map<String, int>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, int>> create(Ref ref) {
    return teacherWallet(ref);
  }
}

String _$teacherWalletHash() => r'870dfe1535d1988625ecf5a127ee2867ddd0411f';

@ProviderFor(teacherWalletTransactions)
const teacherWalletTransactionsProvider = TeacherWalletTransactionsProvider._();

final class TeacherWalletTransactionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<String, dynamic>>>,
          List<Map<String, dynamic>>,
          FutureOr<List<Map<String, dynamic>>>
        >
    with
        $FutureModifier<List<Map<String, dynamic>>>,
        $FutureProvider<List<Map<String, dynamic>>> {
  const TeacherWalletTransactionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherWalletTransactionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherWalletTransactionsHash();

  @$internal
  @override
  $FutureProviderElement<List<Map<String, dynamic>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Map<String, dynamic>>> create(Ref ref) {
    return teacherWalletTransactions(ref);
  }
}

String _$teacherWalletTransactionsHash() =>
    r'cf136b681985b92450ce258cc32690491384946a';
