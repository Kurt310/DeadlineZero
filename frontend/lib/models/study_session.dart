class StudySession {
  final String id;
  final String userId;
  final String taskId;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status; // 'planned' | 'completed' | 'missed'
  final String? reason;
  final DateTime createdAt;

  StudySession({
    required this.id,
    required this.userId,
    required this.taskId,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.status = 'planned',
    this.reason,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  int get durationMinutes => endsAt.difference(startsAt).inMinutes;
  bool get isCompleted => status == 'completed';
  bool get isMissed => status == 'missed';
  bool get isPlanned => status == 'planned';

  factory StudySession.fromApiResponse(Map<String, dynamic> json, {String userId = 'guest-user'}) {
    return StudySession(
      id: json['id'] as String? ?? 'sess-${DateTime.now().microsecondsSinceEpoch}',
      userId: userId,
      taskId: json['task_id'] as String,
      title: json['title'] as String? ?? 'Study Session',
      startsAt: DateTime.parse(json['starts_at'] as String),
      endsAt: DateTime.parse(json['ends_at'] as String),
      status: json['status'] as String? ?? 'planned',
      reason: json['reason'] as String?,
    );
  }

  factory StudySession.fromJson(Map<String, dynamic> json) {
    return StudySession(
      id: json['id'] as String,
      userId: json['user_id'] as String? ?? 'guest-user',
      taskId: json['task_id'] as String,
      title: json['title'] as String? ?? 'Study Session',
      startsAt: DateTime.parse(json['starts_at'] as String),
      endsAt: DateTime.parse(json['ends_at'] as String),
      status: json['status'] as String? ?? 'planned',
      reason: json['reason'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson({bool includeId = true}) {
    final map = <String, dynamic>{
      'user_id': userId,
      'task_id': taskId,
      'title': title,
      'starts_at': startsAt.toIso8601String(),
      'ends_at': endsAt.toIso8601String(),
      'status': status,
      'reason': reason,
      'created_at': createdAt.toIso8601String(),
    };
    if (includeId) {
      map['id'] = id;
    }
    return map;
  }

  StudySession copyWith({
    String? id,
    String? userId,
    String? taskId,
    String? title,
    DateTime? startsAt,
    DateTime? endsAt,
    String? status,
    String? reason,
    DateTime? createdAt,
  }) {
    return StudySession(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      taskId: taskId ?? this.taskId,
      title: title ?? this.title,
      startsAt: startsAt ?? this.startsAt,
      endsAt: endsAt ?? this.endsAt,
      status: status ?? this.status,
      reason: reason ?? this.reason,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class GeneratedPlanResult {
  final List<StudySession> sessions;
  final List<String> unscheduledTaskIds;
  final int remainingMinutes;

  GeneratedPlanResult({
    required this.sessions,
    required this.unscheduledTaskIds,
    required this.remainingMinutes,
  });

  factory GeneratedPlanResult.fromJson(Map<String, dynamic> json, {String userId = 'guest-user'}) {
    final sessionsList = (json['sessions'] as List<dynamic>? ?? [])
        .map((s) => StudySession.fromApiResponse(s as Map<String, dynamic>, userId: userId))
        .toList();

    final unscheduled = (json['unscheduled_task_ids'] as List<dynamic>? ?? [])
        .map((id) => id.toString())
        .toList();

    return GeneratedPlanResult(
      sessions: sessionsList,
      unscheduledTaskIds: unscheduled,
      remainingMinutes: (json['remaining_minutes'] as num?)?.toInt() ?? 0,
    );
  }
}
