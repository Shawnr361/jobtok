import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { alpha, c } from '../theme';

const PHONE_WIDTH = 412;

// Phones don't show scrollbars; hide the browser's so the frame looks like the real thing.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '* { scrollbar-width: none; } *::-webkit-scrollbar { width: 0; height: 0; }';
  document.head.appendChild(style);
}
const PHONE_MAX_HEIGHT = 915;

/**
 * JobTok is a phone app. In a wide desktop browser, show it in a phone-sized frame so it
 * looks and behaves like it does on a phone. Native apps and narrow windows are untouched.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 600) return <>{children}</>;
  return (
    <View style={styles.backdrop}>
      <View style={[styles.phone, { height: Math.min(PHONE_MAX_HEIGHT, height - 32) }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceContainerLowest,
  },
  phone: {
    width: PHONE_WIDTH,
    overflow: 'hidden',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: alpha(c.outlineVariant, 0.6),
    backgroundColor: c.surface,
  },
});
