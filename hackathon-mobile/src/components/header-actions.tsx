import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DZ } from '@/constants/deadline';
import { useAuth } from '@/store/auth';

/**
 * Shared top-right header actions: AI coach pill + account avatar.
 * Used on every tab header so Account is reachable without a bottom tab.
 */
export function HeaderActions() {
  const { email, userId } = useAuth();
  const isGuest = userId === 'guest-user';
  const initial = !isGuest && email ? email.trim().charAt(0).toUpperCase() : '👤';

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push('/ai-chat')} accessibilityLabel="AI study coach">
        <Text style={styles.aiBtn}>✨ AI</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/account')}
        accessibilityLabel="Open account"
        style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initial}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBtn: { color: DZ.primary, fontWeight: '700', fontSize: 13 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DZ.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 16, color: DZ.primary, fontWeight: '700' },
});
