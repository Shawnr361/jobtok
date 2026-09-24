import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HEADER_BODY_HEIGHT } from '../../components/AppHeader';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Glass, Icon, type IconName } from '../../components/primitives';
import { alpha, c, radii, shadow, type } from '../../theme';

type Section = 'messages' | 'notifications';

const EMPTY: Record<Section, { icon: IconName; title: string; body: string }> = {
  messages: {
    icon: 'chat-bubble',
    title: 'No conversations yet',
    body: 'When you message someone about their work, or they reach out about yours, your chats show up here.',
  },
  notifications: {
    icon: 'notifications',
    title: 'You’re all caught up',
    body: 'New followers, likes, comments and messages will land here.',
  },
};

/** Messages and notifications live together here (one place for everything new). */
export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('messages');
  const empty = EMPTY[section];

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.body,
          {
            paddingTop: HEADER_BODY_HEIGHT + insets.top + 16,
            paddingBottom: DOCK_BODY_HEIGHT + insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.segment} accessibilityRole="tablist">
          <Segment
            label="Messages"
            icon="chat-bubble"
            active={section === 'messages'}
            onPress={() => setSection('messages')}
          />
          <Segment
            label="Notifications"
            icon="notifications"
            active={section === 'notifications'}
            onPress={() => setSection('notifications')}
          />
        </View>

        <View style={styles.center}>
          <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.card, shadow('md')]}>
            <View style={styles.icon}>
              <Icon name={empty.icon} size={28} color={c.secondary} />
            </View>
            <Text style={[type.headlineSm, { color: c.onSurface, textAlign: 'center' }]}>
              {empty.title}
            </Text>
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {empty.body}
            </Text>
          </Glass>
        </View>
      </View>
      <AppHeader title="Inbox" />
    </View>
  );
}

function Segment({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.segmentItem, active && [styles.segmentActive, shadow('md')]]}
    >
      <Icon name={icon} size={16} color={active ? c.primary : c.onSurfaceVariant} />
      <Text style={[type.labelMd, { color: active ? c.primary : c.onSurfaceVariant }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  body: { flex: 1, paddingHorizontal: 16, gap: 16 },
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 16,
    backgroundColor: c.surfaceContainerLowest,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentActive: { backgroundColor: c.surfaceContainerHigh },
  center: { flex: 1, justifyContent: 'center' },
  card: { padding: 24, borderRadius: radii.card, alignItems: 'center', gap: 8 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: alpha(c.secondaryContainer, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
