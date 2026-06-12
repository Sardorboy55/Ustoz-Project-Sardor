import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Pulsing opacity wrapper for skeleton placeholders.
/// `SkeletonListTile` / `SkeletonCard` already pulse — wrap raw [SkeletonBox]es
/// in a single [SkeletonPulse] to keep them in sync.
class SkeletonPulse extends StatefulWidget {
  const SkeletonPulse({super.key, required this.child});

  final Widget child;

  @override
  State<SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<SkeletonPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
    lowerBound: 0.45,
    upperBound: 1,
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      FadeTransition(opacity: _controller, child: widget.child);
}

/// Plain rounded placeholder block (no animation by itself).
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 8,
    this.shape = BoxShape.rectangle,
  });

  const SkeletonBox.circle({super.key, required double size})
      : width = size,
        height = size,
        radius = 0,
        shape = BoxShape.circle;

  final double? width;
  final double height;
  final double radius;
  final BoxShape shape;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppTokens.of(context).skeletonBase,
        shape: shape,
        borderRadius:
            shape == BoxShape.circle ? null : BorderRadius.circular(radius),
      ),
    );
  }
}

/// Avatar + two text lines — list loading placeholder.
class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({super.key, this.padding});

  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return SkeletonPulse(
      child: Padding(
        padding: padding ??
            const EdgeInsets.symmetric(
              horizontal: AppTokens.s16,
              vertical: AppTokens.s12,
            ),
        child: const Row(
          children: [
            SkeletonBox.circle(size: 48),
            SizedBox(width: AppTokens.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 160, height: 14),
                  SizedBox(height: AppTokens.s8),
                  SkeletonBox(width: 100, height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Card-shaped loading placeholder (avatar, lines, chip row).
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key, this.height});

  final double? height;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SkeletonPulse(
      child: Container(
        height: height,
        padding: const EdgeInsets.all(AppTokens.s16),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(AppTokens.radiusCard),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SkeletonBox.circle(size: 56),
                SizedBox(width: AppTokens.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 140, height: 14),
                      SizedBox(height: AppTokens.s8),
                      SkeletonBox(width: 200, height: 12),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: AppTokens.s16),
            Row(
              children: [
                SkeletonBox(width: 90, height: 12),
                SizedBox(width: AppTokens.s12),
                SkeletonBox(width: 60, height: 12),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
