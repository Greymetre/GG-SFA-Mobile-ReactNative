import { View, StyleSheet, Pressable, StatusBar } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { brandGradient, colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';
import { BackIcon } from '../../assets/svgs/SvgsFile';
import AppText from '../AppText/AppText';
import { getHeaderTitle } from '@react-navigation/elements';
import SpinningGear from '../atoms/SpinningGear';

const CustomHeader = ({ navigation, route, options }: any) => {
  const title = getHeaderTitle(options, route.name);
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={"dark-content"}
      />
      <LinearGradient {...brandGradient} style={StyleSheet.absoluteFill} />
      {/* Brand gear peeking in from the right */}
      <SpinningGear size={120} teeth={12} color="rgba(255,255,255,0.4)" duration={20000} style={styles.gear} />
      <SafeAreaView edges={['top']}>
        <View style={[styles.mainView, styles.row]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <BackIcon color={colors.blue} />
          </Pressable>
          <View style={styles.titleView}>
            <AppText size={18} color={colors.blue} family='InterSemiBold' numLines={1}>{title}</AppText>
          </View>
          {options.headerRight ? <View style={styles.rightView}>{options.headerRight({})}</View> : null}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: colors.goldLight,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  gear: {
    top: -40,
    right: -30,
  },
  mainView: {
    height: 64,
    width: "100%",
    paddingHorizontal: rw(16),
  },
  row: {
    flexDirection: 'row',
    alignItems: "center"
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleView: {
    paddingLeft: rw(12),
    flex: 1
  },
  rightView: { marginLeft: 12 },
});

export default CustomHeader
