import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class LoadingView extends StatelessWidget {
  final String message;

  const LoadingView({
    super.key,
    this.message = 'Loading...',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(
            color: AppTheme.primary,
            strokeWidth: 3,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.secondaryText,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
