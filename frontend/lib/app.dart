import 'package:flutter/material.dart';
import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/dashboard_screen.dart';
import 'screens/progress/progress_screen.dart';
import 'screens/study_plan/study_plan_screen.dart';
import 'screens/tasks/tasks_screen.dart';
import 'services/planner_api_service.dart';
import 'services/supabase_service.dart';

class DeadlineZeroApp extends StatefulWidget {
  const DeadlineZeroApp({super.key});

  @override
  State<DeadlineZeroApp> createState() => _DeadlineZeroAppState();
}

class _DeadlineZeroAppState extends State<DeadlineZeroApp> {
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _isAuthenticated = SupabaseService.instance.isAuthenticated;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DeadlineZero',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _isAuthenticated
          ? MainNavigationShell(
              onSignOut: () {
                SupabaseService.instance.signOut();
                setState(() => _isAuthenticated = false);
              },
            )
          : LoginScreen(
              onLoginSuccess: () {
                setState(() => _isAuthenticated = true);
              },
            ),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  final VoidCallback onSignOut;

  const MainNavigationShell({super.key, required this.onSignOut});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;
  bool? _isApiHealthy;

  @override
  void initState() {
    super.initState();
    _checkBackendHealth();
  }

  Future<void> _checkBackendHealth() async {
    final healthy = await PlannerApiService.instance.checkHealth();
    if (mounted) {
      setState(() => _isApiHealthy = healthy);
    }
  }

  void _onTabSelected(int index) {
    setState(() => _currentIndex = index);
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: AppTheme.cardSurface,
        title: Row(
          children: const [
            Icon(Icons.tune_rounded, color: AppTheme.primary),
            SizedBox(width: 10),
            Text('System Status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusRow(
              'Supabase Database',
              AppConfig.isSupabaseConfigured ? 'Connected' : 'Offline Mock Cache',
              AppConfig.isSupabaseConfigured ? AppTheme.successText : AppTheme.warningText,
            ),
            const SizedBox(height: 10),
            _buildStatusRow(
              'FastAPI Planner',
              _isApiHealthy == true ? 'Online (Live)' : 'Local Demo Scheduler',
              _isApiHealthy == true ? AppTheme.successText : AppTheme.primary,
            ),
            const SizedBox(height: 10),
            _buildStatusRow(
              'API Base URL',
              AppConfig.effectiveApiBaseUrl,
              AppTheme.secondaryText,
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.logout_rounded, color: AppTheme.errorText),
              title: const Text('Sign Out', style: TextStyle(color: AppTheme.errorText, fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                widget.onSignOut();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String title, String status, Color statusColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 12, color: AppTheme.secondaryText, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: statusColor),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                status,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: statusColor),
              ),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      DashboardScreen(onNavigateToTab: _onTabSelected),
      const TasksScreen(),
      const StudyPlanScreen(),
      const ProgressScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 48,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.softAccent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.schedule_rounded, size: 18, color: AppTheme.primary),
            ),
            const SizedBox(width: 8),
            const Text(
              'DeadlineZero',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.mainText),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'System Status',
            icon: const Icon(Icons.tune_rounded, size: 20),
            onPressed: _showSettingsDialog,
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppTheme.bordersAndDividers, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabSelected,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              activeIcon: Icon(Icons.assignment_rounded),
              label: 'Tasks',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month_outlined),
              activeIcon: Icon(Icons.calendar_month_rounded),
              label: 'Study Plan',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.insights_rounded),
              activeIcon: Icon(Icons.insights_rounded),
              label: 'Progress',
            ),
          ],
        ),
      ),
    );
  }
}
