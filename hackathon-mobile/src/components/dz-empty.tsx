import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DZ } from '@/constants/deadline';

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function DzEmpty({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Text style={styles.icon}>✓</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32 },
  circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: DZ.softAccent, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 32, color: DZ.primary, fontWeight: '800' },
  title: { fontSize: 18, fontWeight: '700', color: DZ.mainText, marginTop: 16, textAlign: 'center' },
  desc: { fontSize: 14, color: DZ.secondaryText, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: DZ.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
