// Simple frosted title bar for the tab screens (Explore, Inbox, Profile).
// No logo, search, bell or avatar here: search lives in Explore, notifications in Inbox and
// your profile in the nav dock, so each action appears exactly once.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, glass, type } from '../theme';
import { Glass } from './primitives';

export const HEADER_BODY_HEIGHT = 56;

export function AppHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Glass
      tint={glass.header}
      intensity={40}
      style={[styles.bar, { paddingTop: insets.top, height: HEADER_BODY_HEIGHT + insets.top }]}
    >
      <View style={styles.row}>
        <Text style={[type.headlineMd, styles.title]} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glass.hairline,
  },
  row: {
    height: HEADER_BODY_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
});
