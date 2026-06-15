import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';
import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../profile/data/profile_repository.dart';
import 'availability_tab.dart';
import 'teacher_dashboard_tab.dart';

/// Teacher cabinet: overview dashboard + анкета + subjects & prices + schedule.
class TeacherScreen extends ConsumerWidget {
  const TeacherScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.teacherCabinet),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: l10n.teacherTabDashboard),
              Tab(text: l10n.teacherTabProfile),
              Tab(text: l10n.teacherTabSubjects),
              Tab(text: l10n.teacherTabSchedule),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            TeacherDashboardTab(),
            _TeacherProfileTab(),
            _TeacherSubjectsTab(),
            AvailabilityTab(),
          ],
        ),
      ),
    );
  }
}

// ===================== Анкета =====================

class _TeacherProfileTab extends ConsumerStatefulWidget {
  const _TeacherProfileTab();

  @override
  ConsumerState<_TeacherProfileTab> createState() => _TeacherProfileTabState();
}

class _TeacherProfileTabState extends ConsumerState<_TeacherProfileTab> {
  final _headlineUz = TextEditingController();
  final _headlineRu = TextEditingController();
  final _bioUz = TextEditingController();
  final _bioRu = TextEditingController();
  final _years = TextEditingController(text: '0');
  final _langs = <String>{'uz'};
  bool _loaded = false;
  bool _saving = false;
  String? _videoUrl;
  bool _uploading = false;

