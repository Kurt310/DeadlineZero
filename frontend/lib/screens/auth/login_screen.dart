import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/supabase_service.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const LoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'student@deadlinezero.io');
  final _passwordController = TextEditingController(text: 'Password123!');
  bool _isSignUp = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      if (_isSignUp) {
        await SupabaseService.instance.signUp(email, password);
      } else {
        await SupabaseService.instance.signIn(email, password);
      }

      if (mounted) {
        widget.onLoginSuccess();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _continueAsGuest() {
    widget.onLoginSuccess();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.mainBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Icon / Logo
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.schedule_rounded,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'DeadlineZero',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.mainText,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Adaptive study scheduling for peak academic results.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppTheme.secondaryText),
                  ),
                  const SizedBox(height: 32),

                  // Card with inputs
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: AppTheme.cardSurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.bordersAndDividers),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isSignUp ? 'Create your account' : 'Welcome back',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.mainText,
                          ),
                        ),
                        const SizedBox(height: 16),

                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.errorBackground,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppTheme.errorText, fontSize: 12),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],

                        // Email
                        const Text(
                          'Email Address',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.mainText),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(hintText: 'name@university.edu'),
                          validator: (val) {
                            if (val == null || val.isEmpty || !val.contains('@')) {
                              return 'Please enter a valid email address';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Password
                        const Text(
                          'Password',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.mainText),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(hintText: '••••••••'),
                          validator: (val) {
                            if (val == null || val.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 22),

                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _submit,
                            child: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : Text(_isSignUp ? 'Sign Up' : 'Sign In'),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Toggle Sign Up / Sign In
                        Center(
                          child: TextButton(
                            onPressed: () {
                              setState(() {
                                _isSignUp = !_isSignUp;
                                _errorMessage = null;
                              });
                            },
                            child: Text(
                              _isSignUp
                                  ? 'Already have an account? Sign In'
                                  : 'Need an account? Sign Up',
                              style: const TextStyle(color: AppTheme.primary, fontSize: 13),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Quick Demo / Guest Button
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.bordersAndDividers),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                    onPressed: _continueAsGuest,
                    icon: const Icon(Icons.flash_on_rounded, size: 18, color: AppTheme.primary),
                    label: const Text(
                      'Explore as Guest (Instant Demo)',
                      style: TextStyle(color: AppTheme.mainText, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
