import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../models/task.dart';
import 'app_card.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onToggleComplete;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  const TaskCard({
    super.key,
    required this.task,
    this.onToggleComplete,
    this.onTap,
    this.onDelete,
  });

  Color _getImportanceColor(int importance) {
    if (importance >= 4) return const Color(0xFFD32F2F);
    if (importance == 3) return AppTheme.warningText;
    return AppTheme.primary;
  }

  @override
  Widget build(BuildContext context) {
    final bool isOverdue = task.isOverdue;
    final bool isDueSoon = !task.isCompleted && task.timeRemaining.inHours < 24 && !isOverdue;

    Color badgeBg = AppTheme.softAccent;
    Color badgeText = AppTheme.mainText;

    if (isOverdue) {
      badgeBg = AppTheme.errorBackground;
      badgeText = AppTheme.errorText;
    } else if (isDueSoon) {
      badgeBg = AppTheme.warningBackground;
      badgeText = AppTheme.warningText;
    }

    final formattedDate = DateFormat('EEE, MMM d • h:mm a').format(task.dueAt);

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Completion Checkbox
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: Icon(
                  task.isCompleted
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: task.isCompleted ? AppTheme.primary : AppTheme.secondaryText,
                  size: 24,
                ),
                onPressed: onToggleComplete,
              ),
              const SizedBox(width: 12),

              // Title and Subject
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: task.isCompleted ? AppTheme.secondaryText : AppTheme.mainText,
                        decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.sidebarBackground,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            task.subject,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.mainText,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${task.estimatedMinutes}m',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Trailing delete action
              if (onDelete != null)
                IconButton(
                  icon: const Icon(Icons.more_vert, size: 20, color: AppTheme.secondaryText),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (ctx) => SafeArea(
                        child: Wrap(
                          children: [
                            ListTile(
                              leading: const Icon(Icons.delete_outline, color: AppTheme.errorText),
                              title: const Text('Delete Task', style: TextStyle(color: AppTheme.errorText)),
                              onTap: () {
                                Navigator.pop(ctx);
                                onDelete!();
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),

          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 36),
              child: Text(
                task.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.secondaryText,
                ),
              ),
            ),
          ],

          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 8),

          // Footer with Due Date & Priority tags
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Icon(Icons.schedule_rounded, size: 14, color: badgeText),
                    const SizedBox(width: 4),
                    Text(
                      formattedDate,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: badgeText,
                      ),
                    ),
                  ],
                ),
              ),

              Row(
                children: [
                  Text(
                    'Imp: ${task.importance}/5',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _getImportanceColor(task.importance),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Diff: ${task.difficulty}/5',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.secondaryText,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
