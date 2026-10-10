import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from '@/components/login-screen';
import { AuthProvider, useAuth } from '@/store/auth';
import { TasksProvider } from '@/store/tasks';

SplashScreen.preventAutoHideAsync();

/**
 * Auth-gated navigator: logged-out users see Login directly (no route),
 * so signing in never needs cross-route navigation.
 */
function RootNavigator() {
  const { isAuthenticated, isRestoring } = useAuth();

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isRestoring, isAuthenticated]);

  // Hold the native splash while a persisted session restores (no login flash).
  if (isRestoring) return <View style={{ flex: 1, backgroundColor: '#208AEF' }} />;

  if (!isAuthenticated) return <LoginScreen />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F5F6F2' },
        headerTintColor: '#243B36',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="task-form" options={{ title: 'Assignment', presentation: 'modal' }} />
      <Stack.Screen name="ai-chat" options={{ title: 'AI Study Coach', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TasksProvider>
          <RootNavigator />
        </TasksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
