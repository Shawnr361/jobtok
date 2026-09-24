// Form/auth UI kit in the Cyber-Glass style (DESIGN.md: gradient pill CTAs, ghost buttons,
// frosted inputs with a violet focus glow).
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
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
import { MIN_TOUCH_TARGET, alpha, brand, c, glow, radii, spacing, type } from '../theme';
import { Logo as BrandLogo, LogoMark } from './Logo';
import { Gradient, Icon, type IconName } from './primitives';

/**
 * Auth screen shell. `back` adds a top bar with a back arrow: `true` goes back in history
 * (or to the welcome screen), a function handles it (e.g. stepping back inside a flow).
 */
export function Screen({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: boolean | (() => void);
}) {
  return (
    <SafeAreaView style={styles.safe}>
      {back && <AuthHeader onBack={typeof back === 'function' ? back : undefined} />}
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

function AuthHeader({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const goBack =
    onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/welcome')));
  return (
    <View style={styles.header}>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Icon name="arrow-back-ios-new" size={20} color={c.onSurface} />
      </Pressable>
      <LogoMark size={28} />
      <View style={styles.back} />
    </View>
  );
}

export function Logo() {
  return (
    <View style={{ alignItems: 'center' }}>
      <BrandLogo size={44} fontSize={34} />
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={[type.headlineLgMobile, { color: c.onSurface }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <Text style={[type.bodyLg, { color: muted ? c.onSurfaceVariant : c.onSurface }]}>
      {children}
    </Text>
  );
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
  const content = loading ? (
    <ActivityIndicator color={c.white} />
  ) : (
    <>
      <Text
        style={[
          type.labelLg,
          { color: variant === 'ghost' ? c.secondary : c.white },
          variant === 'primary' && { fontFamily: 'PlusJakartaSans_700Bold' },
        ]}
      >
        {label}
      </Text>
      {variant === 'primary' && <Icon name="arrow-forward" size={18} color={c.white} />}
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        { opacity: inactive ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {variant === 'primary' ? (
        <Gradient
          colors={[brand.violet, brand.blue]}
          style={[styles.button, !inactive && glow('primary')]}
        >
          {content}
        </Gradient>
      ) : (
        <View style={[styles.button, variant === 'secondary' ? styles.secondary : styles.ghost]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  prefix,
  right,
  labelRight,
  onFocus,
  onBlur,
  style,
  ...props
}: TextInputProps & {
  label: string;
  /** Leading icon inside the input. */
  icon?: IconName;
  /** Fixed content before the value, e.g. a country code. */
  prefix?: ReactNode;
  /** Trailing accessory inside the input, e.g. a show-password toggle. */
  right?: ReactNode;
  /** Accessory at the end of the label row, e.g. "Forgot password?". */
  labelRight?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing[1] }}>
      <View style={styles.labelRow}>
        <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{label}</Text>
        {labelRight}
      </View>
      <View style={[styles.input, focused && [styles.inputFocused, glow('primary')]]}>
        {icon && <Icon name={icon} size={20} color={focused ? brand.lavender : c.outline} />}
        {prefix}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.outline}
          style={[type.bodyLg, styles.inputText, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

/** Small uppercase pill above a headline. */
export function Eyebrow({ icon, children }: { icon?: IconName; children: string }) {
  return (
    <View style={styles.eyebrow}>
      {icon && <Icon name={icon} size={14} color={c.secondary} />}
      <Text style={[type.labelSm, { color: c.secondary, letterSpacing: 1.2 }]}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
}

/** Text link styled for auth screens. */
export function TextLink({
  label,
  onPress,
  color = brand.lavender,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      {({ pressed }) => (
        <Text style={[type.labelMd, { color, opacity: pressed ? 0.6 : 1 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** "or continue with" separator. */
export function OrDivider({ label = 'or continue with' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={[type.labelSm, { color: c.outline, letterSpacing: 1.2 }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

/** Option tile used for alternative sign-in methods. */
export function Tile({
  label,
  icon,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.tile,
        { opacity: inactive ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={c.white} /> : icon}
      <Text style={[type.labelMd, { color: c.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

/** Positive confirmation message (e.g. "we sent you a link"). */
export function SuccessText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.success} accessibilityLiveRegion="polite">
      <Icon name="check-circle" size={18} color={brand.success} />
      <Text style={[type.bodySm, { color: c.onSurface, flexShrink: 1 }]}>{message}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text
      style={[type.bodySm, { color: c.error }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {message}
    </Text>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.notice}>
      <Icon name="info-outline" size={16} color={brand.alert} />
      <Text style={[type.bodySm, { color: brand.alert, flexShrink: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  scroll: { flexGrow: 1, padding: spacing[6], gap: spacing[4], justifyContent: 'center' },
  button: {
    minHeight: MIN_TOUCH_TARGET + 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing[6],
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ghost: { backgroundColor: 'transparent', minHeight: MIN_TOUCH_TARGET },
  input: {
    minHeight: MIN_TOUCH_TARGET + 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  inputText: {
    flex: 1,
    alignSelf: 'stretch',
    color: c.onSurface,
    paddingVertical: 0,
    // Web: drop the browser focus ring; the container shows focus instead.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: alpha(c.secondary, 0.3),
    backgroundColor: alpha(c.secondary, 0.08),
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rule: { flex: 1, height: 1, backgroundColor: c.outlineVariant },
  tile: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: c.surfaceContainer,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: alpha(brand.success, 0.45),
    padding: spacing[3],
    backgroundColor: alpha(brand.success, 0.08),
  },
  inputFocused: { borderColor: brand.violet },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: alpha(brand.alert, 0.5),
    padding: spacing[3],
    backgroundColor: alpha(brand.alert, 0.08),
  },
});
