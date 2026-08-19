import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;
  const LoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'student@mharat.iq');
  final _passwordController = TextEditingController(text: '123456');
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.post(ApiConstants.login, {
        'usernameOrEmail': _emailController.text.trim(),
        'password': _passwordController.text,
      });

      if (response != null && response['token'] != null) {
        final token = response['token'] as String;
        final user = response['user'] as Map<String, dynamic>? ?? {};

        await SecureStorageService.saveAuthToken(token);
        await SecureStorageService.saveUserData(
          id: (user['id'] ?? '1').toString(),
          name: (user['name'] ?? 'مقتدى علي').toString(),
          role: (user['role'] ?? 'student').toString(),
        );

        widget.onLoginSuccess();
      } else {
        setState(() {
          _errorMessage = 'فشل تسجيل الدخول، يرجى التأكد من البيانات.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'فشل الاتصال بالخادم، يرجى المحاولة لاحقاً.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryNavy,
              AppTheme.darkVoid,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Branding Icon & Logo
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: AppTheme.cyberBlue.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.cyberBlue.withValues(alpha: 0.4), width: 2),
                    ),
                    child: const Icon(
                      Icons.school_rounded,
                      size: 48,
                      color: AppTheme.cyberBlue,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'منصة مهارات الوطنية',
                    style: GoogleFonts.cairo(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'Skills of Youth Mobile Platform',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.radiantGold,
                    ),
                  ),
                  const SizedBox(height: 36),

                  // Login Form Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.cardDark,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorderDark),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'تسجيل الدخول إلى حسابك',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),

                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.cairo(color: Colors.redAccent, fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Email Field
                        TextField(
                          controller: _emailController,
                          style: GoogleFonts.cairo(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'البريد الإلكتروني أو اسم المستخدم',
                            labelStyle: GoogleFonts.cairo(color: AppTheme.textMuted, fontSize: 13),
                            prefixIcon: const Icon(Icons.email_outlined, color: AppTheme.cyberBlue),
                            filled: true,
                            fillColor: AppTheme.darkVoid,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppTheme.cardBorderDark),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Password Field
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          style: GoogleFonts.cairo(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'كلمة المرور',
                            labelStyle: GoogleFonts.cairo(color: AppTheme.textMuted, fontSize: 13),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.cyberBlue),
                            filled: true,
                            fillColor: AppTheme.darkVoid,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppTheme.cardBorderDark),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Login Button
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.cyberBlue,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : Text(
                                  'دخول المنصة',
                                  style: GoogleFonts.cairo(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
