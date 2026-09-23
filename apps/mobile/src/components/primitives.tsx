// Small building blocks shared by the Cyber-Glass screens.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { c, glow, radii, type } from '../theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Material icon (the design uses Material Symbols; these are the matching Material Icons). */
export function Icon({
  name,
  size = 20,
  color = c.onSurface,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}

/** Frosted glass surface: a blur with a tinted fill (the tint keeps contrast where blur is unavailable). */
export function Glass({
  children,
  style,
  tint = 'rgba(35, 42, 58, 0.70)',
  intensity = 30,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  intensity?: number;
}) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}

/** Media that fills its parent (object-fit: cover), e.g. a video poster behind overlays. */
export function Cover({ source }: { source: ImageSourcePropType }) {
  return (
    <Image source={source} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.cover]} />
  );
}

/** Horizontal gradient fill. */
export function Gradient({
  colors,
  style,
  children,
  diagonal,
}: {
  colors: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Bottom-left → top-right (Tailwind `bg-gradient-to-tr`). */
  diagonal?: boolean;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={diagonal ? { x: 0, y: 1 } : { x: 0, y: 0.5 }}
      end={diagonal ? { x: 1, y: 0 } : { x: 1, y: 0.5 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

/** Vertical scrim (top or bottom fade) over media. */
export function Scrim({
  from,
  height,
  position,
  stops,
}: {
  from: string;
  height: number | `${number}%`;
  position: 'top' | 'bottom';
  stops?: readonly [string, string, ...string[]];
}) {
  const colors = stops ?? ([from, 'transparent'] as const);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      start={{ x: 0.5, y: position === 'top' ? 0 : 1 }}
      end={{ x: 0.5, y: position === 'top' ? 1 : 0 }}
      style={[
        { position: 'absolute', left: 0, right: 0 },
        position === 'top' ? { top: 0 } : { bottom: 0 },
        { height },
      ]}
    />
  );
}

/** Pulsing status dot (Tailwind `animate-pulse`). */
export function PulseDot({ color = c.secondary, size = 8 }: { color?: string; size?: number }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

/** Continuous rotation (the vinyl sound disc / music note). */
export function Spin({ children, duration = 6000 }: { children: ReactNode; duration?: number }) {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn, duration]);
  const rotate = useMemo(
    () => turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    [turn],
  );
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** Pill chip used for categories, filters and badges. */
export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
  textStyle,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const body = (
    <View
      style={[styles.chip, active ? [styles.chipActive, glow('primary')] : styles.chipIdle, style]}
    >
      {icon && <Icon name={icon} size={12} color={active ? c.onPrimary : c.onSurfaceVariant} />}
      <Text style={[type.labelMd, { color: active ? c.onPrimary : c.onSurfaceVariant }, textStyle]}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      hitSlop={4}
    >
      {body}
    </Pressable>
  );
}

/** Round icon button with a translucent fill. */
export function IconButton({
  icon,
  onPress,
  size = 44,
  iconSize = 20,
  color = c.onSurface,
  background = 'transparent',
  label,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  chipActive: { backgroundColor: c.primaryContainer },
  chipIdle: { backgroundColor: c.surfaceContainer },
  cover: { width: '100%', height: '100%' },
});
