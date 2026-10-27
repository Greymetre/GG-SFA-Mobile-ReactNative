import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../AppText/AppText';
import AiIcon from '../../assets/svgs/AiIcons';
import { colors } from '../../utils/Colors';

// Height of the floating GearTabBar (bar + half the lifted bubble), which this button sits above
const TAB_BAR_HEIGHT = 68 + 56 / 2;
const GOLD = ['#FFE27A', '#F2B705', '#D99A00'];

/** Floating "Ask AI" button that opens the CRM Assistant chat: a glowing pulse and a shine sweep draw the eye */
const AskAiButton = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Platform.OS === 'ios' ? 14 : insets.bottom + 10;
  const pulse = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(-60)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 160, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(shine, { toValue: -60, duration: 1, useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    shineLoop.start();
    return () => {
      pulseLoop.stop();
      shineLoop.stop();
    };
  }, [pulse, shine]);

  const springTo = (toValue: number) => Animated.spring(press, { toValue, friction: 5, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.wrap, { bottom: tabBarBottom + TAB_BAR_HEIGHT + 12, transform: [{ scale: press }] }]}>
      {/* expanding gold halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
            transform: [{ scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }, { scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
          },
        ]}
      />
      <Pressable
        onPress={() => navigation.navigate('Assistant')}
        onPressIn={() => springTo(0.94)}
        onPressOut={() => springTo(1)}
        accessibilityRole="button"
        accessibilityLabel="Ask AI assistant"
      >
        <View style={styles.inner}>
          <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
            <AiIcon name="sparkle" size={17} color="#1C1C1E" />
          </LinearGradient>
          <AppText size={15} color={colors.white} family="InterBold">Ask AI</AppText>
          <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shine }, { rotate: '20deg' }] }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 18,
    shadowColor: '#D99A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    backgroundColor: '#F2B705',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#F2B705',
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  orb: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  shine: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: 0,
    width: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

export default AskAiButton;
