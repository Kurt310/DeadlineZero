import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  // Color Tokens requested for DeadlineZero
  static const Color primary = Color(0x7F276A52); // Forest green
  static const Color primaryDark = Color(0xFF1E523F);
  static const Color primaryLight = Color(0xFF388B6E);

  static const Color mainBackground = Color(0xFFF5F6F2); // Warm off-white
  static const Color cardSurface = Color(0xFFFFFFFF); // White
  static const Color sidebarBackground = Color(0xFFEAEFE7); // Light sage
  static const Color softAccent = Color(0xFFDCE6D7); // Sage green

  static const Color mainText = Color(0xFF243B36); // Deep green-gray
  static const Color secondaryText = Color(0xFF687871); // Muted gray-green
  static const Color bordersAndDividers = Color(0xFFE0E6DE); // Pale gray-green

  static const Color warningBackground = Color(0xFFFFF6E7); // Soft cream
  static const Color warningText = Color(0xFF916323); // Amber brown

  static const Color errorBackground = Color(0xFFFFECEE);
  static const Color errorText = Color(0xFFBA1A1A);

  static const Color successBackground = Color(0xFFE6F4EA);
  static const Color successText = Color(0xFF137333);

  // Modern Theme Data
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: mainBackground,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: Color(0xFF276A52),
        onPrimary: Colors.white,
        secondary: softAccent,
        onSecondary: mainText,
        error: errorText,
        onError: Colors.white,
        surface: cardSurface,
        onSurface: mainText,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: mainBackground,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: mainText,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: mainText),
      ),
      cardTheme: CardThemeData(
        color: cardSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: bordersAndDividers, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF276A52),
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF276A52),
          side: const BorderSide(color: Color(0xFF276A52), width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: bordersAndDividers),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: bordersAndDividers),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF276A52), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorText),
        ),
        labelStyle: const TextStyle(color: secondaryText, fontSize: 14),
        hintStyle: const TextStyle(color: secondaryText, fontSize: 14),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: cardSurface,
        selectedItemColor: Color(0xFF276A52),
        unselectedItemColor: secondaryText,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: bordersAndDividers,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
