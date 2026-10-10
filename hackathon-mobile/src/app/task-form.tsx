import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { DZ } from '@/constants/deadline';
import { DzTaskForm } from '@/components/dz-task-form';
import type { Task } from '@/lib/types';
import { useTasks } from '@/store/tasks';

export default function TaskFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, createTask, updateTask, isLoading } = useTasks();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editingId = typeof id === 'string' ? id : undefined;
  const existing = editingId ? getById(editingId) : undefined;

  // Editing a task whose remote fetch hasn't arrived yet — don't silently turn it into a create.
  if (editingId && !existing && isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator color={DZ.primary} />
          <Text style={styles.muted}>Loading assignment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSave = async (t: Task) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (existing) await updateTask(t);
      else await createTask(t);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {saveError ? (
        <View style={styles.errWrap}>
          <Text style={styles.err}>{saveError}</Text>
        </View>
      ) : null}
      <DzTaskForm key={editingId ?? 'new'} initial={existing} saving={saving} onSave={onSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: DZ.secondaryText, fontSize: 13 },
  errWrap: { backgroundColor: DZ.errorBackground, marginHorizontal: 20, marginTop: 12, borderRadius: 8, padding: 10 },
  err: { color: DZ.errorText, fontSize: 12, fontWeight: '600' },
});
