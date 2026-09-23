// JobTok logo, recreated from the design's SVG (play mark with a cyan "live" dot + wordmark).
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text, View } from 'react-native';
import { brand, fonts } from '../theme';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" accessibilityLabel="JobTok logo">
      <Defs>
        <LinearGradient id="jtGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.violet} />
          <Stop offset="0.5" stopColor={brand.indigo} />
          <Stop offset="1" stopColor={brand.blue} />
        </LinearGradient>
      </Defs>
      <Rect width={36} height={36} rx={10} fill="url(#jtGrad)" />
      <Path d="M14 12L26 20L14 28V12Z" fill="#FFFFFF" />
      <Circle cx={27} cy={13} r={3.5} fill={brand.sky} />
    </Svg>
  );
}

/** Mark + "JobTok" wordmark ("Tok" in lavender). */
export function Logo({ size = 32, fontSize = 22 }: { size?: number; fontSize?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LogoMark size={size} />
      <Text
        style={{ fontFamily: fonts.display, fontSize, color: '#FFFFFF', letterSpacing: -0.5 }}
        accessibilityRole="header"
      >
        Job<Text style={{ color: brand.lavender }}>Tok</Text>
      </Text>
    </View>
  );
}
