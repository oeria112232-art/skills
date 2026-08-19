import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineDownloadService {
  static final OfflineDownloadService _instance = OfflineDownloadService._internal();
  factory OfflineDownloadService() => _instance;
  OfflineDownloadService._internal();

  final Dio _dio = Dio();
  final Map<String, double> _downloadProgress = {};
  final ValueNotifier<int> _activeDownloadsNotifier = ValueNotifier(0);

  Map<String, double> get downloadProgress => _downloadProgress;
  ValueNotifier<int> get activeDownloadsNotifier => _activeDownloadsNotifier;

  static const String _prefKeyOfflineIndex = 'mharat_offline_videos_index';

  Future<String> _getOfflineDirectoryPath() async {
    final docsDir = await getApplicationDocumentsDirectory();
    final offlineDir = Directory('${docsDir.path}/offline_videos');
    if (!await offlineDir.exists()) {
      await offlineDir.create(recursive: true);
    }
    return offlineDir.path;
  }

  Future<Map<String, String>> _getOfflineIndex() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefKeyOfflineIndex);
    if (raw == null) return {};
    try {
      final Map<String, dynamic> decoded = jsonDecode(raw);
      return decoded.map((key, value) => MapEntry(key, value.toString()));
    } catch (_) {
      return {};
    }
  }

  Future<void> _saveOfflineIndex(Map<String, String> index) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyOfflineIndex, jsonEncode(index));
  }

  Future<bool> isLessonDownloaded(String lessonId) async {
    final index = await _getOfflineIndex();
    final path = index[lessonId];
    if (path == null) return false;
    final file = File(path);
    return await file.exists();
  }

  Future<String?> getLocalFilePath(String lessonId) async {
    final index = await _getOfflineIndex();
    final path = index[lessonId];
    if (path != null && await File(path).exists()) {
      return path;
    }
    return null;
  }

  Future<bool> downloadLessonVideo({
    required String lessonId,
    required String videoUrl,
    required Function(double progress) onProgress,
  }) async {
    try {
      final dirPath = await _getOfflineDirectoryPath();
      final sanitizedId = lessonId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final savePath = '$dirPath/$sanitizedId.mp4';

      _downloadProgress[lessonId] = 0.0;
      _activeDownloadsNotifier.value++;

      await _dio.download(
        videoUrl,
        savePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = received / total;
            _downloadProgress[lessonId] = progress;
            onProgress(progress);
          }
        },
      );

      _downloadProgress[lessonId] = 1.0;
      _activeDownloadsNotifier.value--;

      // Update offline registry index
      final index = await _getOfflineIndex();
      index[lessonId] = savePath;
      await _saveOfflineIndex(index);

      return true;
    } catch (e) {
      _downloadProgress.remove(lessonId);
      _activeDownloadsNotifier.value--;
      debugPrint('Error downloading offline video: $e');
      return false;
    }
  }

  Future<void> deleteOfflineVideo(String lessonId) async {
    final index = await _getOfflineIndex();
    final path = index[lessonId];
    if (path != null) {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
      index.remove(lessonId);
      await _saveOfflineIndex(index);
    }
    _downloadProgress.remove(lessonId);
  }
}
