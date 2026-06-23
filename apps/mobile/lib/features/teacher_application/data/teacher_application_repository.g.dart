// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'teacher_application_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(teacherApplicationRepository)
const teacherApplicationRepositoryProvider =
    TeacherApplicationRepositoryProvider._();

final class TeacherApplicationRepositoryProvider
    extends
        $FunctionalProvider<
          TeacherApplicationRepository,
          TeacherApplicationRepository,
          TeacherApplicationRepository
        >
    with $Provider<TeacherApplicationRepository> {
  const TeacherApplicationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'teacherApplicationRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$teacherApplicationRepositoryHash();

  @$internal
  @override
  $ProviderElement<TeacherApplicationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  TeacherApplicationRepository create(Ref ref) {
    return teacherApplicationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TeacherApplicationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TeacherApplicationRepository>(value),
    );
  }
}

String _$teacherApplicationRepositoryHash() =>
    r'caf325201f87be5134fb63121115da5dc647aa01';
