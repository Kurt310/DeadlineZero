import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import { DzEmpty } from '@/components/dz-empty';
import { DzRescueDialog } from '@/components/dz-rescue-dialog';
import { formatTime } from '@/lib/format';
import { generatePlan, rescueSchedule } from '@/lib/planner';
import { sessionDurationMinutes, type StudySession } from '@/lib/types';
import { useTasks } from '@/store/tasks';

const BUDGETS = [90, 120, 180, 240, 300];

export default function PlanScreen() {
  const { pendingTasks } = useTasks();
  const [budget, setBudget] = useState(180);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [unscheduled, setUnscheduled] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescuing, setRescuing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const runGenerate = useCallback(async (mins: number) => {
    setGenerating(true);
    try {
      const res = await generatePlan(mins, new Date(), pendingTasks);
      setSessions(res.sessions);
      setUnscheduled(res.unscheduledTaskIds);
    } finally {
      setGenerating(false);
    }
  }, [pendingTasks]);

  useEffect(() => {
    // Mount-only initial fetch: safe cascading render, needed for first paint data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runGenerate(budget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickBudget = (mins: number) => {
    setBudget(mins);
    runGenerate(mins);
  };

  const onRescue = async (remaining: number, reason: string, missedIds: string[]) => {
    setRescuing(true);
    try {
      const res = await rescueSchedule(remaining, new Date(), pendingTasks, missedIds.length, reason);
      setSessions(res.sessions);
      setUnscheduled(res.unscheduledTaskIds);
      setNotice(`Schedule rescued! Re-allocated remaining ${remaining}m (${missedIds.length} missed block${missedIds.length === 1 ? '' : 's'}).`);
      setRescueOpen(false);
    } finally {
      setRescuing(false);
    }
  };

  const toggleSession = (id: string, status: StudySession['status']) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const totalMins = sessions.reduce((s, x) => s + sessionDurationMinutes(x), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Plan</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => runGenerate(budget)} disabled={generating}>
            <Text style={styles.refresh}>⟳ Regenerate</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DzCard>
          <View style={styles.budgetTop}>
            <Text style={styles.budgetTitle}>Today&apos;s Study Budget</Text>
            <View style={styles.budgetPill}><Text style={styles.budgetPillTxt}>{(budget / 60).toFixed(1)} hours</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.budgets}>
            {BUDGETS.map((m) => {
              const on = budget === m;
              return (
                <Pressable key={m} onPress={() => pickBudget(m)} style={[styles.budgetChip, on && styles.budgetChipOn]}>
                  <Text style={[styles.budgetTxt, on && styles.budgetTxtOn]}>{Math.floor(m / 60)}h{m % 60 ? ` ${m % 60}m` : ''}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.btnRow}>
            <Pressable onPress={() => runGenerate(budget)} disabled={generating} style={[styles.genBtn, generating && styles.disabled]}>
              <Text style={styles.genTxt}>{generating ? 'Optimizing…' : '⚡ Generate Plan'}</Text>
            </Pressable>
            <Pressable onPress={() => setRescueOpen(true)} style={styles.rescueBtn}>
              <Text style={styles.rescueTxt}>✦ Rescue</Text>
            </Pressable>
          </View>
        </DzCard>

        {notice ? (
          <DzCard backgroundColor={DZ.softAccent} borderColor={DZ.primary} style={styles.notice}>
            <Text style={styles.noticeTxt}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)}><Text style={styles.dismiss}>✕</Text></Pressable>
          </DzCard>
        ) : null}

        {unscheduled.length > 0 ? (
          <DzCard backgroundColor={DZ.warningBackground} borderColor={DZ.warningBorder} style={styles.notice}>
            <Text style={styles.warnTxt}>{unscheduled.length} tasks exceeded today&apos;s study budget. They stay prioritized for next session.</Text>
          </DzCard>
        ) : null}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today&apos;s Blocks</Text>
          <Text style={styles.sectionSub}>{sessions.length} sessions • {totalMins} mins</Text>
        </View>

        {generating && sessions.length === 0 ? (
          <View style={styles.center}><ActivityIndicator color={DZ.primary} /><Text style={styles.muted}>Generating optimal study timeline…</Text></View>
        ) : sessions.length === 0 ? (
          <DzCard>
            <DzEmpty title="No sessions scheduled yet" description={pendingTasks.length === 0 ? 'All tasks completed! Add new assignments to build a plan.' : 'Tap Generate Plan to organize assignments into study blocks.'} actionLabel={pendingTasks.length === 0 ? undefined : 'Generate Now'} onAction={pendingTasks.length === 0 ? undefined : () => runGenerate(budget)} />
          </DzCard>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.sessGap}>
              <DzCard padding={14}>
                <View style={styles.sessTop}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeTxt}>{formatTime(new Date(s.startsAt))}</Text>
                    <Text style={styles.toTxt}>to</Text>
                    <Text style={styles.timeTxt}>{formatTime(new Date(s.endsAt))}</Text>
                  </View>
                  <View style={styles.sessMain}>
                    <Text style={[styles.sessTitle, s.status === 'completed' && styles.struck]} numberOfLines={2}>{s.title}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusPill, s.status === 'completed' && styles.okPill, s.status === 'missed' && styles.missPill]}>
                        <Text style={[styles.statusTxt, s.status === 'completed' && styles.okTxt, s.status === 'missed' && styles.missTxt]}>{s.status.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.muted}>{sessionDurationMinutes(s)} mins</Text>
                    </View>
                  </View>
                </View>
                {s.reason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonTxt}>{s.reason}</Text>
                  </View>
                ) : null}
                <View style={styles.sessActions}>
                  <Pressable onPress={() => toggleSession(s.id, 'missed')}><Text style={styles.missedBtn}>✕ Missed</Text></Pressable>
                  <Pressable onPress={() => toggleSession(s.id, s.status === 'completed' ? 'planned' : 'completed')} style={styles.doneBtn}>
                    <Text style={styles.doneTxt}>{s.status === 'completed' ? 'Completed' : '✓ Mark Done'}</Text>
                  </Pressable>
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
  title: { fontSize: 20, fontWeight: '700', color: DZ.mainText },
  refresh: { color: DZ.primary, fontWeight: '600', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetTitle: { fontSize: 15, fontWeight: '700', color: DZ.mainText },
  budgetPill: { backgroundColor: DZ.softAccent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  budgetPillTxt: { fontSize: 13, fontWeight: '700', color: DZ.primary },
  budgets: { marginTop: 12 },
  budgetChip: { backgroundColor: DZ.sidebarBackground, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  budgetChipOn: { backgroundColor: DZ.primary },
  budgetTxt: { fontSize: 12, color: DZ.mainText, fontWeight: '500' },
  budgetTxtOn: { color: '#fff', fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  genBtn: { flex: 1, backgroundColor: DZ.primary, borderRadius: 12, padding: 13, alignItems: 'center' },
  genTxt: { color: '#fff', fontWeight: '700' },
  rescueBtn: { backgroundColor: DZ.warningBackground, borderWidth: 1, borderColor: DZ.warningBorder, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  rescueTxt: { color: DZ.warningText, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  noticeTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: DZ.mainText },
  warnTxt: { fontSize: 12, color: DZ.warningText, fontWeight: '600', flex: 1 },
  dismiss: { color: DZ.secondaryText },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: DZ.mainText },
  sectionSub: { fontSize: 13, color: DZ.secondaryText },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  muted: { fontSize: 12, color: DZ.secondaryText },
  sessGap: { marginBottom: 10 },
  sessTop: { flexDirection: 'row', gap: 12 },
  timeBox: { backgroundColor: DZ.sidebarBackground, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 86 },
  timeTxt: { fontWeight: '700', fontSize: 12, color: DZ.mainText },
  toTxt: { fontSize: 10, color: DZ.secondaryText },
  sessMain: { flex: 1 },
  sessTitle: { fontSize: 15, fontWeight: '600', color: DZ.mainText },
  struck: { color: DZ.secondaryText, textDecorationLine: 'line-through' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusPill: { backgroundColor: DZ.sidebarBackground, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  okPill: { backgroundColor: DZ.successBackground },
  missPill: { backgroundColor: DZ.errorBackground },
  statusTxt: { fontSize: 10, fontWeight: '700', color: DZ.mainText },
  okTxt: { color: DZ.successText },
  missTxt: { color: DZ.errorText },
  reasonBox: { backgroundColor: DZ.mainBackground, borderRadius: 8, padding: 10, marginTop: 10 },
  reasonTxt: { fontSize: 11, color: DZ.secondaryText },
  sessActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 10, borderTopWidth: 1, borderTopColor: DZ.borders, paddingTop: 8 },
  missedBtn: { color: DZ.errorText, fontSize: 12, fontWeight: '600' },
  doneBtn: { backgroundColor: DZ.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  doneTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
