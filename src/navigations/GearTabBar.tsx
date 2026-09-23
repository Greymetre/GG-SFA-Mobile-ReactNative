import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText/AppText';
import { colors } from '../utils/Colors';
import { SCREEN_WIDTH } from '../utils/misc';
import { useAppSelector } from '../components/redux/Store';

const BAR_WIDTH = SCREEN_WIDTH * 0.9;
const BAR_HEIGHT = 68;
const BUBBLE = 56;
const INACTIVE = '#A6A6A6';

const TabIcon = ({ name, color, size = 24 }: { name: string; color: string; size?: number }) => {
  const stroke = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<string, string> = {
    Home: 'M3.5 10.5L12 3.5l8.5 7V19.5a1 1 0 01-1 1H15v-6H9v6H4.5a1 1 0 01-1-1z',
    Pac: 'M8 4.5H6.5A2.5 2.5 0 004 7v11.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V7a2.5 2.5 0 00-2.5-2.5H16M9 3h6v3H9zM8.5 12.5l2.2 2.2 4.8-4.8',
    Rating: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
    OrderList: 'M4 12a8 8 0 102.4-5.7M3.5 3.5v3.5H7M12 8v4.2l3 1.8',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={paths[name] ?? paths.Home} {...stroke} />
    </Svg>
  );
};

const LABELS: Record<string, string> = {
  Home: 'Home',
  Pac: 'PAC',
  Rating: 'Rating',
  OrderList: 'History',
};

// Floating charcoal bar; the active tab lifts into a gold bubble that springs between tabs
const GearTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { activeBg } = useAppSelector(s => s.auth);
  const tabWidth = BAR_WIDTH / state.routes.length;
  const position = useRef(new Animated.Value(state.index)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(position, { toValue: state.index, friction: 7, tension: 70, useNativeDriver: true }).start();
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, [state.index, position, pop]);

  const activeRoute = state.routes[state.index];
  const bubbleX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabWidth + (tabWidth - BUBBLE) / 2),
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Platform.OS === 'ios' ? 14 : insets.bottom + 10 }]}
    >
      <LinearGradient colors={['#3A3A3A', '#1C1C1C']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bar}>
        {/* Thin gold line along the top edge */}
        <LinearGradient
          colors={['rgba(255,216,77,0)', colors.goldLight, 'rgba(255,216,77,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topLine}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={LABELS[route.name] ?? route.name}
              style={[styles.tab, { width: tabWidth }]}
            >
              {/* The focused icon lives in the bubble, so leave its slot empty */}
              <View style={[styles.iconSlot, focused && styles.iconSlotFocused]}>
                {!focused && <TabIcon name={route.name} color={INACTIVE} />}
              </View>
              <AppText
                size={11}
                family={focused ? 'InterBold' : 'InterMedium'}
                color={focused ? colors.goldLight : INACTIVE}
              >
                {LABELS[route.name] ?? route.name}
              </AppText>
            </Pressable>
          );
        })}
      </LinearGradient>

      {!activeBg && (
        <Animated.View pointerEvents="none" style={[styles.bubbleWrap, { transform: [{ translateX: bubbleX }] }]}>
          <Animated.View style={[styles.bubbleRing, { transform: [{ scale: pop }] }]}>
            <LinearGradient colors={['#FFE27A', colors.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubble}>
              <TabIcon name={activeRoute.name} color={colors.blue} size={24} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: (SCREEN_WIDTH - BAR_WIDTH) / 2,
    width: BAR_WIDTH,
    height: BAR_HEIGHT + BUBBLE / 2,
    justifyContent: 'flex-end',
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 14,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 1.5,
  },
  tab: {
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 3,
  },
  iconSlot: {
    height: 26,
    justifyContent: 'center',
  },
  // Focused icon sits in the bubble, so shrink its slot and lift the label up under the bubble
  iconSlotFocused: {
    height: 6,
  },
  bubbleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    elevation: 16,
  },
  // Ring in the page colour so the bubble looks cut into the bar; the gold disc sits exactly in its centre
  bubbleRing: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: colors.bgColor,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  bubble: {
    width: BUBBLE - 8,
    height: BUBBLE - 8,
    borderRadius: (BUBBLE - 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GearTabBar;
