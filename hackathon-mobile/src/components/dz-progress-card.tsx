import { StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from './dz-card';

interface Props {
  completedTasks: number;
  totalTasks: number;
  plannedMinutes: number;
}

export function DzProgressCard({ completedTasks, totalTasks, plannedMinutes }: Props) {
  const pct = totalTasks > 0 ? completedTasks / totalTasks : 0;
  return (
    <DzCard backgroundColor={DZ.sidebarBackground}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Today&apos;s Progress</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{Math.round(pct * 100)}% done</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: pct }]} />
        <View style={{ flex: Math.max(0, 1 - pct) }} />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.bottomMain}>{completedTasks} of {totalTasks} tasks finished</Text>
        <Text style={styles.bottomSub}>{(plannedMinutes / 60).toFixed(1)} hrs planned</Text>
      </View>
    </DzCard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: DZ.mainText },
  pill: {
    backgroundColor: DZ.cardSurface, borderRadius: 12, borderWidth: 1, borderColor: DZ.borders,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: DZ.primary },
  track: { flexDirection: 'row', height: 10, borderRadius: 6, backgroundColor: DZ.cardSurface, overflow: 'hidden', marginTop: 12 },
  fill: { backgroundColor: DZ.primary, borderRadius: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  bottomMain: { fontSize: 13, fontWeight: '500', color: DZ.mainText },
  bottomSub: { fontSize: 13, color: DZ.secondaryText },
});
