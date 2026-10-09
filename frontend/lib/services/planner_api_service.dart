import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/config/app_config.dart';
import '../models/task.dart';
import '../models/study_session.dart';

class PlannerApiService {
  static final PlannerApiService instance = PlannerApiService._internal();
  PlannerApiService._internal();

  // Test connection to FastAPI backend
  Future<bool> checkHealth() async {
    try {
      final url = Uri.parse('${AppConfig.effectiveApiBaseUrl}/health');
      final response = await http.get(url).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'ok';
      }
      return false;
    } catch (e) {
      debugPrint('[PlannerApiService] Health check failed: $e');
      return false;
    }
  }

  // Generate study plan via POST /api/plan/generate
  Future<GeneratedPlanResult> generatePlan({
    required int availableMinutes,
    required DateTime dayStart,
    required List<Task> tasks,
  }) async {
    final eligibleTasks = tasks.where((t) => !t.isCompleted).toList();
    if (eligibleTasks.isEmpty) {
      return GeneratedPlanResult(
        sessions: [],
        unscheduledTaskIds: [],
        remainingMinutes: availableMinutes,
      );
    }

    final requestPayload = {
      'available_minutes': availableMinutes,
      'day_start': dayStart.toIso8601String(),
      'tasks': eligibleTasks.map((t) => t.toApiRequestJson()).toList(),
    };

    try {
      final url = Uri.parse('${AppConfig.effectiveApiBaseUrl}/api/plan/generate');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(requestPayload),
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return GeneratedPlanResult.fromJson(data);
      } else {
        debugPrint('[PlannerApiService] API responded with error: ${response.statusCode} -> ${response.body}');
        throw Exception('API error: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[PlannerApiService] Failed to call /api/plan/generate ($e).');
      if (AppConfig.enableOfflineDemoFallback) {
        debugPrint('[PlannerApiService] Using smart local scheduler fallback for demo.');
        return _generateLocalFallbackPlan(
          availableMinutes: availableMinutes,
          dayStart: dayStart,
          tasks: eligibleTasks,
        );
      }
      rethrow;
    }
  }

  // Signature Feature: Rescue My Schedule
  // Recalculates schedule taking into account missed sessions and adjusted remaining time.
  Future<GeneratedPlanResult> rescueSchedule({
    required int remainingMinutes,
    required DateTime resumeTime,
    required List<Task> unfinishedTasks,
    List<StudySession> missedSessions = const [],
    String? reasonNotes,
  }) async {
    // Check if backend exposes dedicated /api/plan/rescue endpoint
    try {
      final rescueUrl = Uri.parse('${AppConfig.effectiveApiBaseUrl}/api/plan/rescue');
      final payload = {
        'remaining_minutes': remainingMinutes,
        'resume_time': resumeTime.toIso8601String(),
        'missed_session_ids': missedSessions.map((s) => s.id).toList(),
        'reason': reasonNotes ?? 'Student missed scheduled session',
        'tasks': unfinishedTasks.map((t) => t.toApiRequestJson()).toList(),
      };

      final response = await http
          .post(
            rescueUrl,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return GeneratedPlanResult.fromJson(data);
      }
    } catch (_) {
      // Backend /api/plan/rescue not yet deployed; fall back to standard /api/plan/generate contract
    }

    // Adaptively re-route through agreed /api/plan/generate contract
    return await generatePlan(
      availableMinutes: remainingMinutes,
      dayStart: resumeTime,
      tasks: unfinishedTasks,
    );
  }

  // Client-side heuristic scheduler for demo resilience
  GeneratedPlanResult _generateLocalFallbackPlan({
    required int availableMinutes,
    required DateTime dayStart,
    required List<Task> tasks,
  }) {
    // Sort tasks by priority score: Importance * 2 + Difficulty - DaysUntilDue
    final sortedTasks = List<Task>.from(tasks);
    sortedTasks.sort((a, b) {
      final now = DateTime.now();
      final daysA = a.dueAt.difference(now).inHours / 24.0;
      final daysB = b.dueAt.difference(now).inHours / 24.0;
      final scoreA = (a.importance * 3) + (a.difficulty * 2) - (daysA * 1.5);
      final scoreB = (b.importance * 3) + (b.difficulty * 2) - (daysB * 1.5);
      return scoreB.compareTo(scoreA); // Highest score first
    });

    int remainingMinutes = availableMinutes;
    DateTime currentSlot = dayStart;
    final List<StudySession> sessions = [];
    final List<String> unscheduled = [];

    for (final task in sortedTasks) {
      if (remainingMinutes < 25) {
        unscheduled.add(task.id);
        continue;
      }

      // Schedule in chunks of 30 to 60 minutes
      final int sessionDuration = task.estimatedMinutes.clamp(25, remainingMinutes > 50 ? 50 : remainingMinutes);

      final slotEnd = currentSlot.add(Duration(minutes: sessionDuration));
      sessions.add(
        StudySession(
          id: 'sess-gen-${sessions.length + 1}',
          userId: task.userId,
          taskId: task.id,
          title: '${task.title} (${task.subject})',
          startsAt: currentSlot,
          endsAt: slotEnd,
          status: 'planned',
          reason: 'High priority due in ${task.dueAt.difference(DateTime.now()).inDays}d; Importance: ${task.importance}/5',
        ),
      );

      remainingMinutes -= sessionDuration;
      // 10 min break between sessions if time permits
      if (remainingMinutes >= 15) {
        currentSlot = slotEnd.add(const Duration(minutes: 10));
        remainingMinutes -= 10;
      } else {
        currentSlot = slotEnd;
      }
    }

    return GeneratedPlanResult(
      sessions: sessions,
      unscheduledTaskIds: unscheduled,
      remainingMinutes: remainingMinutes.clamp(0, availableMinutes),
    );
  }
}
