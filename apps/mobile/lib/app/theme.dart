import 'package:flutter/material.dart';

// ============================================================================
// IBILIM design tokens — single source of truth for colors, radii and spacing.
// Design system: blue brand (#2563EB), amber accent, zinc neutrals.
// ============================================================================

/// Brand & neutral palette (raw values from the design system).
abstract final class AppColors {
  // brand (IBILIM blue — matches web brand-600/700/50)
  static const primary = Color(0xFF2563EB); // blue-600
  static const primaryDark = Color(0xFF1D4ED8); // blue-700 — hover / pressed
  static const primaryTint = Color(0xFFEFF6FF); // blue-50 surface
  static const accent = Color(0xFFF59E0B); // amber — rating, PRO

  // semantic
  static const success = Color(0xFF10B981); // emerald
  static const warning = Color(0xFFF59E0B); // amber
  static const danger = Color(0xFFEF4444); // red-500

  // zinc neutrals
  static const pageBackground = Color(0xFFFAFAFA); // zinc-50
  static const zinc100 = Color(0xFFF4F4F5);
  static const zinc200 = Color(0xFFE4E4E7); // borders
  static const zinc300 = Color(0xFFD4D4D8);
  static const zinc400 = Color(0xFFA1A1AA);
  static const zinc500 = Color(0xFF71717A); // secondary text
  static const zinc700 = Color(0xFF3F3F46);
  static const zinc900 = Color(0xFF18181B); // primary text

  // booking status colors (docs: pending=amber, paid=emerald, in_progress=sky,
  // completed=teal-700, cancelled=red-500, expired=zinc-400, no_show=orange-600)
  static const statusPendingPayment = Color(0xFFF59E0B);
  static const statusPaid = Color(0xFF10B981);
  static const statusInProgress = Color(0xFF0EA5E9);
  static const statusCompleted = Color(0xFF0F766E);
  static const statusCancelled = Color(0xFFEF4444);
  static const statusExpired = Color(0xFFA1A1AA);
  static const statusNoShow = Color(0xFFEA580C);
}

/// Theme-aware tokens. Read via `AppTokens.of(context)`.
@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.statusPendingPayment,
    required this.statusPaid,
    required this.statusInProgress,
    required this.statusCompleted,
    required this.statusCancelled,
    required this.statusExpired,
    required this.statusNoShow,
    required this.success,
    required this.warning,
    required this.danger,
    required this.skeletonBase,
  });

  // ---- spacing scale (4 / 8 / 12 / 16 / 24 / 32) ----
  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s24 = 24;
  static const double s32 = 32;

  // ---- radii ----
  static const double radiusCard = 16;
  static const double radiusButton = 12;
  static const double radiusChip = 999; // full / stadium

  final Color statusPendingPayment;
  final Color statusPaid;
  final Color statusInProgress;
  final Color statusCompleted;
  final Color statusCancelled;
  final Color statusExpired;
  final Color statusNoShow;
  final Color success;
  final Color warning;
  final Color danger;
  final Color skeletonBase;

  static const light = AppTokens(
    statusPendingPayment: AppColors.statusPendingPayment,
    statusPaid: AppColors.statusPaid,
    statusInProgress: AppColors.statusInProgress,
    statusCompleted: AppColors.statusCompleted,
    statusCancelled: AppColors.statusCancelled,
    statusExpired: AppColors.statusExpired,
    statusNoShow: AppColors.statusNoShow,
    success: AppColors.success,
    warning: AppColors.warning,
    danger: AppColors.danger,
    skeletonBase: AppColors.zinc200,
  );

  static const dark = AppTokens(
    statusPendingPayment: AppColors.statusPendingPayment,
    statusPaid: AppColors.statusPaid,
    statusInProgress: AppColors.statusInProgress,
    statusCompleted: Color(0xFF14B8A6), // teal-500 reads better on dark
    statusCancelled: AppColors.statusCancelled,
    statusExpired: AppColors.zinc400,
    statusNoShow: Color(0xFFFB923C), // orange-400 on dark
    success: AppColors.success,
    warning: AppColors.warning,
    danger: AppColors.danger,
    skeletonBase: AppColors.zinc700,
  );

  static AppTokens of(BuildContext context) =>
      Theme.of(context).extension<AppTokens>() ?? light;

  @override
  AppTokens copyWith({
    Color? statusPendingPayment,
    Color? statusPaid,
    Color? statusInProgress,
    Color? statusCompleted,
    Color? statusCancelled,
    Color? statusExpired,
    Color? statusNoShow,
    Color? success,
    Color? warning,
    Color? danger,
    Color? skeletonBase,
  }) {
    return AppTokens(
      statusPendingPayment: statusPendingPayment ?? this.statusPendingPayment,
      statusPaid: statusPaid ?? this.statusPaid,
      statusInProgress: statusInProgress ?? this.statusInProgress,
      statusCompleted: statusCompleted ?? this.statusCompleted,
      statusCancelled: statusCancelled ?? this.statusCancelled,
      statusExpired: statusExpired ?? this.statusExpired,
      statusNoShow: statusNoShow ?? this.statusNoShow,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      skeletonBase: skeletonBase ?? this.skeletonBase,
    );
  }

  @override
  AppTokens lerp(AppTokens? other, double t) {
    if (other == null) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppTokens(
      statusPendingPayment: l(statusPendingPayment, other.statusPendingPayment),
      statusPaid: l(statusPaid, other.statusPaid),
      statusInProgress: l(statusInProgress, other.statusInProgress),
      statusCompleted: l(statusCompleted, other.statusCompleted),
      statusCancelled: l(statusCancelled, other.statusCancelled),
      statusExpired: l(statusExpired, other.statusExpired),
      statusNoShow: l(statusNoShow, other.statusNoShow),
      success: l(success, other.success),
      warning: l(warning, other.warning),
      danger: l(danger, other.danger),
      skeletonBase: l(skeletonBase, other.skeletonBase),
    );
  }
}

