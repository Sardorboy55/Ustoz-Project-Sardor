import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Circular avatar with cached network image and initials fallback.
///
/// ```dart
/// AppAvatar(imageUrl: t['avatar_url'], name: t['full_name'], size: 56)
/// ```
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    this.imageUrl,
    this.name = '',
    this.size = 48,
  });

  final String? imageUrl;
  final String name;
  final double size;

  static String initialsOf(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.map((w) => w[0]).take(2).join().toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    final fallback = _Initials(text: initialsOf(name), size: size);

    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: (url == null || url.isEmpty)
            ? fallback
            : CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                width: size,
                height: size,
                fadeInDuration: const Duration(milliseconds: 200),
                placeholder: (_, _) => fallback,
                errorWidget: (_, _, _) => fallback,
              ),
      ),
    );
  }
}

class _Initials extends StatelessWidget {
  const _Initials({required this.text, required this.size});

  final String text;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return ColoredBox(
      color: isLight ? AppColors.primaryTint : scheme.primaryContainer,
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            color: isLight ? AppColors.primary : scheme.onPrimaryContainer,
            fontSize: size * 0.36,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
