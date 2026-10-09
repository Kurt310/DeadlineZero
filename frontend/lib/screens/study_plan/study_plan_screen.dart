import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/study_session.dart';
import '../../services/planner_api_service.dart';
import '../../services/task_service.dart';
import '../../widgets/app_card.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/loading_view.dart';
import 'rescue_dialog.dart';

class StudyPlanScreen extends StatefulWidget {
  const StudyPlanScreen({super.key});

  @override
  State<StudyPlanScreen> createState() => _StudyPlanScreenState();
}

class _StudyPlanScreenState extends State<StudyPlanScreen> {
  final PlannerApiService _plannerApi = PlannerApiService.instance;
  final TaskService _taskService = TaskService.instance;

  int _selectedAvailableMinutes = 180; // 3 hours default
  bool _isGenerating = false;
  List<StudySession> _currentSessions = [];
  List<String> _unscheduledTaskIds = [];
  String? _rescueNotice;

  @override
  void initState() {
    super.initState();
    _generateInitialPlan();
  }

  Future<void> _generateInitialPlan() async {
    setState(() => _isGenerating = true);
    try {
      final result = await _plannerApi.generatePlan(
        availableMinutes: _selectedAvailableMinutes,
        dayStart: DateTime.now(),
        tasks: _taskService.pendingTasks,
      );

      setState(() {
        _currentSessions = result.sessions;
        _unscheduledTaskIds = result.unscheduledTaskIds;
        _isGenerating = false;
      });
    } catch (_) {
      setState(() => _isGenerating = false);
    }
  }

  void _openRescueDialog() {
    showDialog(
      context: context,
      builder: (_) => RescueScheduleDialog(
        currentSessions: _currentSessions,
        onPlanRescued: (rescuedPlan, explanation) {
          setState(() {
            _currentSessions = rescuedPlan.sessions;
            _unscheduledTaskIds = rescuedPlan.unscheduledTaskIds;
            _rescueNotice = explanation;
          });
        },
      ),
    );
  }

