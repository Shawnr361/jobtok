import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { CSS_EASE_OUT, duration } from '../../theme/motion';

/**
 * Press feedback for anything button-like: it gives on press-in (not on release, which feels
 * dead) and springs back on release. A Reanimated CSS transition on transform, 120 ms, so it
 * runs on the UI thread. `style` goes on the animated body.
 */
export function PressScale({
  children,
  style,
  containerStyle,
  to = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout for the touch area itself (e.g. flex: 1 in a row). */
  containerStyle?: StyleProp<ViewStyle>;
  /** How far it squeezes (1 = not at all). Keep 0.95–0.97. */
  to?: number;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      pressRetentionOffset={16}
      {...props}
      style={containerStyle}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      <Reanimated.View
        style={[
          style,
          {
            transform: [{ scale: pressed ? to : 1 }],
            transitionProperty: 'transform',
            transitionDuration: duration.press,
            transitionTimingFunction: CSS_EASE_OUT,
          },
        ]}
      >
        {children}
      </Reanimated.View>
    </Pressable>
  );
}
