// Small holographic gem (Stitch three.js_1, simplified): a faceted violet diamond turning
// inside a cyan wire ring. Used as the icon of the feed's match pill.
import { Animated, Easing, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { useLoop } from './useLoop';

export function SpinningGem({ size = 16 }: { size?: number }) {
  const turn = useLoop(3200, { easing: Easing.inOut(Easing.sin), still: 0.25 });
  const ring = useLoop(6000);
  // Squash horizontally to fake a 3D spin around the vertical axis.
  const scaleX = turn.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.35, 1, 0.35, 1],
  });
  const spin = ring.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Animated.View
        style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: spin }] }}
      >
        <Svg width={size} height={size} viewBox="-12 -12 24 24">
          <Ellipse
            cx={0}
            cy={0}
            rx={11}
            ry={5}
            fill="none"
            stroke="#38BDF8"
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{ position: 'absolute', width: size, height: size, transform: [{ scaleX }] }}
      >
        <Svg width={size} height={size} viewBox="-12 -12 24 24">
          <Defs>
            <LinearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#C084FC" />
              <Stop offset="1" stopColor="#6D28D9" />
            </LinearGradient>
          </Defs>
          <Path d="M0 -9 L7 0 L0 9 L-7 0 Z" fill="url(#gemGrad)" />
          <Path d="M-7 0 L7 0 M0 -9 L0 9" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </View>
  );
}
