import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Colors
  static const Color primaryNavy = Color(0xFF0B1E3D);
  static const Color cyberBlue = Color(0xFF3B82F6);
  static const Color radiantGold = Color(0xFFEAB308);
  static const Color darkVoid = Color(0xFF0B0F19);
  static const Color cardDark = Color(0xFF111827);
  static const Color cardBorderDark = Color(0xFF1F2937);
  static const Color textMuted = Color(0xFF9CA3AF);

  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: darkVoid,
      primaryColor: cyberBlue,
      colorScheme: const ColorScheme.dark(
        primary: cyberBlue,
        secondary: radiantGold,
        surface: cardDark,
      ),
      cardTheme: CardThemeData(
        color: cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: cardBorderDark, width: 1),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: darkVoid,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.cairo(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      textTheme: GoogleFonts.cairoTextTheme(ThemeData.dark().textTheme),
    );
  }
}
