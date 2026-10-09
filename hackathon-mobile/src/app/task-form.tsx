import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DZ } from '@/constants/deadline';
import { DzTaskForm } from '@/components/dz-task-form';
import type { Task } from '@/lib/types';
import { useTasks } from '@/store/tasks';

export default function TaskFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, createTask, updateTask } = useTasks();
  const [saving, setSaving] = useState(false);

  const existing = typeof id === 'string' ? getById(id) : undefined;

  const onSave = (t: Task) => {
    setSaving(true);
    if (existing) updateTask(t);
    else createTask(t);
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <DzTaskForm initial={existing} saving={saving} onSave={onSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
});