  void _toggleSessionStatus(StudySession session, String newStatus) {
    setState(() {
      final index = _currentSessions.indexWhere((s) => s.id == session.id);
      if (index != -1) {
        _currentSessions[index] = session.copyWith(status: newStatus);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final pendingTasks = _taskService.pendingTasks;
    final totalPlannedMinutes = _currentSessions.fold<int>(0, (sum, s) => sum + s.durationMinutes);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Plan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Regenerate schedule',
            onPressed: _isGenerating ? null : _generateInitialPlan,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Available time selector & Generate action
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Today\'s Study Budget',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.mainText,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.softAccent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${(_selectedAvailableMinutes / 60).toStringAsFixed(1)} hours',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [90, 120, 180, 240, 300].map((mins) {
                        final isSelected = _selectedAvailableMinutes == mins;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text('${mins ~/ 60}h ${mins % 60 > 0 ? "${mins % 60}m" : ""}'),
                            selected: isSelected,
                            selectedColor: AppTheme.primary,
                            backgroundColor: AppTheme.sidebarBackground,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.mainText,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) {
                                setState(() => _selectedAvailableMinutes = mins);
                                _generateInitialPlan();
                              }
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isGenerating ? null : _generateInitialPlan,
                          icon: _isGenerating
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.bolt_rounded, size: 18),
                          label: Text(_isGenerating ? 'Optimizing...' : 'Generate Plan'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      // SIGNATURE ACTION: Rescue My Schedule
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.warningBackground,
                          foregroundColor: AppTheme.warningText,
                          elevation: 0,
                          side: const BorderSide(color: Color(0xFFF0D49C)),
                        ),
                        onPressed: _openRescueDialog,
                        icon: const Icon(Icons.auto_fix_high_rounded, size: 18),
                        label: const Text('Rescue Schedule'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (_rescueNotice != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.softAccent,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppTheme.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _rescueNotice!,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.mainText,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 16, color: AppTheme.secondaryText),
                      onPressed: () => setState(() => _rescueNotice = null),
                    ),
                  ],
                ),
              ),
            ],

            if (_unscheduledTaskIds.isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.warningBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF0D49C)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AppTheme.warningText, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${_unscheduledTaskIds.length} tasks exceeded today\'s study budget. They will remain prioritized for your next session.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.warningText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Sessions Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Today\'s Blocks',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.mainText,
                  ),
                ),
                Text(
                  '${_currentSessions.length} sessions • $totalPlannedMinutes mins',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.secondaryText,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (_isGenerating && _currentSessions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: LoadingView(message: 'Generating optimal study timeline...'),
              )
            else if (_currentSessions.isEmpty)
              EmptyStateView(
                icon: Icons.calendar_today_rounded,
                title: 'No sessions scheduled yet',
                description: pendingTasks.isEmpty
                    ? 'All tasks are completed! Add new assignments to build a study plan.'
                    : 'Tap "Generate Plan" to organize your assignments into realistic study blocks.',
                actionLabel: pendingTasks.isEmpty ? null : 'Generate Now',
                onAction: pendingTasks.isEmpty ? null : _generateInitialPlan,
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _currentSessions.length,
                separatorBuilder: (_, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final session = _currentSessions[index];
                  final startTimeStr = DateFormat('h:mm a').format(session.startsAt);
                  final endTimeStr = DateFormat('h:mm a').format(session.endsAt);

                  Color cardBg = AppTheme.cardSurface;
                  Color statusBadgeBg = AppTheme.sidebarBackground;
                  Color statusTextColor = AppTheme.mainText;

                  if (session.isCompleted) {
                    statusBadgeBg = AppTheme.successBackground;
                    statusTextColor = AppTheme.successText;
                  } else if (session.isMissed) {
                    statusBadgeBg = AppTheme.errorBackground;
                    statusTextColor = AppTheme.errorText;
                  }

                  return AppCard(
                    backgroundColor: cardBg,
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Time slot indicator
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.sidebarBackground,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    startTimeStr,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                      color: AppTheme.mainText,
                                    ),
                                  ),
                                  const Text('to', style: TextStyle(fontSize: 10, color: AppTheme.secondaryText)),
                                  Text(
                                    endTimeStr,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                      color: AppTheme.mainText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Session Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    session.title,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: session.isCompleted ? AppTheme.secondaryText : AppTheme.mainText,
                                      decoration: session.isCompleted ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: statusBadgeBg,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          session.status.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: statusTextColor,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '${session.durationMinutes} mins',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.secondaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        if (session.reason != null && session.reason!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.mainBackground,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline, size: 14, color: AppTheme.secondaryText),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    session.reason!,
                                    style: const TextStyle(fontSize: 11, color: AppTheme.secondaryText),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 10),
                        const Divider(height: 1),
                        const SizedBox(height: 8),

                        // Action buttons: Complete / Missed
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton.icon(
                              style: TextButton.styleFrom(
                                foregroundColor: AppTheme.errorText,
                                visualDensity: VisualDensity.compact,
                              ),
                              onPressed: () => _toggleSessionStatus(session, 'missed'),
                              icon: const Icon(Icons.close_rounded, size: 16),
                              label: const Text('Missed', style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 6),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: session.isCompleted ? AppTheme.sidebarBackground : AppTheme.primary,
                                foregroundColor: session.isCompleted ? AppTheme.mainText : Colors.white,
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              onPressed: () => _toggleSessionStatus(
                                session,
                                session.isCompleted ? 'planned' : 'completed',
                              ),
                              icon: Icon(
                                session.isCompleted ? Icons.check_circle_rounded : Icons.check_rounded,
                                size: 16,
                              ),
                              label: Text(
                                session.isCompleted ? 'Completed' : 'Mark Done',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
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
