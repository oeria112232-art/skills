import 'dart:io';
import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme/app_theme.dart';

class OfflineVideoPlayerScreen extends StatefulWidget {
  final String title;
  final String videoUrl;
  final String? localFilePath;
  final bool isOfflineMode;

  const OfflineVideoPlayerScreen({
    super.key,
    required this.title,
    required this.videoUrl,
    this.localFilePath,
    this.isOfflineMode = false,
  });

  @override
  State<OfflineVideoPlayerScreen> createState() => _OfflineVideoPlayerScreenState();
}

class _OfflineVideoPlayerScreenState extends State<OfflineVideoPlayerScreen> {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isInitializing = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    try {
      if (widget.localFilePath != null && File(widget.localFilePath!).existsSync()) {
        // Load offline video file from app-private sandbox storage
        _videoPlayerController = VideoPlayerController.file(File(widget.localFilePath!));
      } else {
        // Load online video stream
        _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      }

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        aspectRatio: 16 / 9,
        autoPlay: true,
        looping: false,
        allowFullScreen: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: AppTheme.cyberBlue,
          handleColor: AppTheme.radiantGold,
          backgroundColor: Colors.white24,
          bufferedColor: Colors.white38,
        ),
      );

      setState(() {
        _isInitializing = false;
      });
    } catch (e) {
      setState(() {
        _isInitializing = false;
        _errorMessage = 'فشل تحميل مقطع الفيديو: ${e.toString()}';
      });
    }
  }

  @override
  void dispose() {
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isOffline = widget.localFilePath != null && File(widget.localFilePath!).existsSync();

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(
          widget.title,
          style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isOffline ? Colors.green.withValues(alpha: 0.2) : AppTheme.cyberBlue.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isOffline ? Colors.green : AppTheme.cyberBlue,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isOffline ? Icons.offline_pin_rounded : Icons.wifi_rounded,
                  size: 14,
                  color: isOffline ? Colors.greenAccent : AppTheme.cyberBlue,
                ),
                const SizedBox(width: 4),
                Text(
                  isOffline ? 'بدون إنترنت (Offline)' : 'بث مباشر (Online)',
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isOffline ? Colors.greenAccent : AppTheme.cyberBlue,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: _isInitializing
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(color: AppTheme.cyberBlue),
                          const SizedBox(height: 16),
                          Text(
                            isOffline ? 'جاري فتح الفيديو المحفوظ محلياً...' : 'جاري تجميع البث Direct Stream...',
                            style: GoogleFonts.cairo(color: AppTheme.textMuted, fontSize: 13),
                          ),
                        ],
                      )
                    : _errorMessage != null
                        ? Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.cairo(color: Colors.redAccent, fontSize: 14),
                              textAlign: TextAlign.center,
                            ),
                          )
                        : Chewie(controller: _chewieController!),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              color: AppTheme.cardDark,
              child: Row(
                children: [
                  Icon(
                    isOffline ? Icons.download_done_rounded : Icons.cloud_done_rounded,
                    color: AppTheme.radiantGold,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.title,
                          style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          isOffline
                              ? 'تم حفظ المقطع في المساحة الآمنة للهاتف ويمكنك مشاهدته دائماً بدون إنترنت.'
                              : 'يتم الآن عرض البث عبر الإنترنت.',
                          style: GoogleFonts.cairo(fontSize: 11, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
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