  @override
  void dispose() {
    for (final c in [_headlineUz, _headlineRu, _bioUz, _bioRu, _years]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final row = await ref.read(profileRepositoryProvider).fetchTeacherProfile();
    if (row == null || !mounted) return;
    _headlineUz.text = row['headline_uz'] as String? ?? '';
    _headlineRu.text = row['headline_ru'] as String? ?? '';
    _bioUz.text = row['bio_uz'] as String? ?? '';
    _bioRu.text = row['bio_ru'] as String? ?? '';
    _years.text = '${row['experience_years'] ?? 0}';
    _langs
      ..clear()
      ..addAll((row['teaching_langs'] as List?)?.cast<String>() ?? ['uz']);
    _videoUrl = row['intro_video_url'] as String?;
    setState(() => _loaded = true);
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _saving = true);
    try {
      await ref.read(profileRepositoryProvider).updateTeacherProfile({
        'headline_uz': _headlineUz.text.trim(),
        'headline_ru': _headlineRu.text.trim(),
        'bio_uz': _bioUz.text.trim(),
        'bio_ru': _bioRu.text.trim(),
        'experience_years': int.tryParse(_years.text) ?? 0,
        'teaching_langs': _langs.toList(),
        if (_videoUrl != null) 'intro_video_url': _videoUrl,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonSaved)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAndUpload({required bool video}) async {
    final l10n = AppLocalizations.of(context)!;
    final picker = ImagePicker();
    final XFile? file = video
        ? await picker.pickVideo(
            source: ImageSource.gallery,
            maxDuration: const Duration(seconds: 90),
          )
        : await picker.pickImage(
            source: ImageSource.gallery, maxWidth: 1024, imageQuality: 85);
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final bytes = await File(file.path).readAsBytes();
      final repo = ref.read(profileRepositoryProvider);
      if (video) {
        if (bytes.length > 100 * 1024 * 1024) {
          throw Exception('too large');
        }
        final url = await repo.uploadToBucket(
          'intro-videos',
          'intro.mp4',
          bytes,
          contentType: 'video/mp4',
        );
        _videoUrl = url;
        await repo.updateTeacherProfile({'intro_video_url': url});
      } else {
        final url = await repo.uploadToBucket(
          'avatars',
          'avatar.jpg',
          bytes,
          contentType: 'image/jpeg',
        );
        await repo.updateProfile(avatarUrl: url);
        ref.invalidate(ownProfileProvider);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonSaved)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (!_loaded) {
      _load();
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(AppTokens.s16),
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.photo_camera),
                label: Text(l10n.teacherUploadPhoto),
                onPressed: _uploading ? null : () => _pickAndUpload(video: false),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                icon: Icon(_videoUrl == null ? Icons.videocam : Icons.check_circle),
                label: Text(l10n.teacherUploadVideo),
                onPressed: _uploading ? null : () => _pickAndUpload(video: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _headlineUz,
          decoration: InputDecoration(labelText: l10n.teacherHeadlineUz),
          maxLength: 120,
        ),
        TextField(
          controller: _headlineRu,
          decoration: InputDecoration(labelText: l10n.teacherHeadlineRu),
          maxLength: 120,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _bioUz,
          decoration: InputDecoration(labelText: l10n.teacherBioUz),
          maxLines: 4,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _bioRu,
          decoration: InputDecoration(labelText: l10n.teacherBioRu),
          maxLines: 4,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _years,
          decoration: InputDecoration(labelText: l10n.teacherExperience),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 16),
        Text(l10n.teacherLangs, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final lang in const ['uz', 'ru', 'en'])
              FilterChip(
                label: Text(lang.toUpperCase()),
                selected: _langs.contains(lang),
                onSelected: (sel) => setState(() {
                  if (sel) {
                    _langs.add(lang);
                  } else if (_langs.length > 1) {
                    _langs.remove(lang);
                  }
                }),
              ),
          ],
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(l10n.commonSave),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

// ===================== Предметы и цены =====================

class _TeacherSubjectsTab extends ConsumerStatefulWidget {
  const _TeacherSubjectsTab();

  @override
  ConsumerState<_TeacherSubjectsTab> createState() => _TeacherSubjectsTabState();
}

class _TeacherSubjectsTabState extends ConsumerState<_TeacherSubjectsTab> {
  List<Map<String, dynamic>>? _mine;

  Future<void> _refresh() async {
    final rows =
        await ref.read(profileRepositoryProvider).fetchOwnTeacherSubjects();
    if (mounted) setState(() => _mine = rows);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;

    if (_mine == null) {
      _refresh();
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: Text(l10n.teacherAddSubject),
        onPressed: () async {
          final saved = await showModalBottomSheet<bool>(
            context: context,
            isScrollControlled: true,
            builder: (_) => const _SubjectSheet(),
          );
          if (saved == true) _refresh();
        },
      ),
      body: _mine!.isEmpty
          ? Center(child: Text(l10n.teacherNoSubjects))
          : ListView(
              padding: const EdgeInsets.all(AppTokens.s16),
              children: [
                for (final ts in _mine!)
                  AppCard(
                    margin: const EdgeInsets.only(bottom: AppTokens.s12),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTokens.s4,
                      vertical: AppTokens.s4,
                    ),
                    child: ListTile(
                      title: Text(
                        locale == 'ru'
                            ? (ts['subjects']?['name_ru'] ?? '') as String
                            : (ts['subjects']?['name_uz'] ?? '') as String,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '60 ${l10n.minutes}: ${formatTiyin((ts['price_60'] as num?) ?? 0, Localizations.localeOf(context))}'
                        '${ts['trial_free_enabled'] == true ? ' · ${l10n.teacherTrialOn}' : ''}',
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () async {
                          await ref
                              .read(profileRepositoryProvider)
                              .deleteTeacherSubject(ts['id'] as String);
                          _refresh();
                        },
                      ),
                    ),
                  ),
                const SizedBox(height: 80),
              ],
            ),
    );
  }
}

class _SubjectSheet extends ConsumerStatefulWidget {
  const _SubjectSheet();

  @override
  ConsumerState<_SubjectSheet> createState() => _SubjectSheetState();
}

class _SubjectSheetState extends ConsumerState<_SubjectSheet> {
  List<Map<String, dynamic>>? _subjects;
  String? _subjectId;
  final _price30 = TextEditingController();
  final _price60 = TextEditingController();
  final _price90 = TextEditingController();
  bool _trialFree = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _price30.dispose();
    _price60.dispose();
    _price90.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final p60 = int.tryParse(_price60.text);
    if (_subjectId == null || p60 == null || p60 <= 0) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(profileRepositoryProvider).upsertTeacherSubject(
            subjectId: _subjectId!,
            price30: int.tryParse(_price30.text) != null
                ? int.parse(_price30.text) * 100
                : null,
            price60: p60 * 100, // UZS → tiyin
            price90: int.tryParse(_price90.text) != null
                ? int.parse(_price90.text) * 100
                : null,
            trialFreeEnabled: _trialFree,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _error = e.toString().contains('SUBJECT_LIMIT')
            ? l10n.teacherSubjectLimit
            : l10n.commonError;
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;

    if (_subjects == null) {
      ref.read(profileRepositoryProvider).fetchSubjects().then((rows) {
        if (mounted) setState(() => _subjects = rows);
      });
      return const Padding(
        padding: EdgeInsets.all(48),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.teacherAddSubject,
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _subjectId,
            isExpanded: true,
            decoration: InputDecoration(labelText: l10n.teacherSubject),
            items: [
              for (final s in _subjects!)
                DropdownMenuItem(
                  value: s['id'] as String,
                  child: Text(
                    locale == 'ru' ? s['name_ru'] as String : s['name_uz'] as String,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: (v) => setState(() => _subjectId = v),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _price30,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: '30 min, UZS'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _price60,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: '60 min, UZS *'),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _price90,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: '90 min, UZS'),
                ),
              ),
            ],
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.teacherTrialToggle),
            value: _trialFree,
            onChanged: (v) => setState(() => _trialFree = v),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          FilledButton(
            onPressed: _subjectId != null &&
                    int.tryParse(_price60.text) != null &&
                    !_saving
                ? _save
                : null,
            child: Text(l10n.commonSave),
          ),
        ],
      ),
    );
  }
}
