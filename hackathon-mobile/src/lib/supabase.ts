import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False until real project credentials are set — app runs in guest/offline mode. */
export const isSupabaseConfigured =
  url.length > 0 &&
  anonKey.length > 0 &&
  !url.includes('xyzcompany') &&
  anonKey !== 'public-anon-key-placeholder';

function makeClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  // Static web prerender runs in Node (no window): AsyncStorage would crash
  // during session recovery. Real browsers and native devices are unaffected.
  if (Platform.OS === 'web' && typeof window === 'undefined') return null;
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase: SupabaseClient | null = makeClient();

/** Current JWT for authenticated backend calls, or null in guest/offline mode. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
