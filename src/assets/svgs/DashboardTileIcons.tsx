import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Duotone dashboard tile icons: white filled body + charcoal outline on the same 24 grid,
// so every tile icon has the same weight and size.
const INK = '#2B2B2B';
const FILL = 'rgba(255,255,255,0.9)';
const line = { stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

type IconProps = { size?: number };

export const TileTourPlanIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3} y={4.5} width={18} height={16} rx={3} fill={FILL} {...line} />
    <Path d="M3 7.5a3 3 0 013-3h12a3 3 0 013 3v2H3z" fill={INK} />
    <Path d="M8 2.5v4M16 2.5v4" {...line} />
    <Path d="M12 18.6s-3-2.6-3-4.7a3 3 0 016 0c0 2.1-3 4.7-3 4.7z" fill="#F2B705" {...line} />
    <Circle cx={12} cy={13.9} r={1} fill={INK} />
  </Svg>
);

export const TileAddCustomerIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={10} cy={7.5} r={4} fill={FILL} {...line} />
    <Path d="M2.5 20.5c0-3.8 3.3-6.3 7.5-6.3s7.5 2.5 7.5 6.3z" fill={FILL} {...line} />
    <Circle cx={18.5} cy={16.5} r={4} fill={INK} />
    <Path d="M18.5 14.6v3.8M16.6 16.5h3.8" stroke="#FFD84D" strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const TileCustomersIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={16} cy={7.5} r={3} fill={INK} />
    <Path d="M13 19.5c.3-3.3 2.6-5.3 5-5.3s4.4 2 4.5 5.3z" fill={INK} />
    <Circle cx={9} cy={8} r={3.6} fill={FILL} {...line} />
    <Path d="M2 20.5c0-3.6 3-6 7-6s7 2.4 7 6z" fill={FILL} {...line} />
  </Svg>
);

export const TileAdhocOrderIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M2.5 3.5h2.3l.6 3" {...line} fill="none" />
    <Path d="M5.4 6.5h15.4l-1.9 7.9a1.5 1.5 0 01-1.5 1.1H8.6a1.5 1.5 0 01-1.5-1.2z" fill={FILL} {...line} />
    <Circle cx={9.5} cy={19.6} r={1.6} fill={INK} />
    <Circle cx={17} cy={19.6} r={1.6} fill={INK} />
    <Path d="M13 8.6v4.4M10.8 10.8h4.4" {...line} />
  </Svg>
);

export const TileExpensesIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5.5 2.5h13v19l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5z" fill={FILL} {...line} />
    <Circle cx={12} cy={10.5} r={4.8} fill={INK} />
    <Path d="M10.2 8.3h3.6M10.2 10h3.6M11.4 8.3c1.2 0 1.8.6 1.8 1.7s-.7 1.7-1.8 1.7h-1.2l2.6 2.4" stroke="#FFD84D" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const TileBeatIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9.5 20.5h6a2.5 2.5 0 002.5-2.5v-4" {...line} fill="none" strokeDasharray="1.8 2.2" />
    <Path d="M6 21s-3.5-3.1-3.5-6a3.5 3.5 0 017 0c0 2.9-3.5 6-3.5 6z" fill={FILL} {...line} />
    <Circle cx={6} cy={15} r={1.2} fill={INK} />
    <Path d="M18 12s-4-3.5-4-6.8a4 4 0 018 0C22 8.5 18 12 18 12z" fill={INK} />
    <Circle cx={18} cy={5.3} r={1.5} fill="#FFD84D" />
  </Svg>
);

