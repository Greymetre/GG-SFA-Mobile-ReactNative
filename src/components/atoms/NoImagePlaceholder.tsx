import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../utils/Colors';
import AppText from '../AppText/AppText';

type NoImagePlaceholderProps = {
  style?: StyleProp<ViewStyle>;
  label?: string;
};

// Themed "No Image" box shown when a record has no photo (or every URL failed to load).
const NoImagePlaceholder = ({ style, label = 'No Image' }: NoImagePlaceholderProps) => (
  <View style={[styles.container, style]}>
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={2} stroke={colors.gray} strokeWidth={1.5} />
      <Circle cx={9} cy={9.5} r={1.75} stroke={colors.gray} strokeWidth={1.5} />
      <Path
        d="M3.5 17.5 9 12.5l4 3.5 2.5-2 5 4"
        stroke={colors.gray}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    <AppText size={13} color={colors.gray} family="InterMedium">
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.offWHite,
    borderWidth: 1,
    borderColor: '#E8E1CF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
});

export default NoImagePlaceholder;
