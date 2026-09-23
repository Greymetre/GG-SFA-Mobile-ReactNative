import { View, StyleSheet, Animated, Easing, StatusBar } from 'react-native'
import React, { useEffect, useRef } from 'react'
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import SpinningGear from '../../components/atoms/SpinningGear';
import { colors } from '../../utils/Colors';
import AppText from '../../components/AppText/AppText';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/misc';

const CARD_SIZE = 176;
const LOGO_SIZE = 118;
const ORBIT_SIZE = CARD_SIZE + 44;
const TITLE = 'GAJRA GEARS';
const PROGRESS_WIDTH = 150;
const INK = '#2B2B2B';
const GOLD = '#F2B705';

const SplashScreen = () => {
  const cardIn = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const letters = useRef(TITLE.split('').map(() => new Animated.Value(0))).current;
  const taglineIn = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const footerIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const orbitLoop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    orbitLoop.start();

    // Timeline fits inside the 2 s splash: card -> shine + title letters -> tagline -> footer
    Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(cardIn, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(shine, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.stagger(40, letters.map(value =>
            Animated.spring(value, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          )),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(950),
        Animated.timing(taglineIn, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1150),
        Animated.timing(footerIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    return () => orbitLoop.stop();
  }, [cardIn, orbit, shine, letters, taglineIn, progress, footerIn]);

  const orbitRotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#FFC928', '#FFE27A', '#FFF6D6', '#FFFFFF']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Meshing gears in the corners */}
      <SpinningGear size={SCREEN_WIDTH * 0.95} teeth={16} color="rgba(255,255,255,0.35)" duration={24000}
        style={{ top: -SCREEN_WIDTH * 0.42, right: -SCREEN_WIDTH * 0.38 }} />
      <SpinningGear size={SCREEN_WIDTH * 0.5} teeth={10} color="rgba(242,183,5,0.22)" duration={14000} reverse
        style={{ top: SCREEN_WIDTH * 0.3, right: SCREEN_WIDTH * 0.32 }} />
      <SpinningGear size={SCREEN_WIDTH * 0.8} teeth={14} color="rgba(242,183,5,0.12)" duration={20000} reverse
        style={{ bottom: -SCREEN_WIDTH * 0.36, left: -SCREEN_WIDTH * 0.34 }} />

      {/* Diagonal light beam */}
      <View style={styles.beam} />

      <View style={styles.center}>
        <View style={styles.logoArea}>
          {/* Dashed orbit with a travelling dot */}
          <Animated.View style={[styles.orbit, { opacity: cardIn, transform: [{ rotate: orbitRotate }] }]}>
            <Svg width={ORBIT_SIZE} height={ORBIT_SIZE}>
              <Circle cx={ORBIT_SIZE / 2} cy={ORBIT_SIZE / 2} r={ORBIT_SIZE / 2 - 6} stroke={INK} strokeOpacity={0.25}
                strokeWidth={1.5} strokeDasharray="4 8" fill="none" />
              <Circle cx={ORBIT_SIZE / 2} cy={6} r={6} fill={INK} />
              <Circle cx={ORBIT_SIZE / 2} cy={ORBIT_SIZE - 6} r={4} fill={GOLD} />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.cardShadow,
              {
                opacity: cardIn.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_HEIGHT * 0.25, 0] }) },
                  { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.card}>
              <Animated.Image
                source={require('../../assets/images/GajraLogo.png')}
                resizeMode="contain"
                style={[
                  styles.gajraLogo,
                  { transform: [{ rotate: cardIn.interpolate({ inputRange: [0, 1], outputRange: ['-270deg', '0deg'] }) }] },
                ]}
              />
              {/* Glossy sweep across the card */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shine,
                  {
                    opacity: shine.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.8, 0] }),
                    transform: [
                      { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-CARD_SIZE, CARD_SIZE] }) },
                      { rotate: '20deg' },
                    ],
                  },
                ]}
              />
            </View>
          </Animated.View>
        </View>

        {/* Title: letters bounce up one by one */}
        <View style={styles.titleRow}>
          {TITLE.split('').map((letter, index) => (
            <Animated.View
              key={index}
              style={{
                opacity: letters[index],
                transform: [{ translateY: letters[index].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
              }}
            >
              <AppText size={28} color={INK} family="InterBlack" style={styles.letter}>
                {letter === ' ' ? ' ' : letter}
              </AppText>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          style={[
            styles.taglineRow,
            {
              opacity: taglineIn,
              transform: [{ scaleX: taglineIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        >
          <View style={styles.taglineLine} />
          <AppText size={11} color="#5c5c5c" family="InterSemiBold" style={styles.tagline}>
            SALES FORCE AUTOMATION
          </AppText>
          <View style={styles.taglineLine} />
        </Animated.View>

        {/* Loading bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-PROGRESS_WIDTH, 0] }) }] },
            ]}
          >
            <LinearGradient colors={[GOLD, INK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: footerIn,
            transform: [{ translateY: footerIn.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          },
        ]}
      >
        <View style={styles.poweredPill}>
          <AppText size={10} color="#7a7a7a" family="InterMedium" style={styles.poweredText}>
            POWERED BY
          </AppText>
          <Animated.Image
            source={require('../../assets/images/FieldKonnectLogo.png')}
            resizeMode="contain"
            // The FieldKonnect logo is white; tint it so it shows on the light background
            style={[styles.fieldKonnectLogo, { tintColor: colors.blue }]}
          />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  beam: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.2,
    left: SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_HEIGHT * 1.4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '-28deg' }],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SCREEN_HEIGHT * 0.06,
  },
  logoArea: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbit: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
  },
  cardShadow: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 14,
  },
  // Separate from the shadow wrapper: overflow hidden would clip the iOS shadow
  card: {
    flex: 1,
    borderRadius: CARD_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: 'rgba(255, 216, 77, 0.55)',
  },
  gajraLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  shine: {
    position: 'absolute',
    top: -CARD_SIZE * 0.2,
    width: CARD_SIZE * 0.22,
    height: CARD_SIZE * 1.4,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  titleRow: {
    flexDirection: 'row',
    marginTop: 30,
  },
  letter: {
    letterSpacing: 2,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  taglineLine: {
    width: 22,
    height: 1.5,
    backgroundColor: GOLD,
  },
  tagline: {
    letterSpacing: 3,
    marginHorizontal: 10,
  },
  progressTrack: {
    width: PROGRESS_WIDTH,
    height: 4,
    borderRadius: 2,
    marginTop: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(43,43,43,0.1)',
  },
  progressFill: {
    width: PROGRESS_WIDTH,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.06,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  poweredPill: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  poweredText: {
    letterSpacing: 2.5,
  },
  fieldKonnectLogo: {
    width: SCREEN_WIDTH * 0.42,
    height: (SCREEN_WIDTH * 0.42 * 512) / 2648,
    marginTop: 6,
  },
});

export default SplashScreen
