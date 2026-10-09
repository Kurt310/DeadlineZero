import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../models/task.dart';
import '../../services/supabase_service.dart';
import '../../services/task_service.dart';

class TaskFormScreen extends StatefulWidget {
  final Task? taskToEdit;

  const TaskFormScreen({super.key, this.taskToEdit});

  @override
  State<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends State<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _titleController;
  late TextEditingController _subjectController;
  late TextEditingController _descriptionController;

  late DateTime _selectedDueDate;
  late TimeOfDay _selectedDueTime;
  late int _estimatedMinutes;
  late int _importance;
  late int _difficulty;
  late String _status;

  bool _isSaving = false;

  final List<String> _suggestedSubjects = [
    'Database Systems',
    'Algorithms',
    'Web Development',
    'Computer Networks',
    'Calculus',
    'General',
  ];

  @override
  void initState() {
    super.initState();
    final task = widget.taskToEdit;
    _titleController = TextEditingController(text: task?.title ?? '');
    _subjectController = TextEditingController(text: task?.subject ?? 'General');
    _descriptionController = TextEditingController(text: task?.description ?? '');

    final initialDue = task?.dueAt ?? DateTime.now().add(const Duration(days: 1, hours: 2));
    _selectedDueDate = DateTime(initialDue.year, initialDue.month, initialDue.day);
    _selectedDueTime = TimeOfDay(hour: initialDue.hour, minute: initialDue.minute);

    _estimatedMinutes = task?.estimatedMinutes ?? 60;
    _importance = task?.importance ?? 4;
    _difficulty = task?.difficulty ?? 3;
    _status = task?.status ?? 'pending';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDueDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              onSurface: AppTheme.mainText,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDueDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedDueTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              onSurface: AppTheme.mainText,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDueTime = picked);
    }
  }

  Future<void> _saveTask() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final combinedDueAt = DateTime(
      _selectedDueDate.year,
      _selectedDueDate.month,
      _selectedDueDate.day,
      _selectedDueTime.hour,
      _selectedDueTime.minute,
    );

    final isEditing = widget.taskToEdit != null;
    final task = Task(
      id: isEditing
          ? widget.taskToEdit!.id
          : 'task-${DateTime.now().millisecondsSinceEpoch}',
      userId: SupabaseService.instance.currentUserId,
      title: _titleController.text.trim(),
      subject: _subjectController.text.trim().isEmpty ? 'General' : _subjectController.text.trim(),
      description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      dueAt: combinedDueAt,
      estimatedMinutes: _estimatedMinutes,
      importance: _importance,
      difficulty: _difficulty,
      status: _status,
      createdAt: widget.taskToEdit?.createdAt,
    );

    bool ok;
    if (isEditing) {
      ok = await TaskService.instance.updateTask(task);
    } else {
      ok = await TaskService.instance.createTask(task);
    }

    if (mounted) {
      setState(() => _isSaving = false);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.primary,
            content: Text(isEditing ? 'Task updated successfully' : 'Task added to schedule'),
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.errorText,
            content: Text(TaskService.instance.errorMessage ?? 'Error saving task'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.taskToEdit != null;
    final formattedDate = DateFormat('EEE, MMM d, yyyy').format(_selectedDueDate);
    final formattedTime = _selectedDueTime.format(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Assignment' : 'New Assignment'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveTask,
            child: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  )
                : const Text(
                    'Save',
                    style: TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              const Text(
                'Task Title',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Database Normalization Practice',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please enter a title for the assignment';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Subject
              const Text(
                'Subject / Course',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _subjectController,
                decoration: const InputDecoration(
                  hintText: 'Course name or tag',
                ),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _suggestedSubjects.map((s) {
                    final isSelected = _subjectController.text == s;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(s),
                        selected: isSelected,
                        selectedColor: AppTheme.softAccent,
                        backgroundColor: AppTheme.sidebarBackground,
                        labelStyle: TextStyle(
                          color: isSelected ? AppTheme.primary : AppTheme.secondaryText,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        ),
                        onSelected: (val) {
                          if (val) {
                            setState(() => _subjectController.text = s);
                          }
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),

              // Deadline
              const Text(
                'Deadline',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today_outlined, size: 18),
                      label: Text(formattedDate, style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickTime,
                      icon: const Icon(Icons.access_time_outlined, size: 18),
                      label: Text(formattedTime, style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Estimated Duration
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Estimated Duration',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
                  ),
                  Text(
                    '$_estimatedMinutes minutes (${(_estimatedMinutes / 60).toStringAsFixed(1)} hrs)',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary),
                  ),
                ],
              ),
              Slider(
                value: _estimatedMinutes.toDouble(),
                min: 15,
                max: 360,
                divisions: 23, // 15-minute increments
                activeColor: AppTheme.primary,
                inactiveColor: AppTheme.sidebarBackground,
                onChanged: (val) => setState(() => _estimatedMinutes = val.round()),
              ),
              const SizedBox(height: 16),

              // Importance (1 to 5)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Importance (Priority Weight)',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
                  ),
                  Text(
                    '$_importance / 5',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary),
                  ),
                ],
              ),
              Slider(
                value: _importance.toDouble(),
                min: 1,
                max: 5,
                divisions: 4,
                activeColor: AppTheme.primary,
                inactiveColor: AppTheme.sidebarBackground,
                onChanged: (val) => setState(() => _importance = val.round()),
              ),
              const SizedBox(height: 16),

              // Difficulty (1 to 5)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Difficulty (Cognitive Effort)',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
                  ),
                  Text(
                    '$_difficulty / 5',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary),
                  ),
                ],
              ),
              Slider(
                value: _difficulty.toDouble(),
                min: 1,
                max: 5,
                divisions: 4,
                activeColor: AppTheme.primary,
                inactiveColor: AppTheme.sidebarBackground,
                onChanged: (val) => setState(() => _difficulty = val.round()),
              ),
              const SizedBox(height: 20),

              // Description
              const Text(
                'Notes & Details (Optional)',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.mainText),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Add guidelines, chapter references, or submission instructions...',
                ),
              ),
              const SizedBox(height: 32),

              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveTask,
                  child: Text(isEditing ? 'Update Assignment' : 'Add Assignment'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
