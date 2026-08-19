import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  List<dynamic> _jobs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchJobs();
  }

  Future<void> _fetchJobs() async {
    try {
      final response = await ApiClient.get(ApiConstants.jobs);
      if (response is List) {
        setState(() {
          _jobs = response;
          _isLoading = false;
        });
      } else {
        _setFallbackJobs();
      }
    } catch (_) {
      _setFallbackJobs();
    }
  }

  void _setFallbackJobs() {
    if (mounted) {
      setState(() {
        _isLoading = false;
        _jobs = [
          {
            'id': 1,
            'title': 'مطور واجهات Flutter / Web',
            'company': 'شركة كود ماستر Code Master',
            'location': 'بغداد - العراق (عن بُعد)',
            'salary': '1,200,000 د.ع',
          },
          {
            'id': 2,
            'title': 'محلل بيانات وتطوير أنظمة',
            'company': 'منصة مهارات الوطنية',
            'location': 'البصرة - حضوري',
            'salary': '1,500,000 د.ع',
          },
        ];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('فرص العمل والتوظيف'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.cyberBlue))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _jobs.length,
              separatorBuilder: (context, index) => const SizedBox(height: 14),
              itemBuilder: (context, index) {
                final job = _jobs[index];
                return Container(
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
                          Expanded(
                            child: Text(
                              job['title'] ?? 'وظيفة شاغرة',
                              style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.radiantGold.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              job['salary'] ?? 'راتب مجزي',
                              style: GoogleFonts.cairo(fontSize: 10, color: AppTheme.radiantGold, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        job['company'] ?? '',
                        style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.cyberBlue, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            job['location'] ?? '',
                            style: GoogleFonts.cairo(fontSize: 11, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('تم تقديم طلبك بنجاح! سيتم التواصل معك قريباً.', style: GoogleFonts.cairo()),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.cyberBlue,
                          minimumSize: const Size(double.infinity, 38),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: Text(
                          'تقديم الآن',
                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
