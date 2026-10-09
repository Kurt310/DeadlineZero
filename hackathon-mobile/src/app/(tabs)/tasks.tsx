import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { DZ } from '@/constants/deadline';
import { DzEmpty } from '@/components/dz-empty';
import { DzTaskCard } from '@/components/dz-task-card';
import { useAuth } from '@/store/auth';
import { useTasks } from '@/store/tasks';

type Filter = 'all' | 'pending' | 'completed';

export default function TasksScreen() {
  const { tasks, pendingTasks, completedTasks, toggleComplete, deleteTask, refresh } = useTasks();
  const { signOut, email } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const confirmSignOut = () => {
    Alert.alert('Sign out?', email ? `Signed in as ${email}.` : 'Return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { signOut().catch(() => {}); } },
    ]);
  };

  const list = useMemo(() => {
    const base = filter === 'pending' ? pendingTasks : filter === 'completed' ? completedTasks : tasks;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  }, [filter, pendingTasks, completedTasks, tasks, query]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assignments</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={refresh} accessibilityLabel="Reload tasks">
            <Text style={styles.headerBtn}>⟳</Text>
          </Pressable>
          <Pressable onPress={confirmSignOut} accessibilityLabel="Sign out">
            <Text style={styles.headerBtn}>⏻</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search assignments or subjects…"
          style={styles.search}
          placeholderTextColor={DZ.secondaryText}
        />
        <View style={styles.chipRow}>
          <FilterChip label={`All (${tasks.length})`} on={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label={`Pending (${pendingTasks.length})`} on={filter === 'pending'} onPress={() => setFilter('pending')} />
          <FilterChip label={`Done (${completedTasks.length})`} on={filter === 'completed'} onPress={() => setFilter('completed')} />
        </View>
      </View>

      {list.length === 0 ? (
        <DzEmpty
          title={query ? 'No matches found' : 'No assignments here yet'}
          description={query ? 'Try refining your search keyword.' : 'Add upcoming assignments and DeadlineZero will plan your study schedule.'}
          actionLabel={query ? undefined : 'Add First Task'}
          onAction={query ? undefined : () => router.push('/task-form')}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <DzTaskCard
              task={item}
              onToggleComplete={() => toggleComplete(item.id)}
              onPress={() => router.push(`/task-form?id=${item.id}`)}
              onDelete={() => deleteTask(item.id)}
            />
          )}
        />
      )}

      <Pressable onPress={() => router.push('/task-form')} style={styles.fab} accessibilityLabel="New task">
        <Text style={styles.fabTxt}>＋ New Task</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: DZ.mainText },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerBtn: { fontSize: 20, color: DZ.secondaryText, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  search: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: DZ.mainText },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: DZ.softAccent, borderColor: DZ.primary },
  chipTxt: { fontSize: 12, color: DZ.secondaryText, fontWeight: '500' },
  chipTxtOn: { color: DZ.primary, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 100 },
  sep: { height: 10 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: DZ.primary, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
