import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/services/offline_download_service.dart';
import '../../core/theme/app_theme.dart';
import '../video/offline_video_player_screen.dart';

class WorkshopDetailScreen extends StatefulWidget {
  final Map<String, dynamic> workshop;
  const WorkshopDetailScreen({super.key, required this.workshop});

  @override
  State<WorkshopDetailScreen> createState() => _WorkshopDetailScreenState();
}

class _WorkshopDetailScreenState extends State<WorkshopDetailScreen> {
  final OfflineDownloadService _downloadService = OfflineDownloadService();
  final Map<String, bool> _downloadedLessons = {};
  final Map<String, double> _progressMap = {};

  @override
  void initState() {
    super.initState();
    _checkOfflineStatus();
  }

  Future<void> _checkOfflineStatus() async {
    final lessons = _getLessons();
    for (final lesson in lessons) {
      final id = lesson['id'].toString();
      final isDownloaded = await _downloadService.isLessonDownloaded(id);
      if (mounted) {
        setState(() {
          _downloadedLessons[id] = isDownloaded;
        });
      }
    }
  }

  List<Map<String, dynamic>> _getLessons() {
    final title = widget.workshop['title'] ?? 'ورشة العمل';
    return [
      {
        'id': '${widget.workshop['id']}_lesson_1',
        'title': 'المقدمة والمهارات الأساسية في $title',
        'duration': '15 دقيقة',
        'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
      {
        'id': '${widget.workshop['id']}_lesson_2',
        'title': 'التطبيق العملي والمشاريع الواقعية',
        'duration': '25 دقيقة',
        'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      },
      {
        'id': '${widget.workshop['id']}_lesson_3',
        'title': 'الاختبار النهائي وحصول الشهادة',
        'duration': '10 دقائق',
        'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
    ];
  }

  Future<void> _startDownload(String lessonId, String videoUrl) async {
    setState(() {
      _progressMap[lessonId] = 0.01;
    });

    final success = await _downloadService.downloadLessonVideo(
      lessonId: lessonId,
      videoUrl: videoUrl,
      onProgress: (progress) {
        if (mounted) {
          setState(() {
            _progressMap[lessonId] = progress;
          });
        }
      },
    );

    if (mounted) {
      setState(() {
        _downloadedLessons[lessonId] = success;
        _progressMap.remove(lessonId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'تم تحميل المقطع بنجاح! يمكنك مشاهدته الآن بدون إنترنت.' : 'فشل تحميل المقطع.',
            style: GoogleFonts.cairo(color: Colors.white),
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteOfflineVideo(String lessonId) async {
    await _downloadService.deleteOfflineVideo(lessonId);
    if (mounted) {
      setState(() {
        _downloadedLessons[lessonId] = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.workshop['title'] ?? 'ورشة عمل تعليمية';
    final description = widget.workshop['description'] ?? 'تعلم أفضل المهارات والتقنيات مع نخبة من الخبراء.';
    final lessons = _getLessons();

    return Scaffold(
      appBar: AppBar(
        title: Text(title, style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryNavy, AppTheme.cardDark],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cardBorderDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.radiantGold.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'مستوى محترف Professional',
                      style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.radiantGold),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: GoogleFonts.cairo(fontSize: 13, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Lessons Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'دروس الورشة والمقاطع التعليمية',
                  style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  '${lessons.length} دروس',
                  style: GoogleFonts.cairo(fontSize: 12, color: AppTheme.cyberBlue, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Lessons List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: lessons.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final lesson = lessons[index];
                final lessonId = lesson['id'].toString();
                final isDownloaded = _downloadedLessons[lessonId] ?? false;
                final isDownloading = _progressMap.containsKey(lessonId);
                final progress = _progressMap[lessonId] ?? 0.0;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDownloaded ? Colors.green.withValues(alpha: 0.4) : AppTheme.cardBorderDark),
                  ),
                  child: Row(
                    children: [
                      // Play Icon Button
                      InkWell(
                        onTap: () async {
                          final localPath = await _downloadService.getLocalFilePath(lessonId);
                          if (context.mounted) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => OfflineVideoPlayerScreen(
                                  title: lesson['title'],
                                  videoUrl: lesson['url'],
                                  localFilePath: localPath,
                                  isOfflineMode: isDownloaded,
                                ),
                              ),
                            );
                          }
                        },
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.cyberBlue.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.play_arrow_rounded, color: AppTheme.cyberBlue, size: 28),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Title & Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              lesson['title'],
                              style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Text(
                                  lesson['duration'],
                                  style: GoogleFonts.cairo(fontSize: 11, color: AppTheme.textMuted),
                                ),
                                if (isDownloaded) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'محفوظ بدون إنترنت',
                                      style: GoogleFonts.cairo(fontSize: 9, color: Colors.greenAccent, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (isDownloading) ...[
                              const SizedBox(height: 6),
                              LinearProgressIndicator(
                                value: progress,
                                backgroundColor: AppTheme.darkVoid,
                                color: AppTheme.radiantGold,
                                minHeight: 4,
                              ),
                            ],
                          ],
                        ),
                      ),

                      // Download / Delete Action
                      if (isDownloading)
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            '${(progress * 100).toInt()}%',
                            style: GoogleFonts.cairo(fontSize: 11, color: AppTheme.radiantGold, fontWeight: FontWeight.bold),
                          ),
                        )
                      else if (isDownloaded)
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 22),
                          onPressed: () => _deleteOfflineVideo(lessonId),
                          tooltip: 'حذف من الجهاز',
                        )
                      else
                        IconButton(
                          icon: const Icon(Icons.download_for_offline_rounded, color: AppTheme.cyberBlue, size: 26),
                          onPressed: () => _startDownload(lessonId, lesson['url']),
                          tooltip: 'تنزيل للمشاهدة بدون إنترنت',
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