// ============================================================================
// Theme builders
// ============================================================================

ThemeData buildLightTheme() => _base(Brightness.light);
ThemeData buildDarkTheme() => _base(Brightness.dark);

ThemeData _base(Brightness brightness) {
  final isLight = brightness == Brightness.light;
  var scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: brightness,
  );
  if (isLight) {
    scheme = scheme.copyWith(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primaryTint,
      onPrimaryContainer: AppColors.primaryDark,
      surface: Colors.white,
      onSurface: AppColors.zinc900,
      onSurfaceVariant: AppColors.zinc500,
      outline: AppColors.zinc300,
      outlineVariant: AppColors.zinc200,
      error: AppColors.danger,
    );
  }

  final base = ThemeData(useMaterial3: true, colorScheme: scheme);
  final textTheme = _textTheme(base.textTheme, scheme);
  final tokens = isLight ? AppTokens.light : AppTokens.dark;

  final buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(AppTokens.radiusButton),
  );
  const buttonText = TextStyle(fontSize: 16, fontWeight: FontWeight.w600);

  return base.copyWith(
    extensions: [tokens],
    textTheme: textTheme,
    scaffoldBackgroundColor:
        isLight ? AppColors.pageBackground : scheme.surface,
    appBarTheme: AppBarTheme(
      centerTitle: true,
      backgroundColor: scheme.surface,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      shadowColor: Colors.black26,
      titleTextStyle: textTheme.titleLarge?.copyWith(fontSize: 18),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1),
    // ---- buttons: height 52, radius 12, teal focus ring ----
    filledButtonTheme: FilledButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size.fromHeight(52)),
        shape: WidgetStatePropertyAll(buttonShape),
        textStyle: const WidgetStatePropertyAll(buttonText),
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) {
            return isLight ? AppColors.zinc200 : AppColors.zinc700;
          }
          if (states.contains(WidgetState.pressed)) {
            return AppColors.primaryDark;
          }
          return scheme.primary;
        }),
        foregroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) {
            return isLight ? AppColors.zinc400 : AppColors.zinc500;
          }
          return scheme.onPrimary;
        }),
        overlayColor: WidgetStatePropertyAll(
          Colors.white.withValues(alpha: 0.06),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: buttonShape,
        textStyle: buttonText,
        foregroundColor: scheme.primary,
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: buttonShape,
        foregroundColor: scheme.primary,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isLight ? Colors.white : scheme.surfaceContainerHighest,
      hintStyle: TextStyle(
        color: isLight ? AppColors.zinc400 : scheme.onSurfaceVariant,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        borderSide: BorderSide(color: scheme.primary, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        borderSide: BorderSide(color: scheme.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
        borderSide: BorderSide(color: scheme.error, width: 1.6),
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: scheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusCard),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: StadiumBorder(side: BorderSide(color: scheme.outlineVariant)),
      backgroundColor: scheme.surface,
      selectedColor: isLight ? AppColors.primaryTint : scheme.primaryContainer,
      checkmarkColor: scheme.primary,
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: scheme.onSurface,
      ),
      side: BorderSide(color: scheme.outlineVariant),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 64,
      indicatorColor:
          isLight ? AppColors.primaryTint : scheme.primaryContainer,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 24,
          color: selected ? scheme.primary : scheme.onSurfaceVariant,
        );
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 12,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? scheme.primary : scheme.onSurfaceVariant,
        );
      }),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: isLight ? AppColors.zinc900 : AppColors.zinc100,
      contentTextStyle: TextStyle(
        fontSize: 14,
        color: isLight ? Colors.white : AppColors.zinc900,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    dialogTheme: DialogThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusCard + 4),
      ),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: scheme.onSurfaceVariant,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusButton),
      ),
    ),
  );
}

/// Typography: confident weights for display/headline/title, calm body text.
TextTheme _textTheme(TextTheme base, ColorScheme scheme) {
  return base
      .copyWith(
        displayLarge: base.displayLarge?.copyWith(fontWeight: FontWeight.w800),
        displayMedium:
            base.displayMedium?.copyWith(fontWeight: FontWeight.w800),
        displaySmall: base.displaySmall?.copyWith(fontWeight: FontWeight.w800),
        headlineLarge:
            base.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
        headlineMedium:
            base.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        headlineSmall:
            base.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        titleSmall: base.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        bodyLarge: base.bodyLarge?.copyWith(height: 1.45),
        bodyMedium: base.bodyMedium?.copyWith(height: 1.4),
        labelLarge: base.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      )
      .apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);
}
