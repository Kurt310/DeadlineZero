import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { formatDueLabel } from '@/lib/format';
import type { Task } from '@/lib/types';
import { DzCard } from './dz-card';

interface Props {
  task: Task;
  onToggleComplete: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}

function importanceColor(v: number): string {
  if (v >= 4) return '#D32F2F';
  if (v === 3) return DZ.warningText;
  return DZ.primary;
}

export function DzTaskCard({ task, onToggleComplete, onPress, onDelete }: Props) {
  const done = task.status === 'completed';
  // Snapshot "now" once per mount — stable for badge computation during renders.
  const [nowMs] = useState(() => Date.now());
  const overdue = !done && new Date(task.dueAt).getTime() < nowMs;
  const dueSoon = !done && !overdue && new Date(task.dueAt).getTime() - nowMs < 24 * 3600000;

  const badgeBg = overdue ? DZ.errorBackground : dueSoon ? DZ.warningBackground : DZ.softAccent;
  const badgeText = overdue ? DZ.errorText : dueSoon ? DZ.warningText : DZ.mainText;

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert('Delete task?', `"${task.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <DzCard padding={14} onPress={onPress}>
      <View style={styles.row}>
        <Pressable onPress={onToggleComplete} hitSlop={8} accessibilityLabel="Toggle complete">
          <View style={[styles.check, done && styles.checkDone]}>
            {done ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        </Pressable>
        <View style={styles.main}>
          <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.subjectPill}>
              <Text style={styles.subjectText} numberOfLines={1}>{task.subject}</Text>
            </View>
            <Text style={styles.mins}>{task.estimatedMinutes}m</Text>
          </View>
        </View>
        {onDelete ? (
          <Pressable onPress={confirmDelete} hitSlop={10}>
            <Text style={styles.more}>⋯</Text>
          </Pressable>
        ) : null}
      </View>

      {task.description ? (
        <Text style={styles.desc} numberOfLines={2}>{task.description}</Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeText }]}>{formatDueLabel(task.dueAt)}</Text>
        </View>
        <View style={styles.scores}>
          <Text style={[styles.imp, { color: importanceColor(task.importance) }]}>Imp: {task.importance}/5</Text>
          <Text style={styles.diff}>Diff: {task.difficulty}/5</Text>
        </View>
      </View>
    </DzCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: DZ.secondaryText,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkDone: { backgroundColor: DZ.primary, borderColor: DZ.primary },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 16 },
  main: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '600', color: DZ.mainText },
  titleDone: { color: DZ.secondaryText, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  subjectPill: { backgroundColor: DZ.sidebarBackground, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 180 },
  subjectText: { fontSize: 11, fontWeight: '600', color: DZ.mainText },
  mins: { fontSize: 12, color: DZ.secondaryText },
  more: { fontSize: 20, color: DZ.secondaryText, paddingHorizontal: 4 },
  desc: { fontSize: 13, color: DZ.secondaryText, marginTop: 8, marginLeft: 36 },
  divider: { height: 1, backgroundColor: DZ.borders, marginTop: 10, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  imp: { fontSize: 11, fontWeight: '700' },
  diff: { fontSize: 11, color: DZ.secondaryText },
});
