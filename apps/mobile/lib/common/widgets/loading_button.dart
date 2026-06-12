import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Primary button with a built-in loading spinner.
/// While [loading] is true the button keeps its brand color, ignores taps
/// and shows a spinner instead of the label.
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  });

  final VoidCallback? onPressed;
  final Widget child;
  final bool loading;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final content = loading
        ? SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              color: scheme.onPrimary,
            ),
          )
        : (icon == null
            ? child
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  icon!,
                  const SizedBox(width: AppTokens.s8),
                  child,
                ],
              ));

    return FilledButton(
      style: loading
          ? FilledButton.styleFrom(
              disabledBackgroundColor:
                  AppColors.primary.withValues(alpha: 0.8),
              disabledForegroundColor: scheme.onPrimary,
            )
          : null,
      onPressed: loading ? null : onPressed,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 150),
        child: content,
      ),
    );
  }
}
