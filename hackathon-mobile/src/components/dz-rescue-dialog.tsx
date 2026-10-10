import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import type { StudySession } from '@/lib/types';

const REASONS = [
  'Missed planned study block',
  'Task took longer than estimated',
  'Unexpected emergency or errand',
  'Feeling exhausted / low energy',
];

interface Props {
  visible: boolean;
  sessions: StudySession[];
  onClose: () => void;
  onRescue: (remainingMinutes: number, reason: string, missedIds: string[]) => void;
  rescuing: boolean;
}

export function DzRescueDialog({ visible, sessions, onClose, onRescue, rescuing }: Props) {
  const [remaining, setRemaining] = useState(120);
  const [reason, setReason] = useState(REASONS[0]);
  const [missed, setMissed] = useState<string[]>(() =>
    sessions.filter((s) => s.status === 'planned').slice(0, 1).map((s) => s.id),
  );

  // Refresh the pre-selection whenever the plan changes or the dialog opens —
  // session IDs are regenerated on every plan, so stale IDs are meaningless.
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMissed(sessions.filter((s) => s.status === 'planned').slice(0, 1).map((s) => s.id));
    }
  }, [visible, sessions]);

  const toggleMissed = (id: string) => {
    setMissed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const step = (delta: number) => {
    setRemaining((v) => Math.min(300, Math.max(30, v + delta)));
  };

  const body = useMemo(() => sessions, [sessions]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerEmoji}>✦</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Rescue My Schedule</Text>
                <Text style={styles.headerSub}>Fell behind? Re-align your plan instantly.</Text>
              </View>
            </View>

            <Text style={styles.label}>Which sessions were missed or interrupted?</Text>
            {body.length === 0 ? (
              <Text style={styles.muted}>No active sessions in current plan.</Text>
            ) : (
              body.map((s) => {
                const on = missed.includes(s.id);
                return (
                  <Pressable key={s.id} onPress={() => toggleMissed(s.id)} style={styles.checkRow}>
                    <View style={[styles.box, on && styles.boxOn]}>
                      {on ? <Text style={styles.boxMark}>✓</Text> : null}
                    </View>
                    <View style={styles.checkText}>
                      <Text style={styles.checkTitle} numberOfLines={1}>{s.title}</Text>
                      <Text style={styles.checkSub}>{sessionMins(s)} min session</Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Text style={[styles.label, styles.mt]}>What caused the delay?</Text>
            {REASONS.map((r) => {
              const on = reason === r;
              return (
                <Pressable key={r} onPress={() => setReason(r)} style={[styles.reason, on && styles.reasonOn]}>
                  <Text style={[styles.reasonText, on && styles.reasonTextOn]}>{r}</Text>
                </Pressable>
              );
            })}

            <View style={[styles.rowBetween, styles.mt]}>
              <Text style={styles.label}>Remaining Time Today</Text>
              <Text style={styles.remaining}>{remaining} mins ({(remaining / 60).toFixed(1)} hrs)</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => step(-30)} style={styles.stepBtn}><Text style={styles.stepTxt}>−30</Text></Pressable>
              <Pressable onPress={() => step(30)} style={styles.stepBtn}><Text style={styles.stepTxt}>+30</Text></Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onClose} disabled={rescuing} style={styles.cancelBtn}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onRescue(remaining, reason, missed)}
                disabled={rescuing}
                style={[styles.goBtn, rescuing && styles.disabled]}>
                <Text style={styles.goTxt}>{rescuing ? 'Rescuing…' : 'Regenerate Plan'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function sessionMins(s: StudySession): number {
  return Math.max(0, Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000));
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: DZ.cardSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { backgroundColor: DZ.warningBackground, borderRadius: 12, padding: 10 },
  headerEmoji: { fontSize: 22, color: DZ.warningText },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: DZ.mainText },
  headerSub: { fontSize: 12, color: DZ.secondaryText, marginTop: 2 },
  label: { fontWeight: '600', fontSize: 13, color: DZ.mainText, marginTop: 14, marginBottom: 8 },
  mt: { marginTop: 18 },
  muted: { color: DZ.secondaryText, fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: DZ.borders, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: DZ.warningText, borderColor: DZ.warningText },
  boxMark: { color: '#fff', fontWeight: '800', fontSize: 13 },
  checkText: { flex: 1 },
  checkTitle: { fontSize: 13, fontWeight: '600', color: DZ.mainText },
  checkSub: { fontSize: 11, color: DZ.secondaryText },
  reason: { borderWidth: 1, borderColor: DZ.borders, borderRadius: 10, padding: 10, marginBottom: 8 },
  reasonOn: { borderColor: DZ.primary, backgroundColor: DZ.softAccent },
  reasonText: { fontSize: 13, color: DZ.mainText },
  reasonTextOn: { fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remaining: { fontWeight: '700', color: DZ.primary, fontSize: 13 },
  stepper: { flexDirection: 'row', gap: 10, marginTop: 8 },
  stepBtn: { flex: 1, borderWidth: 1, borderColor: DZ.primary, borderRadius: 10, padding: 10, alignItems: 'center' },
  stepTxt: { color: DZ.primary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelTxt: { color: DZ.mainText, fontWeight: '600' },
  goBtn: { flex: 1, backgroundColor: DZ.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  goTxt: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
