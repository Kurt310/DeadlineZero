import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import type { Task } from '@/lib/types';
import { useTasks } from '@/store/tasks';

export default function ProgressScreen() {
  const { tasks, completedTasks, pendingTasks } = useTasks();

  const totalMins = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const doneMins = completedTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const rate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
  const highPri = tasks.filter((t) => t.importance >= 4 && t.status !== 'completed').length;

  const bySubject = new Map<string, Task[]>();
  for (const t of tasks) {
    const arr = bySubject.get(t.subject) ?? [];
    arr.push(t);
    bySubject.set(t.subject, arr);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Text style={styles.title}>Workload & Analytics</Text></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <Metric title="Completion" value={`${Math.round(rate * 100)}%`} sub={`${completedTasks.length}/${tasks.length} tasks`} color={DZ.primary} />
          <Metric title="Workload" value={`${(totalMins / 60).toFixed(1)}h`} sub={`${(doneMins / 60).toFixed(1)}h done`} color={DZ.warningText} />
        </View>
        <View style={styles.grid}>
          <Metric title="Pending" value={`${pendingTasks.length}`} sub="Active deadlines" color={DZ.secondaryText} />
          <Metric title="High Priority" value={`${highPri}`} sub="Priority 4 or 5" color={DZ.errorText} />
        </View>

        <Text style={styles.section}>Workload by Course / Subject</Text>
        {bySubject.size === 0 ? (
          <DzCard><Text style={styles.mutedCenter}>No courses recorded yet</Text></DzCard>
        ) : (
          [...bySubject.entries()].map(([subject, list]) => {
            const done = list.filter((t) => t.status === 'completed').length;
            const mins = list.reduce((s, t) => s + t.estimatedMinutes, 0);
            const pct = list.length > 0 ? done / list.length : 0;
            return (
              <View key={subject} style={styles.subGap}>
                <DzCard padding={14}>
                  <View style={styles.subTop}>
                    <Text style={styles.subName} numberOfLines={1}>{subject}</Text>
                    <Text style={styles.subMeta}>{done}/{list.length} done • {(mins / 60).toFixed(1)}h</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { flex: pct }]} />
                    <View style={{ flex: Math.max(0, 1 - pct) }} />
                  </View>
                </DzCard>
              </View>
            );
          })
        )}

        <DzCard backgroundColor={DZ.softAccent} style={styles.tip}>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipMain}>
              <Text style={styles.tipTitle}>DeadlineZero Pro-Tip</Text>
              <Text style={styles.tipTxt}>When facing overlapping exams, the scheduler divides tasks into 45-minute blocks with spaced intervals to maximize retention.</Text>
            </View>
          </View>
        </DzCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.metricWrap}>
      <DzCard padding={14}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricSub}>{sub}</Text>
      </DzCard>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: DZ.mainText },
  content: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricWrap: { flex: 1 },
  metricTitle: { fontSize: 12, fontWeight: '600', color: DZ.secondaryText },
  metricValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  metricSub: { fontSize: 11, color: DZ.secondaryText, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '700', color: DZ.mainText, marginTop: 12, marginBottom: 10 },
  mutedCenter: { color: DZ.secondaryText, textAlign: 'center', padding: 16 },
  subGap: { marginBottom: 10 },
  subTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  subName: { fontWeight: '700', fontSize: 14, color: DZ.mainText, flex: 1 },
  subMeta: { fontSize: 12, color: DZ.secondaryText },
  track: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: DZ.sidebarBackground, overflow: 'hidden', marginTop: 10 },
  fill: { backgroundColor: DZ.primary },
  tip: { marginTop: 12 },
  tipRow: { flexDirection: 'row', gap: 12 },
  tipIcon: { fontSize: 22 },
  tipMain: { flex: 1 },
  tipTitle: { fontWeight: '700', fontSize: 14, color: DZ.mainText },
  tipTxt: { fontSize: 12, color: DZ.mainText, marginTop: 4, lineHeight: 17 },
});
