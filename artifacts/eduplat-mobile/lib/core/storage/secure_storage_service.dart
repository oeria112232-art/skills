import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();

  static const String _keyToken = 'mharat_auth_token';
  static const String _keyUserId = 'mharat_user_id';
  static const String _keyUserName = 'mharat_user_name';
  static const String _keyUserRole = 'mharat_user_role';

  static Future<void> saveAuthToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  static Future<String?> getAuthToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<void> saveUserData({required String id, required String name, required String role}) async {
    await _storage.write(key: _keyUserId, value: id);
    await _storage.write(key: _keyUserName, value: name);
    await _storage.write(key: _keyUserRole, value: role);
  }

  static Future<Map<String, String?>> getUserData() async {
    final id = await _storage.read(key: _keyUserId);
    final name = await _storage.read(key: _keyUserName);
    final role = await _storage.read(key: _keyUserRole);
    return {'id': id, 'name': name, 'role': role};
  }

  static Future<void> clearAuth() async {
    await _storage.deleteAll();
  }
}
