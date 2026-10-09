import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._();

  // Supabase Configuration
  // Replace these with your actual Supabase project credentials.
  static String supabaseUrl = const String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://xyzcompany.supabase.co',
  );

  static String supabaseAnonKey = const String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'public-anon-key-placeholder',
  );

  // Set this to true to enable Supabase if credentials are provided.
  static bool get isSupabaseConfigured =>
      supabaseUrl != 'https://xyzcompany.supabase.co' &&
      supabaseAnonKey != 'public-anon-key-placeholder' &&
      supabaseUrl.isNotEmpty &&
      supabaseAnonKey.isNotEmpty;

  // FastAPI Base URL
  // Handles Web (localhost/127.0.0.1) vs Android emulator (10.0.2.2) vs Custom Host
  static String get defaultApiBaseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:8000';
    }
    // Android emulator alias for host machine
    return 'http://10.0.2.2:8000';
  }

  static String apiBaseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get effectiveApiBaseUrl =>
      apiBaseUrl.isNotEmpty ? apiBaseUrl : defaultApiBaseUrl;

  // Demo / Offline fallback mode
  // If true, falls back gracefully to smart client-side simulation when backend is unreachable
  static bool enableOfflineDemoFallback = true;
}
