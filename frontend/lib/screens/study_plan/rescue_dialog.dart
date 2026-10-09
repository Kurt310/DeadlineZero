import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/study_session.dart';
import '../../services/planner_api_service.dart';
import '../../services/task_service.dart';

class RescueScheduleDialog extends StatefulWidget {
  final List<StudySession> currentSessions;
  final Function(GeneratedPlanResult rescuedPlan, String explanation) onPlanRescued;

  const RescueScheduleDialog({
    super.key,
    required this.currentSessions,
    required this.onPlanRescued,
  });

  @override
  State<RescueScheduleDialog> createState() => _RescueScheduleDialogState();
}

class _RescueScheduleDialogState extends State<RescueScheduleDialog> {
  final PlannerApiService _apiService = PlannerApiService.instance;
  final TaskService _taskService = TaskService.instance;

  int _remainingMinutes = 120;
  String _selectedReason = 'Missed planned study block';
  bool _isRescuing = false;
  final Set<String> _missedSessionIds = {};

  final List<String> _commonReasons = [
    'Missed planned study block',
    'Task took longer than estimated',
    'Unexpected emergency or errand',
    'Feeling exhausted / low energy',
  ];

  @override
  void initState() {
    super.initState();
    // Default to first pending or planned session as missed if available
    final planned = widget.currentSessions.where((s) => s.isPlanned).toList();
    if (planned.isNotEmpty) {
      _missedSessionIds.add(planned.first.id);
    }
  }

  Future<void> _executeRescue() async {
    setState(() => _isRescuing = true);

    final missedSessions = widget.currentSessions
        .where((s) => _missedSessionIds.contains(s.id))
        .toList();

    try {
      final rescued = await _apiService.rescueSchedule(
        remainingMinutes: _remainingMinutes,
        resumeTime: DateTime.now(),
        unfinishedTasks: _taskService.pendingTasks,
        missedSessions: missedSessions,
        reasonNotes: _selectedReason,
      );

      final explanation = 'Schedule rescued! Re-allocated remaining ${_remainingMinutes}m '
          'around your highest-leverage deadlines while accounting for ${_missedSessionIds.length} missed block(s).';

      if (mounted) {
        Navigator.pop(context);
        widget.onPlanRescued(rescued, explanation);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isRescuing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.errorText,
            content: Text('Failed to rescue schedule: $e'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: AppTheme.cardSurface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.warningBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.auto_fix_high_rounded,
                    color: AppTheme.warningText,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Rescue My Schedule',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.mainText,
                        ),
                      ),
                      Text(
                        'Fell behind? Re-align your plan instantly.',
                        style: TextStyle(fontSize: 12, color: AppTheme.secondaryText),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Divider(),
            const SizedBox(height: 14),

            // Which session was missed
            const Text(
              'Which sessions were missed or interrupted?',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.mainText),
            ),
            const SizedBox(height: 8),

            if (widget.currentSessions.isEmpty)
              const Text('No active sessions in current plan.', style: TextStyle(color: AppTheme.secondaryText, fontSize: 13))
            else
              ...widget.currentSessions.map((session) {
                final isSelected = _missedSessionIds.contains(session.id);
                return CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppTheme.warningText,
                  title: Text(
                    session.title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.mainText),
                  ),
                  subtitle: Text(
                    '${session.durationMinutes} min session',
                    style: const TextStyle(fontSize: 11, color: AppTheme.secondaryText),
                  ),
                  value: isSelected,
                  onChanged: (checked) {
                    setState(() {
                      if (checked == true) {
                        _missedSessionIds.add(session.id);
                      } else {
                        _missedSessionIds.remove(session.id);
                      }
                    });
                  },
                );
              }),

            const SizedBox(height: 16),

            // What happened
            const Text(
              'What caused the delay?',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.mainText),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.bordersAndDividers),
                borderRadius: BorderRadius.circular(10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedReason,
                  items: _commonReasons.map((r) {
                    return DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13)));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedReason = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // How much study time remaining today
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Remaining Time Today',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.mainText),
                ),
                Text(
                  '$_remainingMinutes mins (${(_remainingMinutes / 60).toStringAsFixed(1)} hrs)',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary, fontSize: 13),
                ),
              ],
            ),
            Slider(
              value: _remainingMinutes.toDouble(),
              min: 30,
              max: 300,
              divisions: 9,
              activeColor: AppTheme.primary,
              inactiveColor: AppTheme.sidebarBackground,
              onChanged: (val) => setState(() => _remainingMinutes = val.round()),
            ),
            const SizedBox(height: 22),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isRescuing ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isRescuing ? null : _executeRescue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                    ),
                    child: _isRescuing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Regenerate Plan'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
