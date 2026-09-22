import { colors, fontSizes, fontWeights, radii, spacing } from '@jobtok/tokens';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const theme = colors.dark;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        Job<Text style={styles.logoAccent}>Tok</Text>
      </Text>
      <Text style={styles.tagline}>SHOW ME WHAT YOU CAN DO.</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Phase 1 · Foundation</Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  logo: {
    color: theme.textStrong,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
  },
  logoAccent: {
    color: theme.primaryHover,
  },
  tagline: {
    color: theme.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1.5,
    marginTop: spacing[2],
  },
  badge: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
  },
  badgeText: {
    color: theme.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
});
