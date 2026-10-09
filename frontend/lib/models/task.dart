class Task {
  final String id;
  final String userId;
  final String title;
  final String subject;
  final String? description;
  final DateTime dueAt;
  final int estimatedMinutes;
  final int importance; // 1 to 5
  final int difficulty; // 1 to 5
  final String status; // 'pending' | 'in_progress' | 'completed'
  final DateTime createdAt;

  Task({
    required this.id,
    required this.userId,
    required this.title,
    required this.subject,
    this.description,
    required this.dueAt,
    required this.estimatedMinutes,
    required this.importance,
    required this.difficulty,
    this.status = 'pending',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';
  bool get isPending => status == 'pending';

  bool get isOverdue =>
      !isCompleted && dueAt.isBefore(DateTime.now());

  Duration get timeRemaining => dueAt.difference(DateTime.now());

  // Factory constructor to parse Supabase or JSON map
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as String,
      userId: json['user_id'] as String? ?? 'guest-user',
      title: json['title'] as String,
      subject: json['subject'] as String? ?? 'General',
      description: json['description'] as String?,
      dueAt: DateTime.parse(json['due_at'] as String),
      estimatedMinutes: (json['estimated_minutes'] as num).toInt(),
      importance: (json['importance'] as num).toInt(),
      difficulty: (json['difficulty'] as num).toInt(),
      status: json['status'] as String? ?? 'pending',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }

  // Serializer for Supabase table insertion and update
  Map<String, dynamic> toJson({bool includeId = true}) {
    final map = <String, dynamic>{
      'user_id': userId,
      'title': title,
      'subject': subject,
      'description': description,
      'due_at': dueAt.toIso8601String(),
      'estimated_minutes': estimatedMinutes,
      'importance': importance,
      'difficulty': difficulty,
      'status': status,
      'created_at': createdAt.toIso8601String(),
    };
    if (includeId) {
      map['id'] = id;
    }
    return map;
  }

  // Serializer specifically for FastAPI /api/plan/generate request contract
  Map<String, dynamic> toApiRequestJson() {
    return {
      'id': id,
      'title': title,
      'due_at': dueAt.toIso8601String(),
      'estimated_minutes': estimatedMinutes,
      'importance': importance,
      'difficulty': difficulty,
    };
  }

  Task copyWith({
    String? id,
    String? userId,
    String? title,
    String? subject,
    String? description,
    DateTime? dueAt,
    int? estimatedMinutes,
    int? importance,
    int? difficulty,
    String? status,
    DateTime? createdAt,
  }) {
    return Task(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      dueAt: dueAt ?? this.dueAt,
      estimatedMinutes: estimatedMinutes ?? this.estimatedMinutes,
      importance: importance ?? this.importance,
      difficulty: difficulty ?? this.difficulty,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
