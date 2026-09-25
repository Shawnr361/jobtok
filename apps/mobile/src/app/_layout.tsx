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
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneFrame } from '../components/PhoneFrame';
import { ScreenEnter } from '../components/animations/ScreenEnter';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { c } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const webScreenLayout = ({ children }: { children: ReactNode }) => (
  <ScreenEnter>{children}</ScreenEnter>
);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PhoneFrame>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }}
              // Phones animate between screens natively; the web gets the same feel from here.
              screenLayout={Platform.OS === 'web' ? webScreenLayout : undefined}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="signed-in"
                options={{ animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen name="create" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="talent/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-edit" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="u/[handle]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="video/[id]" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
          </AuthProvider>
        </PhoneFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
