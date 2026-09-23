import { MIN_TOUCH_TARGET, colors, fontSizes, fontWeights, radii, spacing } from '@jobtok/tokens';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const theme = colors.dark;

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Logo() {
  return (
    <Text style={styles.logo} accessibilityRole="header">
      Job<Text style={{ color: theme.primaryHover }}>Tok</Text>
    </Text>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: theme.textMuted }]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: theme.primary },
        variant === 'secondary' && {
          backgroundColor: theme.surfaceRaised,
          borderColor: theme.border,
          borderWidth: 1,
        },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (pressed || inactive) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.onPrimary} />
      ) : (
        <Text style={[styles.buttonText, variant === 'ghost' && { color: theme.secondaryHover }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSubtle}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, padding: spacing[6], gap: spacing[4], justifyContent: 'center' },
  logo: {
    color: theme.textStrong,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
  title: { color: theme.textStrong, fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold },
  body: { color: theme.text, fontSize: fontSizes.md, lineHeight: 22 },
  label: { color: theme.textMuted, fontSize: fontSizes.sm, fontWeight: fontWeights.medium },
  input: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    color: theme.textStrong,
    paddingHorizontal: spacing[4],
    fontSize: fontSizes.md,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  buttonText: { color: theme.onPrimary, fontSize: fontSizes.md, fontWeight: fontWeights.semibold },
  error: { color: theme.danger, fontSize: fontSizes.sm },
  notice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.warning,
    padding: spacing[3],
    backgroundColor: theme.surface,
  },
  noticeText: { color: theme.warning, fontSize: fontSizes.sm },
});
