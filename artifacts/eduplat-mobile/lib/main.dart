import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/certificates/certificates_screen.dart';
import 'features/jobs/jobs_screen.dart';
import 'features/tracks/tracks_catalog_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EduplatApp());
}

class EduplatApp extends StatefulWidget {
  const EduplatApp({super.key});

  @override
  State<EduplatApp> createState() => _EduplatAppState();
}

class _EduplatAppState extends State<EduplatApp> {
  bool _isLoggedIn = false;
  bool _checkingAuth = true;

  @override
  void initState() {
    super.initState();
    _checkAuthToken();
  }

  Future<void> _checkAuthToken() async {
    final token = await SecureStorageService.getAuthToken();
    setState(() {
      _isLoggedIn = token != null && token.isNotEmpty;
      _checkingAuth = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'منصة مهارات الوطنية',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      locale: const Locale('ar', 'IQ'),
      supportedLocales: const [
        Locale('ar', 'IQ'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: _checkingAuth
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator(color: AppTheme.cyberBlue)),
            )
          : _isLoggedIn
              ? const MainNavigationScreen()
              : LoginScreen(
                  onLoginSuccess: () {
                    setState(() {
                      _isLoggedIn = true;
                    });
                  },
                ),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    TracksCatalogScreen(),
    JobsScreen(),
    CertificatesScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: AppTheme.cardDark,
        selectedItemColor: AppTheme.cyberBlue,
        unselectedItemColor: AppTheme.textMuted,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarViewItem(
            icon: Icon(Icons.school_outlined),
            activeIcon: Icon(Icons.school_rounded),
            label: 'المسارات والورش',
          ),
          BottomNavigationBarViewItem(
            icon: Icon(Icons.work_outline_rounded),
            activeIcon: Icon(Icons.work_rounded),
            label: 'الوظائف',
          ),
          BottomNavigationBarViewItem(
            icon: Icon(Icons.workspace_premium_outlined),
            activeIcon: Icon(Icons.workspace_premium_rounded),
            label: 'شهاداتي',
          ),
        ],
      ),
    );
  }
}

class BottomNavigationBarViewItem extends BottomNavigationBarItem {
  const BottomNavigationBarViewItem({
    required super.icon,
    super.activeIcon,
    required super.label,
  });
}
