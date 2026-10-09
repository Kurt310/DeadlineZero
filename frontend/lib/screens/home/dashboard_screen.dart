import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/study_session.dart';
import '../../services/planner_api_service.dart';
import '../../services/task_service.dart';
import '../../widgets/app_card.dart';
import '../../widgets/progress_card.dart';
import '../../widgets/task_card.dart';
import '../study_plan/rescue_dialog.dart';
import '../tasks/task_form_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int tabIndex)? onNavigateToTab;

  const DashboardScreen({super.key, this.onNavigateToTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TaskService _taskService = TaskService.instance;
  final PlannerApiService _plannerApi = PlannerApiService.instance;

  List<StudySession> _todaySessions = [];
  bool _isLoadingSessions = false;
  String? _rescueNotice;

  @override
  void initState() {
    super.initState();
    _taskService.addListener(_onTasksChanged);
    _loadTodaySessions();
  }

  @override
  void dispose() {
    _taskService.removeListener(_onTasksChanged);
    super.dispose();
  }

  void _onTasksChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadTodaySessions() async {
    setState(() => _isLoadingSessions = true);
    try {
      final res = await _plannerApi.generatePlan(
        availableMinutes: 180,
        dayStart: DateTime.now(),
        tasks: _taskService.pendingTasks,
      );
      if (mounted) {
        setState(() {
          _todaySessions = res.sessions;
          _isLoadingSessions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSessions = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  void _openRescueDialog() {
    showDialog(
      context: context,
      builder: (_) => RescueScheduleDialog(
        currentSessions: _todaySessions,
        onPlanRescued: (rescuedPlan, explanation) {
          setState(() {
            _todaySessions = rescuedPlan.sessions;
            _rescueNotice = explanation;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final dateStr = DateFormat('EEEE, MMMM d').format(now);
    final urgentTasks = _taskService.urgentTasks;
    final totalTasks = _taskService.tasks.length;
    final completedTasks = _taskService.completedTasks.length;
    final mostUrgent = urgentTasks.isNotEmpty ? urgentTasks.first : null;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_getGreeting()}, Scholar',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            Text(
              dateStr,
              style: const TextStyle(fontSize: 12, color: AppTheme.secondaryText, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppTheme.primary, size: 26),
            tooltip: 'Add Assignment',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TaskFormScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          await _taskService.fetchTasks();
          await _loadTodaySessions();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rescue notification banner if recently rescued
              if (_rescueNotice != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.softAccent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: AppTheme.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _rescueNotice!,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.mainText),
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () => setState(() => _rescueNotice = null),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // 1. Standout Rescue Banner CTA
              AppCard(
                backgroundColor: AppTheme.warningBackground,
                borderColor: const Color(0xFFF0D49C),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_fix_high_rounded, color: AppTheme.warningText, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Fell Behind on Study?',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.warningText,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Regenerate your schedule adaptively with 1 tap.',
                            style: TextStyle(fontSize: 12, color: AppTheme.mainText),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      onPressed: _openRescueDialog,
                      child: const Text('Rescue', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // 2. Today's Study Progress Card
              ProgressCard(
                completedTasks: completedTasks,
                totalTasks: totalTasks,
                plannedMinutes: _todaySessions.fold(0, (sum, s) => sum + s.durationMinutes),
              ),
              const SizedBox(height: 22),

              // 3. Urgent / Upcoming Deadline
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Most Urgent Deadline',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.mainText,
                    ),
                  ),
                  if (widget.onNavigateToTab != null)
                    TextButton(
                      onPressed: () => widget.onNavigateToTab!(1),
                      child: const Text('View all', style: TextStyle(color: AppTheme.primary, fontSize: 13)),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (mostUrgent != null)
                TaskCard(
                  task: mostUrgent,
                  onToggleComplete: () => _taskService.toggleTaskComplete(mostUrgent.id),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => TaskFormScreen(taskToEdit: mostUrgent)),
                    );
                  },
                )
              else
                AppCard(
                  child: const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        'No pending assignments right now! 🎉',
                        style: TextStyle(color: AppTheme.secondaryText, fontSize: 14),
                      ),
                    ),
                  ),
                ),

              const SizedBox(height: 22),

              // 4. Today's Scheduled Sessions Preview
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Today\'s Study Sessions',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.mainText,
                    ),
                  ),
                  if (widget.onNavigateToTab != null)
                    TextButton(
                      onPressed: () => widget.onNavigateToTab!(2),
                      child: const Text('Full plan', style: TextStyle(color: AppTheme.primary, fontSize: 13)),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoadingSessions)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
              else if (_todaySessions.isEmpty)
                AppCard(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Column(
                        children: [
                          const Icon(Icons.calendar_today_outlined, color: AppTheme.secondaryText, size: 28),
                          const SizedBox(height: 8),
                          const Text('No sessions planned for today yet.', style: TextStyle(color: AppTheme.secondaryText)),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            onPressed: _loadTodaySessions,
                            child: const Text('Generate Study Plan'),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                ..._todaySessions.take(3).map((session) {
                  final timeStr = '${DateFormat('h:mm a').format(session.startsAt)} - ${DateFormat('h:mm a').format(session.endsAt)}';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: AppCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 40,
                            decoration: BoxDecoration(
                              color: session.isCompleted ? AppTheme.successText : AppTheme.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  session.title,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  timeStr,
                                  style: const TextStyle(fontSize: 12, color: AppTheme.secondaryText),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${session.durationMinutes}m',
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}
