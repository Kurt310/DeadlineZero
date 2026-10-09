import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/task.dart';
import '../../services/task_service.dart';
import '../../widgets/app_card.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  final TaskService _taskService = TaskService.instance;

  @override
  void initState() {
    super.initState();
    _taskService.addListener(_onTasksChanged);
  }

  @override
  void dispose() {
    _taskService.removeListener(_onTasksChanged);
    super.dispose();
  }

  void _onTasksChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final tasks = _taskService.tasks;
    final completed = _taskService.completedTasks;
    final pending = _taskService.pendingTasks;

    final int totalEstMinutes = tasks.fold<int>(0, (sum, t) => sum + t.estimatedMinutes);
    final int completedMinutes = completed.fold<int>(0, (sum, t) => sum + t.estimatedMinutes);
    final double completionRate = tasks.isEmpty ? 0 : (completed.length / tasks.length);

    // Group by subject
    final Map<String, List<Task>> subjectMap = {};
    for (final t in tasks) {
      subjectMap.putIfAbsent(t.subject, () => []).add(t);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workload & Analytics'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Overview Grid
            Row(
              children: [
                Expanded(
                  child: _buildMetricTile(
                    title: 'Completion',
                    value: '${(completionRate * 100).toInt()}%',
                    subtitle: '${completed.length}/${tasks.length} tasks',
                    icon: Icons.pie_chart_rounded,
                    color: AppTheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricTile(
                    title: 'Workload',
                    value: '${(totalEstMinutes / 60).toStringAsFixed(1)}h',
                    subtitle: '${(completedMinutes / 60).toStringAsFixed(1)}h done',
                    icon: Icons.timer_rounded,
                    color: AppTheme.warningText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildMetricTile(
                    title: 'Pending',
                    value: '${pending.length}',
                    subtitle: 'Active deadlines',
                    icon: Icons.hourglass_top_rounded,
                    color: AppTheme.secondaryText,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricTile(
                    title: 'High Priority',
                    value: '${tasks.where((t) => t.importance >= 4 && !t.isCompleted).length}',
                    subtitle: 'Priority 4 or 5',
                    icon: Icons.priority_high_rounded,
                    color: AppTheme.errorText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Subject Breakdown
            const Text(
              'Workload by Course / Subject',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.mainText,
              ),
            ),
            const SizedBox(height: 12),
            if (subjectMap.isEmpty)
              const AppCard(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No courses recorded yet', style: TextStyle(color: AppTheme.secondaryText)),
                  ),
                ),
              )
            else
              ...subjectMap.entries.map((entry) {
                final subject = entry.key;
                final subTasks = entry.value;
                final subDone = subTasks.where((t) => t.isCompleted).length;
                final subTotalMinutes = subTasks.fold<int>(0, (sum, t) => sum + t.estimatedMinutes);
                final double subPct = subTasks.isEmpty ? 0.0 : (subDone / subTasks.length);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              subject,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.mainText),
                            ),
                            Text(
                              '$subDone/${subTasks.length} done • ${(subTotalMinutes / 60).toStringAsFixed(1)}h',
                              style: const TextStyle(fontSize: 12, color: AppTheme.secondaryText),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: subPct,
                            minHeight: 8,
                            backgroundColor: AppTheme.sidebarBackground,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 20),

            // Study Tip Card
            AppCard(
              backgroundColor: AppTheme.softAccent,
              borderColor: AppTheme.bordersAndDividers,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Icon(Icons.lightbulb_outline_rounded, color: AppTheme.primary, size: 24),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'DeadlineZero Pro-Tip',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.mainText),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'When facing multiple overlapping exams, our AI scheduler divides tasks into 45-minute blocks with spaced intervals to maximize cognitive retention.',
                          style: TextStyle(fontSize: 12, color: AppTheme.mainText, height: 1.4),
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

  Widget _buildMetricTile({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.secondaryText),
              ),
              Icon(icon, size: 18, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: AppTheme.secondaryText),
          ),
        ],
      ),
    );
  }
}
