// Bottom navigation dock from the design: Feed, Explore, raised gradient Create, Inbox, Profile.
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, glass, glow, gradients, type } from '../theme';
import { Glass, Gradient, Icon, type IconName } from './primitives';

export const DOCK_BODY_HEIGHT = 80; // h-20

const TABS: Record<string, { label: string; icon: IconName; dot?: boolean }> = {
  feed: { label: 'Feed', icon: 'smart-display' },
  explore: { label: 'Explore', icon: 'explore' },
  // No unread dot until there are real messages and notifications to count.
  inbox: { label: 'Inbox', icon: 'chat-bubble' },
  // A person icon until profile photos exist (never a sample photo standing in for you).
  profile: { label: 'Profile', icon: 'account-circle' },
};

export function NavDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const tab = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return null;
    const cfg = TABS[routeName]!;
    const focused = state.routes[state.index]?.key === route.key;
    const color = focused ? c.primary : c.onSurfaceVariant;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={cfg.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.item}
      >
        <Icon name={cfg.icon} size={24} color={color} />
        <Text style={[type.labelSm, { color }, focused && styles.bold]}>{cfg.label}</Text>
        {cfg.dot && <View style={styles.dot} pointerEvents="none" />}
      </Pressable>
    );
  };

  return (
    <Glass
      tint={glass.dock}
      intensity={40}
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, height: DOCK_BODY_HEIGHT + insets.bottom },
      ]}
    >
      <View style={styles.row}>
        {tab('feed')}
        {tab('explore')}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a video"
          onPress={() => router.push('/create')}
          style={({ pressed }) => [
            styles.createWrap,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Gradient colors={gradients.ring} diagonal style={[styles.create, glow('create')]}>
            <View style={styles.createInner}>
              <Icon name="add-photo-alternate" size={24} color={c.secondary} />
            </View>
          </Gradient>
        </Pressable>
        {tab('inbox')}
        {tab('profile')}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: glass.hairline,
  },
  row: {
    height: DOCK_BODY_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  item: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bold: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  dot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.secondary,
  },
  createWrap: { marginTop: -20 },
  create: { width: 52, height: 52, borderRadius: 16, padding: 2 },
  createInner: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: c.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
