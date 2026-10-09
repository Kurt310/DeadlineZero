import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import 'app_card.dart';

class ProgressCard extends StatelessWidget {
  final int completedTasks;
  final int totalTasks;
  final int plannedMinutes;

  const ProgressCard({
    super.key,
    required this.completedTasks,
    required this.totalTasks,
    required this.plannedMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final double percentage = totalTasks > 0 ? (completedTasks / totalTasks) : 0.0;
    final int percentInt = (percentage * 100).toInt();

    return AppCard(
      backgroundColor: AppTheme.sidebarBackground,
      borderColor: AppTheme.bordersAndDividers,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Today\'s Progress',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.mainText,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.cardSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.bordersAndDividers),
                ),
                child: Text(
                  '$percentInt% done',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: percentage,
              minHeight: 10,
              backgroundColor: AppTheme.cardSurface,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$completedTasks of $totalTasks tasks finished',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.mainText,
                ),
              ),
              Text(
                '${(plannedMinutes / 60).toStringAsFixed(1)} hrs planned',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.secondaryText,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
