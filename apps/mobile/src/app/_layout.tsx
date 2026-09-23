import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { c } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Design typography: Plus Jakarta Sans (headlines, labels) + Inter (body).
  const [loaded, error] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Continue with system fonts if loading fails rather than blocking the app.
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="signed-in" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="create" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="talent/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
