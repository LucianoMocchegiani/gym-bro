import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tokens visuales alineados al Admin web (acid lima / charcoal).
abstract final class GymBroColors {
  static const Color lime = Color(0xFFA3E635);
  static const Color orange = Color(0xFFFC4C02);
  static const Color darkBg = Color(0xFF0A0A0A);
  static const Color darkSurface = Color(0xFF161616);
  static const Color darkLine = Color(0xFF2A2A2A);
  static const Color darkMuted = Color(0xFFA3A3A3);
  static const Color lightBg = Color(0xFFF4F6F2);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightLine = Color(0xFFD5DDD0);
  static const Color lightMuted = Color(0xFF5C665E);
  static const Color lightInk = Color(0xFF121412);
}

/// Temas Material 3 claro/oscuro GymBro.
abstract final class GymBroTheme {
  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: GymBroColors.darkBg,
      colorScheme: const ColorScheme.dark(
        primary: GymBroColors.lime,
        onPrimary: GymBroColors.darkBg,
        secondary: GymBroColors.orange,
        surface: GymBroColors.darkSurface,
        onSurface: Colors.white,
        error: Color(0xFFF87171),
        outline: GymBroColors.darkLine,
      ),
    );
    return _withTypography(base, Brightness.dark);
  }

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: GymBroColors.lightBg,
      colorScheme: const ColorScheme.light(
        primary: GymBroColors.lime,
        onPrimary: GymBroColors.darkBg,
        secondary: GymBroColors.orange,
        surface: GymBroColors.lightSurface,
        onSurface: GymBroColors.lightInk,
        error: Color(0xFFB91C1C),
        outline: GymBroColors.lightLine,
      ),
    );
    return _withTypography(base, Brightness.light);
  }

  static ThemeData _withTypography(ThemeData base, Brightness brightness) {
    final muted = brightness == Brightness.dark
        ? GymBroColors.darkMuted
        : GymBroColors.lightMuted;
    final display = GoogleFonts.barlowCondensedTextTheme(base.textTheme);
    final body = GoogleFonts.ibmPlexSansTextTheme(base.textTheme);
    return base.copyWith(
      textTheme: body.copyWith(
        displayLarge: display.displayLarge?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        displayMedium: display.displayMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        headlineLarge: display.headlineLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
        headlineMedium: display.headlineMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        headlineSmall: display.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        titleLarge: display.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        bodyMedium: body.bodyMedium?.copyWith(
          color: base.colorScheme.onSurface,
        ),
        bodySmall: body.bodySmall?.copyWith(color: muted),
        labelLarge: body.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: base.scaffoldBackgroundColor,
        foregroundColor: base.colorScheme.onSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: display.titleLarge?.copyWith(
          color: GymBroColors.lime,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          fontSize: 22,
        ),
      ),
      cardTheme: CardThemeData(
        color: base.colorScheme.surface,
        elevation: brightness == Brightness.dark ? 4 : 1,
        shadowColor: brightness == Brightness.dark
            ? Colors.black.withValues(alpha: 0.45)
            : Colors.black.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: base.colorScheme.outline),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: base.colorScheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: base.colorScheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: base.colorScheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: GymBroColors.lime, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: GymBroColors.lime,
          foregroundColor: GymBroColors.darkBg,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: base.colorScheme.surface,
        indicatorColor: GymBroColors.lime.withValues(alpha: 0.22),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? GymBroColors.lime : muted,
          );
        }),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: base.colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: base.colorScheme.outline),
        ),
        titleTextStyle: display.titleLarge?.copyWith(
          color: base.colorScheme.onSurface,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
