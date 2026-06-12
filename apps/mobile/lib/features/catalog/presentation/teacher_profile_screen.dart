import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../data/catalog_repository.dart';

String _fmtUzs(num tiyin) {
  final uzs = (tiyin / 100).round().toString();
  return uzs.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ');
}

class TeacherProfileScreen extends ConsumerWidget {
  const TeacherProfileScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;
    final teacher = ref.watch(teacherBySlugProvider(slug));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.teacherProfileTitle)),
      body: teacher.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.commonError)),
        data: (t) {
          if (t == null) return Center(child: Text(l10n.commonError));
          final profile = t['profiles'] as Map<String, dynamic>?;
          final name = profile?['full_name'] as String? ?? '';
          final avatarUrl = profile?['avatar_url'] as String?;
          final headline =
              (locale == 'ru' ? t['headline_ru'] : t['headline_uz']) as String? ?? '';
          final bio = (locale == 'ru' ? t['bio_ru'] : t['bio_uz']) as String? ?? '';
          final rating = (t['rating_avg'] as num?)?.toDouble() ?? 0;
          final subjects = (t['teacher_subjects'] as List? ?? [])
              .cast<Map<String, dynamic>>()
              .where((s) => s['is_active'] == true)
              .toList();
          final scheme = Theme.of(context).colorScheme;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundImage:
                        avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl == null
                        ? Text(
                            name.isEmpty
                                ? '?'
                                : name
                                    .trim()
                                    .split(RegExp(r'\s+'))
                                    .map((w) => w[0])
                                    .take(2)
                                    .join()
                                    .toUpperCase(),
                            style: const TextStyle(fontSize: 22),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(name,
                                  style: const TextStyle(
                                      fontSize: 20, fontWeight: FontWeight.w700)),
                            ),
                            if (t['tier'] == 'pro') ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('PRO',
                                    style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.amber.shade800)),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(headline,
                            style: TextStyle(color: scheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.star_rounded, color: Colors.amber.shade600, size: 20),
                  Text(' ${rating.toStringAsFixed(1)} (${t['rating_count']})'),
                  const SizedBox(width: 16),
                  Icon(Icons.school_outlined,
                      size: 18, color: scheme.onSurfaceVariant),
                  Text(' ${t['lessons_done']} ${l10n.minutesLessons}'),
                  const SizedBox(width: 16),
                  Icon(Icons.work_outline, size: 18, color: scheme.onSurfaceVariant),
                  Text(' ${t['experience_years']} ${l10n.years}'),
                ],
              ),
              const Divider(height: 32),
              Text(l10n.teacherAbout,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(bio, style: const TextStyle(height: 1.5)),
              const SizedBox(height: 24),
              Text(l10n.teacherTabSubjects,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              for (final s in subjects)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Builder(builder: (context) {
                          final subj =
                              (s['subjects'] as Map?)?.cast<String, dynamic>() ??
                                  const <String, dynamic>{};
                          final title = (locale == 'ru'
                                  ? subj['name_ru']
                                  : subj['name_uz']) as String? ??
                              '';
                          return Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          );
                        }),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 14,
                          children: [
                            if (s['price_30'] != null)
                              Text('30${l10n.minShort}: ${_fmtUzs(s['price_30'] as num)}'),
                            Text('60${l10n.minShort}: ${_fmtUzs(s['price_60'] as num)}',
                                style:
                                    const TextStyle(fontWeight: FontWeight.w600)),
                            if (s['price_90'] != null)
                              Text('90${l10n.minShort}: ${_fmtUzs(s['price_90'] as num)}'),
                            if (s['trial_free_enabled'] == true)
                              Text(l10n.catalogTrialBadge,
                                  style: TextStyle(color: scheme.primary)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: null,
                child: Text(l10n.bookComingSoon),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }
}
