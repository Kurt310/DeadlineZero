import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return <AppTabs />;
}
