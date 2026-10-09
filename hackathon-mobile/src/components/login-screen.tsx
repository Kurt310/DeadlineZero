import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import { useAuth } from '@/store/auth';

/** Rendered directly by the root layout when logged out — no route navigation needed. */
export function LoginScreen() {
  const { signIn, signUp, signInGuest, error: authError, isConfigured } = useAuth();
  const [email, setEmail] = useState('student@deadlinezero.io');
  const [password, setPassword] = useState('Password123!');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (isSignUp) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logo}>
          <Text style={styles.logoTxt}>◷</Text>
        </View>
        <Text style={styles.brand}>DeadlineZero</Text>
        <Text style={styles.tag}>Adaptive study scheduling for peak academic results.</Text>

        <DzCard style={styles.card}>
          <Text style={styles.cardTitle}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
          {error || authError ? <Text style={styles.error}>{error || authError}</Text> : null}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@university.edu" style={styles.input} placeholderTextColor={DZ.secondaryText} />
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" style={styles.input} placeholderTextColor={DZ.secondaryText} />
          <Pressable onPress={submit} disabled={busy} style={[styles.primary, busy && styles.disabled]}>
            <Text style={styles.primaryTxt}>{busy ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}</Text>
          </Pressable>
          <Pressable onPress={() => { setIsSignUp((v) => !v); setError(''); }} style={styles.toggle}>
            <Text style={styles.toggleTxt}>{isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}</Text>
          </Pressable>
        </DzCard>

        <Pressable onPress={signInGuest} style={styles.guest}>
          <Text style={styles.guestTxt}>⚡ Explore as Guest (Instant Demo)</Text>
        </Pressable>
        {!isConfigured ? (
          <Text style={styles.offlineNote}>Offline demo mode — add Supabase keys to .env for real accounts.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  content: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: DZ.primary, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 40, color: '#fff', fontWeight: '800' },
  brand: { fontSize: 26, fontWeight: '800', color: DZ.mainText, marginTop: 16, letterSpacing: -0.5 },
  tag: { fontSize: 13, color: DZ.secondaryText, marginTop: 6, textAlign: 'center' },
  card: { width: '100%', marginTop: 28, borderRadius: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: DZ.mainText, marginBottom: 14 },
  error: { color: DZ.errorText, backgroundColor: DZ.errorBackground, borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DZ.mainText, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: DZ.mainText },
  primary: { backgroundColor: DZ.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggle: { alignItems: 'center', marginTop: 12 },
  toggleTxt: { color: DZ.primary, fontSize: 13 },
  guest: { borderWidth: 1, borderColor: DZ.borders, backgroundColor: DZ.cardSurface, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  guestTxt: { color: DZ.mainText, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  offlineNote: { fontSize: 12, color: DZ.secondaryText, marginTop: 14, textAlign: 'center' },
});
