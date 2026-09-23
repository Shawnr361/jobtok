// Form/auth UI kit in the Cyber-Glass style (DESIGN.md: gradient pill CTAs, ghost buttons,
// frosted inputs with a violet focus glow).
import { useState } from 'react';
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
import { Logo as BrandLogo } from './Logo';
import { Gradient, Icon } from './primitives';

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

export function Field({ label, onFocus, onBlur, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.outline}
        style={[type.bodyLg, styles.input, focused && [styles.inputFocused, glow('primary')]]}
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
    color: c.onSurface,
    paddingHorizontal: spacing[4],
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
