// One-time-code entry (Stitch "OTP verification"): six code bubbles fed by an on-screen
// keypad. A hidden input sits over the bubbles so typing, pasting and hardware keyboards
// still work, without the system keyboard covering the keypad.
import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { alpha, brand, c, glow, radii, type } from '../theme';
import { EASE_OUT, spring } from '../theme/motion';
import { Icon } from './primitives';

export interface CodeBoxesHandle {
  /** Shake the bubbles, e.g. after a wrong code. */
  shake(): void;
}

function Digit({ char, active }: { char?: string; active: boolean }) {
  // Each digit lands with a small pop, so every key press is visibly "received".
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!char || reduced) return;
    pop.set(
      withSequence(withTiming(0.86, { duration: 60, easing: EASE_OUT }), withSpring(1, spring.pop)),
    );
  }, [char, pop, reduced]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <Reanimated.View
      style={[
        styles.box,
        char ? styles.boxFilled : null,
        active && [styles.boxActive, glow('secondary')],
        popStyle,
      ]}
    >
      <Text style={[type.headlineMd, { color: c.onSurface }]}>{char ?? ''}</Text>
      <View style={[styles.dot, { backgroundColor: char ? c.secondary : 'transparent' }]} />
    </Reanimated.View>
  );
}

export const CodeBoxes = forwardRef<
  CodeBoxesHandle,
  { value: string; onChange: (v: string) => void; length?: number; onSubmit?: () => void }
>(function CodeBoxes({ value, onChange, length = 6, onSubmit }, ref) {
  const reduced = useReducedMotion();
  const shakeX = useSharedValue(0);

  useImperativeHandle(
    ref,
    () => ({
      shake() {
        // A wrong code: the error haptic lands with the first swing of the shake.
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        if (reduced) return;
        shakeX.set(
          withSequence(...[10, -10, 7, -7, 3, 0].map((x) => withTiming(x, { duration: 55 }))),
        );
      },
    }),
    [reduced, shakeX],
  );
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  return (
    <Reanimated.View style={[styles.row, shakeStyle]}>
      {Array.from({ length }, (_, i) => (
        <Digit key={i} char={value[i]} active={i === Math.min(value.length, length - 1)} />
      ))}
      <TextInput
        accessibilityLabel={`${length}-digit code`}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={length}
        // The on-screen keypad replaces the system keyboard on phones.
        showSoftInputOnFocus={false}
        caretHidden
        autoFocus={Platform.OS === 'web'}
        style={styles.hiddenInput}
      />
    </Reanimated.View>
  );
});

const KEYS = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
] as const;

export function Keypad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.pad} pointerEvents={disabled ? 'none' : 'auto'}>
      {KEYS.map(([d, letters]) => (
        <Key key={d} label={d} onPress={() => onDigit(d)}>
          <Text style={[type.headlineSm, { color: c.onSurface }]}>{d}</Text>
          <Text style={[type.labelSm, styles.letters]}>{letters}</Text>
        </Key>
      ))}
      <View style={styles.key} />
      <Key label="0" onPress={() => onDigit('0')}>
        <Text style={[type.headlineSm, { color: c.onSurface }]}>0</Text>
      </Key>
      <Key label="Delete" onPress={onDelete}>
        <Icon name="backspace" size={22} color={c.onSurfaceVariant} />
      </Key>
    </View>
  );
}

function Key({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.key, styles.keyFace, pressed && styles.keyPressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.82,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  boxFilled: { backgroundColor: c.surfaceContainerHigh },
  boxActive: { borderColor: alpha(c.secondary, 0.8) },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    padding: 8,
    borderRadius: radii.xl,
    backgroundColor: alpha(brand.obsidian, 0.6),
  },
  key: { width: '32%', height: 56 },
  keyFace: {
    borderRadius: radii.md,
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: c.surfaceContainerHighest, transform: [{ scale: 0.96 }] },
  letters: { color: c.outline, fontSize: 9, letterSpacing: 1, lineHeight: 11 },
});
