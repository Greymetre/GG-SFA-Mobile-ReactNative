import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AppText from "../AppText/AppText";
import { colors } from "../../utils/Colors";
import { SCREEN_WIDTH } from "../../utils/misc";
import SpinningGear from "./SpinningGear";

const BADGE = 50;
const SHINE_TRAVEL = SCREEN_WIDTH * 0.35;

const TileCard = ({ item, onpress, index = 0 }: any) => {
    const press = useRef(new Animated.Value(1)).current;
    const shine = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Only the card background moves: a soft light sweeps across now and then
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(2500 + index * 400),
                Animated.timing(shine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [index, shine]);

    const bounce = (toValue: number) =>
        Animated.spring(press, { toValue, friction: 6, tension: 160, useNativeDriver: true }).start();

    return (
        <Animated.View style={[styles.wrapper, { transform: [{ scale: press }] }]}>
            <Pressable
                onPress={() => onpress(item)}
                onPressIn={() => bounce(0.96)}
                onPressOut={() => bounce(1)}
                style={styles.card}>
                <LinearGradient
                    colors={["#3A3A3A", "#232323"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {/* Warm light from the bottom-right corner */}
                <LinearGradient
                    colors={["rgba(242,183,5,0)", "rgba(242,183,5,0.16)"]}
                    start={{ x: 0.3, y: 0.3 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {/* Background motion: a slow brand gear at the bottom-left and a soft light sweep */}
                <SpinningGear size={96} teeth={12} color="rgba(255,216,77,0.09)" duration={40000} style={styles.gear} />
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.shine,
                        { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-60, SHINE_TRAVEL] }) }, { rotate: "20deg" }] },
                    ]}
                />

                <AppText size={14} color={colors.white} family="InterSemiBold">
                    {item.title}
                </AppText>
                <View style={styles.accent} />

                <LinearGradient
                    colors={["#FFE680", colors.gold]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBadge}>
                    {item.image ? (
                        // Logo (Gajra Gro+) drawn in charcoal so it matches the line icons
                        <Image source={item.image} resizeMode="contain" style={[styles.logo, { tintColor: colors.blue }]} />
                    ) : item.icon}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: "31%",
        aspectRatio: 0.8,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 5,
    },
    card: {
        flex: 1,
        borderRadius: 14,
        paddingTop: 13,
        paddingHorizontal: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,216,77,0.35)",
    },
    shine: {
        position: "absolute",
        top: -30,
        bottom: -30,
        width: 34,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    gear: {
        left: -34,
        bottom: -34,
    },
    logo: {
        width: BADGE - 6,
        height: (BADGE - 6) * 546 / 1074,
    },
    accent: {
        width: 18,
        height: 3,
        borderRadius: 2,
        marginTop: 6,
        backgroundColor: colors.goldLight,
    },
    iconBadge: {
        position: "absolute",
        right: 10,
        bottom: 10,
        width: BADGE,
        height: BADGE,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default TileCard;
