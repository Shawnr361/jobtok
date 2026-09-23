// Compact header for pushed screens (Create, talent profile): back, title, more.
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, glass, type } from '../theme';
import { Glass, IconButton } from './primitives';

export const SCREEN_HEADER_HEIGHT = 64; // h-16

export function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <Glass
      tint={glass.header}
      intensity={40}
      style={[styles.bar, { paddingTop: insets.top, height: SCREEN_HEADER_HEIGHT + insets.top }]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <IconButton
            icon="arrow-back"
            label="Go back"
            iconSize={24}
            color={c.onSurfaceVariant}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
          />
          <Text style={[type.headlineSm, styles.title]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <IconButton icon="more-vert" label="More options" color={c.onSurfaceVariant} />
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, paddingHorizontal: 8 },
  row: {
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  title: { color: c.onSurface, letterSpacing: -0.3, flexShrink: 1 },
});
