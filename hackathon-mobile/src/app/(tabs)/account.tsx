import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

export default function AccountScreen() {
  const { email, userId, isConfigured, signOut } = useAuth();
  const isGuest = userId === 'guest-user';

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const changePassword = async () => {
    if (pw1.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (pw1 !== pw2) {
      setPwError('Passwords do not match');
      return;
    }
    if (!supabase) {
      setPwError('Not available in offline demo mode');
      return;
    }
    setPwError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        setPwError(error.message);
      } else {
        setNotice('Password updated successfully');
        setPw1('');
        setPw2('');
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', isGuest ? 'Exit the demo.' : `Signed in as ${email}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { signOut().catch(() => {}); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DzCard>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.email}>{isGuest ? 'Guest (demo)' : email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isGuest ? styles.guestBadge : styles.realBadge]}>
              <Text style={[styles.badgeTxt, isGuest ? styles.guestTxt : styles.realTxt]}>
                {isGuest ? 'GUEST' : 'ACCOUNT'}
              </Text>
            </View>
          </View>
          <Text style={styles.sub}>
            {isConfigured ? 'Supabase connected — data syncs per user.' : 'Supabase not configured — running offline demo.'}
          </Text>
        </DzCard>

        {!isGuest && isConfigured ? (
          <DzCard style={styles.mt}>
            <Text style={styles.sectionTitle}>Change password</Text>
            {pwError ? <Text style={styles.error}>{pwError}</Text> : null}
            {notice ? <Text style={styles.success}>{notice}</Text> : null}
            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput value={pw1} onChangeText={setPw1} secureTextEntry placeholder="••••••••" style={styles.input} placeholderTextColor={DZ.secondaryText} />
            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <TextInput value={pw2} onChangeText={setPw2} secureTextEntry placeholder="••••••••" style={styles.input} placeholderTextColor={DZ.secondaryText} />
            <Pressable onPress={changePassword} disabled={busy} style={[styles.primary, busy && styles.disabled]}>
              <Text style={styles.primaryTxt}>{busy ? 'Updating…' : 'Update password'}</Text>
            </Pressable>
          </DzCard>
        ) : (
          <DzCard style={styles.mt}>
            <Text style={styles.sub}>Guest accounts can&apos;t change passwords. Sign up for a real account to sync data across devices.</Text>
          </DzCard>
        )}

        <Pressable onPress={confirmSignOut} style={styles.signOut}>
          <Text style={styles.signOutTxt}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  content: { padding: 20, paddingBottom: 40 },
  mt: { marginTop: 14 },
  label: { fontSize: 12, fontWeight: '600', color: DZ.secondaryText },
  email: { fontSize: 18, fontWeight: '700', color: DZ.mainText, marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  guestBadge: { backgroundColor: DZ.warningBackground },
  realBadge: { backgroundColor: DZ.successBackground },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  guestTxt: { color: DZ.warningText },
  realTxt: { color: DZ.successText },
  sub: { fontSize: 12, color: DZ.secondaryText, marginTop: 10, lineHeight: 17 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: DZ.mainText, marginBottom: 4 },
  error: { color: DZ.errorText, backgroundColor: DZ.errorBackground, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 8 },
  success: { color: DZ.successText, backgroundColor: DZ.successBackground, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DZ.mainText, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: DZ.mainText },
  primary: { backgroundColor: DZ.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  signOut: { backgroundColor: DZ.errorBackground, borderWidth: 1, borderColor: DZ.errorText, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  signOutTxt: { color: DZ.errorText, fontWeight: '700', fontSize: 15 },
});
