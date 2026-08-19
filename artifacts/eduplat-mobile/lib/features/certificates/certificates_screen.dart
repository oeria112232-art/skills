import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';

class CertificatesScreen extends StatelessWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('شهاداتي المعتمدة'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryNavy, AppTheme.cardDark],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cardBorderDark),
              ),
              child: Column(
                children: [
                  const Icon(Icons.workspace_premium_rounded, size: 50, color: AppTheme.radiantGold),
                  const SizedBox(height: 12),
                  Text(
                    'السجل المعتمد للشهادات',
                    style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(
                    'جميع الشهادات الممنوحة موثقة إلكترونياً وتوفر رمز التحقق QR الفوري.',
                    style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.textMuted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Certificate Item Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.radiantGold.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'شهادة مشاركة واستكمال',
                        style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.radiantGold, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '25 يوليو 2026',
                        style: GoogleFonts.cairo(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'مهارات التوظيف وبناء المسار المهني',
                    style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'المستفيد: مقتدى علي منصور',
                    style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.textMuted),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.verified_user_rounded, color: Colors.greenAccent, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'بصمة التحقق: MHARAT-SECURE-ESIGN-88192-VERIFIED',
                        style: GoogleFonts.firaCode(fontSize: 9, color: Colors.white70),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
