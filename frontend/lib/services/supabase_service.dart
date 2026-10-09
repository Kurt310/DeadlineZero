import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config/app_config.dart';

class SupabaseService {
  static final SupabaseService instance = SupabaseService._internal();
  SupabaseService._internal();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (!AppConfig.isSupabaseConfigured) {
      debugPrint('[SupabaseService] AppConfig is not yet configured with valid Supabase keys. Operating in offline/mock mode.');
      return;
    }

    try {
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        publishableKey: AppConfig.supabaseAnonKey,
      );
      _isInitialized = true;
      debugPrint('[SupabaseService] Supabase successfully initialized.');
    } catch (e) {
      debugPrint('[SupabaseService] Error initializing Supabase: $e');
      _isInitialized = false;
    }
  }

  SupabaseClient? get client {
    if (!_isInitialized) return null;
    return Supabase.instance.client;
  }

  User? get currentUser {
    if (!_isInitialized) return null;
    return client?.auth.currentUser;
  }

  String get currentUserId {
    return currentUser?.id ?? '00000000-0000-0000-0000-000000000001';
  }

  bool get isAuthenticated => currentUser != null;

  Future<AuthResponse?> signIn(String email, String password) async {
    if (!_isInitialized) {
      debugPrint('[SupabaseService] Not initialized. Simulating mock sign in.');
      return null;
    }
    return await client!.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse?> signUp(String email, String password) async {
    if (!_isInitialized) {
      debugPrint('[SupabaseService] Not initialized. Simulating mock sign up.');
      return null;
    }
    return await client!.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    if (_isInitialized) {
      await client?.auth.signOut();
    }
  }
}
