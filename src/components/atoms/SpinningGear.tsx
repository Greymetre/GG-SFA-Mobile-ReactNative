import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Gear outline (teeth + centre hole) as an SVG path, drawn in a size x size box
export const gearPath = (size: number, teeth: number) => {
  const c = size / 2;
  const outer = size / 2;
  const inner = size * 0.4;
  const hole = size * 0.16;
  const step = (Math.PI * 2) / teeth;
  const point = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;

  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i === 0 ? 'M' : 'L'} ${point(inner, a - step * 0.27)} `;
    d += `L ${point(outer, a - step * 0.15)} L ${point(outer, a + step * 0.15)} L ${point(inner, a + step * 0.27)} `;
    d += `A ${inner} ${inner} 0 0 1 ${point(inner, a + step * 0.73)} `;
  }
  d += 'Z ';
  d += `M ${c + hole} ${c} A ${hole} ${hole} 0 1 0 ${c - hole} ${c} A ${hole} ${hole} 0 1 0 ${c + hole} ${c} Z`;
  return d;
};

// Decorative background gear that turns forever
const SpinningGear = ({ size, teeth, color, duration, reverse, style }: {
  size: number; teeth: number; color: string; duration: number; reverse?: boolean; style?: StyleProp<ViewStyle>;
}) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [duration, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }, style]}>
      <Svg width={size} height={size}>
        <Path d={gearPath(size, teeth)} fill={color} fillRule="evenodd" />
      </Svg>
    </Animated.View>
  );
};

export default SpinningGear;
