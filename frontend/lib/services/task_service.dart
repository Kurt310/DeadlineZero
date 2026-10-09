import 'package:flutter/foundation.dart';
import '../models/task.dart';
import 'supabase_service.dart';

class TaskService extends ChangeNotifier {
  static final TaskService instance = TaskService._internal();
  TaskService._internal() {
    _seedInitialTasks();
  }

  final SupabaseService _supabase = SupabaseService.instance;
  List<Task> _tasks = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Task> get tasks => List.unmodifiable(_tasks);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<Task> get pendingTasks =>
      _tasks.where((t) => t.status != 'completed').toList();

  List<Task> get completedTasks =>
      _tasks.where((t) => t.status == 'completed').toList();

  List<Task> get urgentTasks {
    final list = _tasks.where((t) => !t.isCompleted).toList();
    list.sort((a, b) => a.dueAt.compareTo(b.dueAt));
    return list;
  }

  void _seedInitialTasks() {
    final now = DateTime.now();
    _tasks = [
      Task(
        id: 'task-001',
        userId: _supabase.currentUserId,
        title: 'Prepare database reviewer',
        subject: 'Database Systems',
        description: 'Review indexing, normal forms, and transaction isolation levels.',
        dueAt: now.add(const Duration(days: 1, hours: 4)),
        estimatedMinutes: 90,
        importance: 5,
        difficulty: 4,
        status: 'in_progress',
      ),
      Task(
        id: 'task-002',
        userId: _supabase.currentUserId,
        title: 'Finish UI prototype',
        subject: 'Human Computer Interaction',
        description: 'Implement high-fidelity Figma components and user flow.',
        dueAt: now.add(const Duration(days: 2, hours: 2)),
        estimatedMinutes: 60,
        importance: 4,
        difficulty: 3,
        status: 'pending',
      ),
      Task(
        id: 'task-003',
        userId: _supabase.currentUserId,
        title: 'Algorithms problem set 3',
        subject: 'Data Structures & Algorithms',
        description: 'Complete dynamic programming and graph shortest path problems.',
        dueAt: now.add(const Duration(days: 3, hours: 6)),
        estimatedMinutes: 120,
        importance: 5,
        difficulty: 5,
        status: 'pending',
      ),
      Task(
        id: 'task-004',
        userId: _supabase.currentUserId,
        title: 'Ethics response paper',
        subject: 'Tech & Society',
        description: 'Write a 2-page essay on AI alignment and copyright ethics.',
        dueAt: now.add(const Duration(days: 4)),
        estimatedMinutes: 45,
        importance: 3,
        difficulty: 2,
        status: 'completed',
      ),
    ];
  }

  Future<void> fetchTasks() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    if (_supabase.isInitialized && _supabase.client != null) {
      try {
        final response = await _supabase.client!
            .from('tasks')
            .select()
            .order('due_at', ascending: true);

        final rawList = response as List<dynamic>;
        _tasks = rawList
            .map((item) => Task.fromJson(item as Map<String, dynamic>))
            .toList();
      } catch (e) {
        debugPrint('[TaskService] Error fetching from Supabase: $e');
        _errorMessage = 'Could not fetch from Supabase. Displaying local tasks.';
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createTask(Task task) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    bool success = true;
    if (_supabase.isInitialized && _supabase.client != null) {
      try {
        final payload = task.toJson();
        await _supabase.client!.from('tasks').insert(payload);
      } catch (e) {
        debugPrint('[TaskService] Supabase insert error: $e');
        _errorMessage = 'Failed to persist to Supabase: $e';
        success = false;
      }
    }

    // Always update local memory store for instant responsiveness
    _tasks.insert(0, task);
    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> updateTask(Task task) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    bool success = true;
    if (_supabase.isInitialized && _supabase.client != null) {
      try {
        await _supabase.client!
            .from('tasks')
            .update(task.toJson())
            .eq('id', task.id);
      } catch (e) {
        debugPrint('[TaskService] Supabase update error: $e');
        _errorMessage = 'Failed to update in Supabase: $e';
        success = false;
      }
    }

    final index = _tasks.indexWhere((t) => t.id == task.id);
    if (index != -1) {
      _tasks[index] = task;
    }
    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> toggleTaskComplete(String taskId) async {
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) return false;

    final current = _tasks[index];
    final newStatus = current.isCompleted ? 'pending' : 'completed';
    final updated = current.copyWith(status: newStatus);

    return await updateTask(updated);
  }

  Future<bool> deleteTask(String taskId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    bool success = true;
    if (_supabase.isInitialized && _supabase.client != null) {
      try {
        await _supabase.client!.from('tasks').delete().eq('id', taskId);
      } catch (e) {
        debugPrint('[TaskService] Supabase delete error: $e');
        _errorMessage = 'Failed to delete from Supabase: $e';
        success = false;
      }
    }

    _tasks.removeWhere((t) => t.id == taskId);
    _isLoading = false;
    notifyListeners();
    return success;
  }
}
