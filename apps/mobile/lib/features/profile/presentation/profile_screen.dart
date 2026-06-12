import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/data/auth_repository.dart';
import '../data/profile_repository.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(ownProfileProvider);
    final locale = ref.watch(localeControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profileTitle)),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(l10n.commonError)),
        data: (p) {
          if (p == null) return Center(child: Text(l10n.commonError));
          final isTeacher = p['is_teacher'] == true;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ListTile(
                leading: CircleAvatar(
                  radius: 28,
                  child: Text(
                    (p['full_name'] as String? ?? '?')
                        .trim()
                        .split(' ')
                        .map((w) => w.isEmpty ? '' : w[0])
                        .take(2)
                        .join()
                        .toUpperCase(),
                  ),
                ),
                title: Text(
                  p['full_name'] as String? ?? '',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                subtitle: Text('+${p['phone']}'),
              ),
              const Divider(height: 32),
              // language
              ListTile(
                leading: const Icon(Icons.language),
                title: Text(l10n.settingsLanguage),
                trailing: SegmentedButton<String>(
                  showSelectedIcon: false,
                  style: const ButtonStyle(visualDensity: VisualDensity.compact),
                  segments: const [
                    ButtonSegment(value: 'uz', label: Text('UZ')),
                    ButtonSegment(value: 'ru', label: Text('RU')),
                  ],
                  selected: {locale.languageCode},
                  onSelectionChanged: (s) => ref
                      .read(localeControllerProvider.notifier)
                      .setLocale(Locale(s.first)),
                ),
              ),
              const SizedBox(height: 8),
              if (isTeacher)
                ListTile(
                  leading: const Icon(Icons.school),
                  title: Text(l10n.teacherCabinet),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/teacher'),
                )
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.becomeTeacherTitle,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.becomeTeacherBody,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed: () async {
                            try {
                              await ref
                                  .read(profileRepositoryProvider)
                                  .becomeTeacher();
                              ref.invalidate(ownProfileProvider);
                              if (context.mounted) context.push('/teacher');
                            } catch (_) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(l10n.commonError)),
                                );
                              }
                            }
                          },
                          child: Text(l10n.becomeTeacherCta),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                icon: const Icon(Icons.logout),
                label: Text(l10n.signOut),
                onPressed: () async {
                  await ref.read(authRepositoryProvider).signOut();
                  ref.invalidate(ownProfileProvider);
                  if (context.mounted) context.go('/auth/phone');
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
