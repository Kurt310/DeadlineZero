import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/task.dart';
import '../../services/task_service.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/task_card.dart';
import 'task_form_screen.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final TaskService _taskService = TaskService.instance;
  String _selectedFilter = 'all'; // 'all', 'pending', 'completed'
  String _searchQuery = '';

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

  List<Task> get _filteredTasks {
    List<Task> list;
    if (_selectedFilter == 'pending') {
      list = _taskService.pendingTasks;
    } else if (_selectedFilter == 'completed') {
      list = _taskService.completedTasks;
    } else {
      list = _taskService.tasks;
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((t) =>
        t.title.toLowerCase().contains(q) ||
        t.subject.toLowerCase().contains(q)
      ).toList();
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final tasks = _filteredTasks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Assignments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => _taskService.fetchTasks(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Task'),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const TaskFormScreen()),
          );
        },
      ),
      body: Column(
        children: [
          // Search and Filters
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppTheme.mainBackground,
            child: Column(
              children: [
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search assignments or subjects...',
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.secondaryText),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() => _searchQuery = ''),
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _buildFilterChip('All', 'all', _taskService.tasks.length),
                    const SizedBox(width: 8),
                    _buildFilterChip('Pending', 'pending', _taskService.pendingTasks.length),
                    const SizedBox(width: 8),
                    _buildFilterChip('Completed', 'completed', _taskService.completedTasks.length),
                  ],
                ),
              ],
            ),
          ),

          // Task List
          Expanded(
            child: _taskService.isLoading && _taskService.tasks.isEmpty
                ? const LoadingView(message: 'Loading assignments...')
                : tasks.isEmpty
                    ? EmptyStateView(
                        icon: Icons.checklist_rounded,
                        title: _searchQuery.isNotEmpty
                            ? 'No matches found'
                            : 'No assignments here yet',
                        description: _searchQuery.isNotEmpty
                            ? 'Try refining your search keyword.'
                            : 'Add your upcoming assignments and tests to let DeadlineZero plan your study schedule.',
                        actionLabel: _searchQuery.isEmpty ? 'Add First Task' : null,
                        onAction: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const TaskFormScreen()),
                          );
                        },
                      )
                    : RefreshIndicator(
                        color: AppTheme.primary,
                        onRefresh: () => _taskService.fetchTasks(),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                          itemCount: tasks.length,
                          separatorBuilder: (_, index) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final task = tasks[index];
                            return TaskCard(
                              task: task,
                              onToggleComplete: () {
                                _taskService.toggleTaskComplete(task.id);
                              },
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TaskFormScreen(taskToEdit: task),
                                  ),
                                );
                              },
                              onDelete: () {
                                _taskService.deleteTask(task.id);
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String key, int count) {
    final isSelected = _selectedFilter == key;
    return ChoiceChip(
      label: Text('$label ($count)'),
      selected: isSelected,
      selectedColor: AppTheme.softAccent,
      backgroundColor: AppTheme.cardSurface,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? AppTheme.primary : AppTheme.secondaryText,
      ),
      side: BorderSide(
        color: isSelected ? AppTheme.primary : AppTheme.bordersAndDividers,
      ),
      onSelected: (val) {
        if (val) setState(() => _selectedFilter = key);
      },
    );
  }
}
