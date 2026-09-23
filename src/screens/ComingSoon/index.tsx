import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText/AppText';
import SpinningGear from '../../components/atoms/SpinningGear';
import { brandGradient, colors } from '../../utils/Colors';
import { SCREEN_WIDTH } from '../../utils/misc';

// Placeholder for bottom-bar tabs whose content is not built yet (PAC, Rating)
const ComingSoon = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.screen}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <View style={styles.header}>
      <LinearGradient {...brandGradient} style={StyleSheet.absoluteFill} />
      <SpinningGear size={140} teeth={12} color="rgba(255,255,255,0.4)" duration={20000} style={styles.headerGear} />
      <SafeAreaView edges={['top']}>
        <AppText size={22} family="InterBold" color={colors.blue} style={styles.headerTitle}>{title}</AppText>
      </SafeAreaView>
    </View>

    <View style={styles.body}>
      <View style={styles.gearWrap}>
        <SpinningGear size={120} teeth={12} color={colors.goldLight} duration={9000} style={styles.bigGear} />
        <SpinningGear size={64} teeth={9} color="rgba(43,43,43,0.85)" duration={6000} reverse style={styles.smallGear} />
      </View>
      <AppText size={20} family="InterBold" color={colors.blue} align="center">Coming Soon</AppText>
      <AppText size={14} family="InterRegular" color="#6B6B6B" align="center" style={styles.subtitle}>
        {subtitle || `${title} is being built and will be available in an upcoming update.`}
      </AppText>
    </View>
  </View>
);

export const PacScreen = () => <ComingSoon title="PAC" />;
export const RatingScreen = () => <ComingSoon title="Rating" />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  header: {
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.goldLight,
    paddingBottom: 18,
  },
  headerGear: { top: -45, right: -35 },
  headerTitle: { marginTop: 14, marginHorizontal: 20 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 120 },
  gearWrap: { width: SCREEN_WIDTH * 0.5, height: 150, marginBottom: 22 },
  bigGear: { left: 10, top: 0 },
  smallGear: { left: 118, top: 74 },
  subtitle: { marginTop: 8, lineHeight: 20 },
});

export default ComingSoon;
