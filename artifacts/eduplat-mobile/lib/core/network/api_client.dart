import 'dart:convert';
import 'package:http/http.dart' as http;
import '../storage/secure_storage_service.dart';

class ApiClient {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await SecureStorageService.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String url) async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(url), headers: headers);
    return _handleResponse(response);
  }

  static Future<dynamic> post(String url, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } else {
      throw Exception('API Error [${response.statusCode}]: ${response.body}');
    }
  }
}
