import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/data/auth_repository.dart';
import '../../notifications/data/notifications_repository.dart';
import '../data/profile_repository.dart';

const _appVersion = '0.1.0';

/// Profile tab: identity header, gamification, balance, menu, teacher entry.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _uploadingAvatar = false;
  bool _becomingTeacher = false;

  String _formatPhone(String? raw) {
    final p = (raw ?? '').replaceAll(RegExp(r'\D'), '');
    if (p.length == 12 && p.startsWith('998')) {
      return '+998 ${p.substring(3, 5)} ${p.substring(5, 8)} '
          '${p.substring(8, 10)} ${p.substring(10)}';
    }
    return p.isEmpty ? '' : '+$p';
  }

  Future<void> _changeAvatar() async {
    final l10n = AppLocalizations.of(context)!;
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;
    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await File(file.path).readAsBytes();
      final repo = ref.read(profileRepositoryProvider);
      final url = await repo.uploadToBucket(
        'avatars',
        'avatar.jpg',
        bytes,
        contentType: 'image/jpeg',
      );
      await repo.updateProfile(avatarUrl: url);
      ref.invalidate(ownProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonSaved)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _becomeTeacher() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.becomeTeacherConfirmTitle),
        content: Text(l10n.becomeTeacherConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.becomeTeacherCta),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _becomingTeacher = true);
    try {
      await ref.read(profileRepositoryProvider).becomeTeacher();
      ref.invalidate(ownProfileProvider);
      if (mounted) context.push('/teacher');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    } finally {
      if (mounted) setState(() => _becomingTeacher = false);
    }
  }

  Future<void> _signOut() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.signOutConfirmTitle),
        content: Text(l10n.signOutConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
              backgroundColor: AppTokens.of(context).danger,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.signOut),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await ref.read(authRepositoryProvider).signOut();
    ref.invalidate(ownProfileProvider);
    if (mounted) context.go('/auth/phone');
  }

  void _showAbout() {
    final l10n = AppLocalizations.of(context)!;
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          l10n.appTitle,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            letterSpacing: 3,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.splashTagline, textAlign: TextAlign.center),
            const SizedBox(height: AppTokens.s12),
            Text(
              l10n.aboutVersion(_appVersion),
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppTokens.s4),
            Text(
              l10n.aboutMadeIn,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.commonClose),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(ownProfileProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profileTitle)),
      body: profile.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(AppTokens.s16),
          children: const [
            SkeletonListTile(padding: EdgeInsets.zero),
            SizedBox(height: AppTokens.s16),
            SkeletonCard(height: 110),
            SizedBox(height: AppTokens.s12),
            SkeletonCard(height: 90),
            SizedBox(height: AppTokens.s12),
            SkeletonCard(height: 220),
          ],
        ),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(ownProfileProvider)),
        data: (p) {
          if (p == null) {
            return ErrorState(onRetry: () => ref.invalidate(ownProfileProvider));
          }
          final isTeacher = p['is_teacher'] == true;
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(ownProfileProvider);
              ref.invalidate(gamificationInfoProvider);
              ref.invalidate(unreadNotificationsCountProvider);
              await ref.read(ownProfileProvider.future).catchError((_) => null);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppTokens.s16),
              children: [
                _header(p),
                const SizedBox(height: AppTokens.s16),
                const _GamificationCard(),
                const SizedBox(height: AppTokens.s12),
                _balanceCard(p),
                const SizedBox(height: AppTokens.s12),
                _menuCard(isTeacher: isTeacher),
                const SizedBox(height: AppTokens.s16),
                if (!isTeacher) ...[
                  _becomeTeacherCard(),
                  const SizedBox(height: AppTokens.s16),
                ],
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTokens.of(context).danger,
                  ),
                  icon: const Icon(Icons.logout_rounded, size: 20),
                  label: Text(l10n.signOut),
                  onPressed: _signOut,
                ),
                const SizedBox(height: AppTokens.s24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _header(Map<String, dynamic> p) {
    final scheme = Theme.of(context).colorScheme;
    final name = p['full_name'] as String? ?? '';
    return Row(
      children: [
        GestureDetector(
          onTap: _uploadingAvatar ? null : _changeAvatar,
          child: Stack(
            children: [
              AppAvatar(
                imageUrl: p['avatar_url'] as String?,
                name: name,
                size: 72,
              ),
              if (_uploadingAvatar)
                const Positioned.fill(
                  child: ColoredBox(
                    color: Colors.black38,
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: scheme.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.surface, width: 2),
                  ),
                  child: const Icon(
                    Icons.photo_camera_rounded,
                    size: 12,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: AppTokens.s16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 2),
              Text(
                _formatPhone(p['phone'] as String?),
                style: TextStyle(
                  fontSize: 14,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _balanceCard(Map<String, dynamic> p) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final balance = p['student_balance'] as num? ?? 0;
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.account_balance_wallet_outlined,
              size: 22,
              color: scheme.primary,
            ),
          ),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.profileBalanceTitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  formatTiyin(balance, locale),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppTokens.s4),
                Text(
                  l10n.profileBalanceNote,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.3,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _menuCard({required bool isTeacher}) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider);
    final unread = ref.watch(unreadNotificationsCountProvider).value ?? 0;

    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: AppTokens.s4),
      child: Column(
        children: [
          if (isTeacher) ...[
            _MenuTile(
              icon: Icons.school_outlined,
              title: l10n.teacherCabinet,
              onTap: () => context.push('/teacher'),
            ),
            const _MenuDivider(),
          ],
          _MenuTile(
            icon: Icons.favorite_border_rounded,
            title: l10n.menuFavorites,
            onTap: () => context.push('/favorites'),
          ),
          const _MenuDivider(),
          _MenuTile(
            icon: Icons.notifications_none_rounded,
            title: l10n.notificationsTitle,
            badgeCount: unread,
            onTap: () => context.push('/notifications'),
          ),
          const _MenuDivider(),
          _MenuTile(
            icon: Icons.support_agent_rounded,
            title: l10n.menuSupport,
            onTap: () => context.push('/support'),
          ),
          const _MenuDivider(),
          ListTile(
            leading: const Icon(Icons.language_rounded),
            title: Text(
              l10n.settingsLanguage,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
            ),
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
          const _MenuDivider(),
          _MenuTile(
            icon: Icons.info_outline_rounded,
            title: l10n.menuAbout,
            onTap: _showAbout,
          ),
        ],
      ),
    );
  }

  Widget _becomeTeacherCard() {
    final l10n = AppLocalizations.of(context)!;
    return Material(
      borderRadius: BorderRadius.circular(AppTokens.radiusCard),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _becomingTeacher ? null : _becomeTeacher,
        child: Ink(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          padding: const EdgeInsets.all(AppTokens.s16),
          child: Row(
            children: [
              if (_becomingTeacher)
                const SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.6,
                    color: Colors.white,
                  ),
                )
              else
                const Icon(Icons.school_rounded, color: Colors.white, size: 36),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.becomeTeacherTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: AppTokens.s4),
                    Text(
                      l10n.becomeTeacherBody,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// gamification card: level name, XP progress, streak
// ---------------------------------------------------------------------------

class _GamificationCard extends ConsumerWidget {
  const _GamificationCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final scheme = Theme.of(context).colorScheme;
    final info = ref.watch(gamificationInfoProvider);

    return info.when(
      loading: () => const SkeletonCard(height: 110),
      error: (e, _) => const SizedBox.shrink(),
      data: (g) {
        if (g == null) return const SizedBox.shrink();
        final xp = (g['xp'] as num?)?.toInt() ?? 0;
        final level = (g['level'] as num?)?.toInt() ?? 1;
        final streak = (g['streak_days'] as num?)?.toInt() ?? 0;
        final settings =
            (g['settings'] as Map?)?.cast<String, dynamic>() ?? const {};
        final namesByLocale =
            (settings['level_names'] as Map?)?.cast<String, dynamic>();
        final names = ((namesByLocale?[locale] ??
                    namesByLocale?['uz']) as List? ??
                const [])
            .cast<String>();
        final thresholds = ((settings['level_thresholds'] as List?) ?? const [])
            .map((e) => (e as num).toInt())
            .toList();

        final levelName = names.isEmpty
            ? null
            : names[(level - 1).clamp(0, names.length - 1)];
        final hasNext = level < thresholds.length;
        final prev = thresholds.isEmpty
            ? 0
            : thresholds[(level - 1).clamp(0, thresholds.length - 1)];
        final next = hasNext ? thresholds[level] : null;
        final progress = next == null || next <= prev
            ? 1.0
            : ((xp - prev) / (next - prev)).clamp(0.0, 1.0);

        return AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.14),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.emoji_events_outlined,
                      size: 22,
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(width: AppTokens.s12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          levelName ?? l10n.gamificationLevel(level),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${l10n.gamificationLevel(level)} · ${l10n.gamificationXp(xp)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (streak > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTokens.s12,
                        vertical: AppTokens.s4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.12),
                        borderRadius:
                            BorderRadius.circular(AppTokens.radiusChip),
                      ),
                      child: Text(
                        '🔥 $streak',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppTokens.s12),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppTokens.radiusChip),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: scheme.surfaceContainerHighest,
                ),
              ),
              const SizedBox(height: AppTokens.s8),
              Text(
                next != null
                    ? l10n.gamificationToNext(next - xp)
                    : l10n.gamificationMaxLevel,
                style: TextStyle(
                  fontSize: 12,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// menu helpers
// ---------------------------------------------------------------------------

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(
        title,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badgeCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(AppTokens.radiusChip),
              ),
              child: Text(
                '$badgeCount',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
      onTap: onTap,
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: AppTokens.s16 + 40,
      color: Theme.of(context).colorScheme.outlineVariant,
    );
  }
}
