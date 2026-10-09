import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import { DzEmpty } from '@/components/dz-empty';
import { DzProgressCard } from '@/components/dz-progress-card';
import { DzRescueDialog } from '@/components/dz-rescue-dialog';
import { DzTaskCard } from '@/components/dz-task-card';
import { formatLongDate, greeting, formatTime } from '@/lib/format';
import { generatePlan, rescueSchedule } from '@/lib/planner';
import { sessionDurationMinutes, type StudySession } from '@/lib/types';
import { useTasks } from '@/store/tasks';

export default function DashboardScreen() {
  const { tasks, completedTasks, urgentTasks, toggleComplete } = useTasks();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescuing, setRescuing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await generatePlan(180, new Date(), tasks.filter((t) => t.status !== 'completed'));
      setSessions(res.sessions);
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    // Mount-only initial fetch: safe cascading render, needed for first paint data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRescue = async (remaining: number, reason: string, missedIds: string[]) => {
    setRescuing(true);
    try {
      const res = await rescueSchedule(remaining, new Date(), tasks.filter((t) => t.status !== 'completed'), missedIds.length, reason);
      setSessions(res.sessions);
      setNotice(`Schedule rescued! Re-allocated remaining ${remaining}m around your highest-leverage deadlines (${missedIds.length} missed block${missedIds.length === 1 ? '' : 's'}).`);
      setRescueOpen(false);
    } finally {
      setRescuing(false);
    }
  };

  const mostUrgent = urgentTasks[0];
  const plannedMinutes = sessions.reduce((s, x) => s + sessionDurationMinutes(x), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>{greeting()}, Scholar</Text>
          <Text style={styles.date}>{formatLongDate(new Date())}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/ai-chat')} accessibilityLabel="AI study coach">
            <Text style={styles.aiBtn}>✨ AI</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/task-form')} style={styles.addBtn} accessibilityLabel="Add assignment">
            <Text style={styles.addTxt}>＋</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DZ.primary} />}>
        {notice ? (
          <DzCard backgroundColor={DZ.softAccent} borderColor={DZ.primary} style={styles.notice}>
            <Text style={styles.noticeTxt}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)}><Text style={styles.dismiss}>✕</Text></Pressable>
          </DzCard>
        ) : null}

        <DzCard backgroundColor={DZ.warningBackground} borderColor={DZ.warningBorder}>
          <View style={styles.rescueRow}>
            <View style={styles.rescueIcon}><Text style={styles.rescueEmoji}>✦</Text></View>
            <View style={styles.rescueText}>
              <Text style={styles.rescueTitle}>Fell Behind on Study?</Text>
              <Text style={styles.rescueSub}>Regenerate your schedule adaptively with 1 tap.</Text>
            </View>
            <Pressable onPress={() => setRescueOpen(true)} style={styles.rescueBtn}>
              <Text style={styles.rescueBtnTxt}>Rescue</Text>
            </Pressable>
          </View>
        </DzCard>

        <View style={styles.gap}>
          <DzProgressCard completedTasks={completedTasks.length} totalTasks={tasks.length} plannedMinutes={plannedMinutes} />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Most Urgent Deadline</Text>
          <Pressable onPress={() => router.push('/tasks')}><Text style={styles.link}>View all</Text></Pressable>
        </View>
        {mostUrgent ? (
          <DzTaskCard task={mostUrgent} onToggleComplete={() => toggleComplete(mostUrgent.id)} onPress={() => router.push(`/task-form?id=${mostUrgent.id}`)} />
        ) : (
          <DzCard><Text style={styles.mutedCenter}>No pending assignments right now!</Text></DzCard>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today&apos;s Study Sessions</Text>
          <Pressable onPress={() => router.push('/plan')}><Text style={styles.link}>Full plan</Text></Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={DZ.primary} style={styles.loader} />
        ) : sessions.length === 0 ? (
          <DzCard>
            <DzEmpty title="No sessions planned yet" description="Generate a study plan to organize your assignments into realistic blocks." actionLabel="Generate Study Plan" onAction={load} />
          </DzCard>
        ) : (
          sessions.slice(0, 3).map((s) => (
            <View key={s.id} style={styles.sessionGap}>
              <DzCard padding={14}>
                <View style={styles.sessionRow}>
                  <View style={[styles.bar, s.status === 'completed' && styles.barDone]} />
                  <View style={styles.sessionMain}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.sessionTime}>{formatTime(new Date(s.startsAt))} - {formatTime(new Date(s.endsAt))}</Text>
                  </View>
                  <Text style={styles.sessionMins}>{sessionDurationMinutes(s)}m</Text>
                </View>
              </DzCard>
            </View>
          ))
        )}
      </ScrollView>

      <DzRescueDialog visible={rescueOpen} sessions={sessions} onClose={() => setRescueOpen(false)} onRescue={onRescue} rescuing={rescuing} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hello: { fontSize: 18, fontWeight: '700', color: DZ.mainText },
  date: { fontSize: 12, color: DZ.secondaryText, marginTop: 2 },
  aiBtn: { color: DZ.primary, fontWeight: '700', fontSize: 13 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: DZ.softAccent, alignItems: 'center', justifyContent: 'center' },
  addTxt: { fontSize: 22, color: DZ.primary, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  noticeTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: DZ.mainText },
  dismiss: { color: DZ.secondaryText, fontSize: 14 },
  rescueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rescueIcon: { backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  rescueEmoji: { fontSize: 22, color: DZ.warningText },
  rescueText: { flex: 1 },
  rescueTitle: { fontSize: 15, fontWeight: '700', color: DZ.warningText },
  rescueSub: { fontSize: 12, color: DZ.mainText, marginTop: 2 },
  rescueBtn: { backgroundColor: DZ.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  rescueBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  gap: { marginTop: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: DZ.mainText },
  link: { color: DZ.primary, fontSize: 13, fontWeight: '600' },
  mutedCenter: { color: DZ.secondaryText, textAlign: 'center', paddingVertical: 16 },
  loader: { marginVertical: 24 },
  sessionGap: { marginBottom: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { width: 10, height: 40, borderRadius: 4, backgroundColor: DZ.primary },
  barDone: { backgroundColor: DZ.successText },
  sessionMain: { flex: 1 },
  sessionTitle: { fontWeight: '600', fontSize: 14, color: DZ.mainText },
  sessionTime: { fontSize: 12, color: DZ.secondaryText, marginTop: 2 },
  sessionMins: { fontWeight: '700', color: DZ.primary, fontSize: 12 },
});
