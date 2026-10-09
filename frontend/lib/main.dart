import 'package:flutter/material.dart';
import 'app.dart';
import 'services/supabase_service.dart';
import 'services/task_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase (safely catches unconfigured keys)
  await SupabaseService.instance.initialize();

  // Load initial tasks from Supabase or local seed
  await TaskService.instance.fetchTasks();

  runApp(const DeadlineZeroApp());
}
