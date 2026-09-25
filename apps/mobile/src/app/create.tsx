import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../components/ScreenHeader';
import { Glass } from '../components/primitives';
import { TeamRequestForm } from '../features/create/TeamRequestForm';
import { VideoComposer } from '../features/create/VideoComposer';
import { alpha, c, glow, radii, shadow, type } from '../theme';

type Mode = 'work' | 'team';

/**
 * Create: "Show your work" posts a real video (record or choose, preview, details, publish).
 * "Team needed" is planned and clearly marked as coming soon.
 */
export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('work');

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SCREEN_HEADER_HEIGHT + insets.top,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.modeRow}>
          <View style={styles.studio}>
            <View style={[styles.studioDot, glow('secondary')]} />
            <Text style={[type.labelSm, styles.studioText]}>Creator Studio</Text>
          </View>
          <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.toggle}>
            {(['work', 'team'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                style={[styles.toggleItem, mode === m && [styles.toggleActive, shadow('md')]]}
              >
                <Text
                  style={[
                    type.labelSm,
                    { color: mode === m ? c.onPrimaryContainer : c.onSurfaceVariant },
                  ]}
                >
                  {m === 'work' ? 'Show your work' : 'Team needed'}
                </Text>
              </Pressable>
            ))}
          </Glass>
        </View>

        {mode === 'work' ? <VideoComposer /> : <TeamRequestForm />}
      </ScrollView>
      <ScreenHeader title="Create" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  modeRow: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  studioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary },
  studioText: { color: c.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radii.pill },
  toggleItem: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.pill },
  toggleActive: { backgroundColor: c.primaryContainer },
});
