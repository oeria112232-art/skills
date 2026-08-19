import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'workshop_detail_screen.dart';

class TracksCatalogScreen extends StatefulWidget {
  const TracksCatalogScreen({super.key});

  @override
  State<TracksCatalogScreen> createState() => _TracksCatalogScreenState();
}

class _TracksCatalogScreenState extends State<TracksCatalogScreen> {
  List<dynamic> _workshops = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchWorkshops();
  }

  Future<void> _fetchWorkshops() async {
    try {
      final response = await ApiClient.get(ApiConstants.workshops);
      if (response is List) {
        setState(() {
          _workshops = response;
          _isLoading = false;
        });
      } else {
        _setFallbackData();
      }
    } catch (_) {
      _setFallbackData();
    }
  }

  void _setFallbackData() {
    if (mounted) {
      setState(() {
        _isLoading = false;
        _workshops = [
          {
            'id': 1,
            'title': 'مهارات التوظيف وبناء المسار المهني',
            'description': 'تعلم كيفية إعداد السيرة الذاتية واجتياز مقابلات العمل وااختبارات القبول بكفاءة عالية.',
            'certLevel': 3,
          },
          {
            'id': 2,
            'title': 'التأهيل التقني والذكاء الاصطناعي',
            'description': 'استخدام أدوات الذكاء الاصطناعي لرفع الإنتاجية وبرمجة التطبيقات الحديثة.',
            'certLevel': 2,
          },
        ];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('المسارات والورش التعليمية'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.cyberBlue))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _workshops.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final item = _workshops[index];
                return InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => WorkshopDetailScreen(workshop: item),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.cardDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.cardBorderDark),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.cyberBlue.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'ورشة معتمدة',
                                style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.cyberBlue),
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.textMuted, size: 16),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          item['title'] ?? 'ورشة عمل',
                          style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          item['description'] ?? '',
                          style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.textMuted),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Icon(Icons.download_done_rounded, size: 16, color: Colors.greenAccent),
                            const SizedBox(width: 4),
                            Text(
                              'متاح ميزة التحميل بدون إنترنت',
                              style: GoogleFonts.cairo(fontSize: 11, color: Colors.greenAccent, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
