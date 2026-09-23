import { View, TextInput, Pressable, ActivityIndicator, Platform, StyleSheet, Animated, Easing, StatusBar } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { Formik } from 'formik';
import * as Yup from 'yup';

import { styles } from './styles';
import AppText from '../../components/AppText/AppText';
import { useDispatch } from 'react-redux';
import { useMutateLogin } from '../../api/query/AuthAPI';
import { setToken, setUser } from '../../components/redux/slice/AuthSlice';
import ICEyeOff from '../../assets/svgs/eye-off';
import ICEye from '../../assets/svgs/eye';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { initializeLiveLocationTracking } from '../../services/liveLocationService';
import { APP_BUILD_NUMBER, APP_VERSION } from '../../utils/appVersion';
import { getDeviceName, getUniqueDeviceId } from '../../utils/deviceIdentity';
import { getFcmToken } from '../../utils/firebaseMessaging';
import SpinningGear from '../../components/atoms/SpinningGear';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/misc';

// Gajra brand colours (same gradient as the splash screen)
const INK = '#2B2B2B';
const GOLD = '#F2B705';

type LoginFormValues = {
  email: string;
  password: string;
};


// Small sparkle that floats up through the header and fades, forever
const FloatingDot = ({ left, size, delay, duration, color }: {
  left: number; size: number; delay: number; duration: number; color: string;
}) => {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, rise]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        loginStyles.dot,
        {
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: rise.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_HEIGHT * 0.3] }) },
            { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) },
          ],
        },
      ]}
    />
  );
};

const SPARKLES = [
  { left: SCREEN_WIDTH * 0.08, size: 8, delay: 0, duration: 3600, color: 'rgba(255,255,255,0.9)' },
  { left: SCREEN_WIDTH * 0.22, size: 5, delay: 900, duration: 3000, color: GOLD },
  { left: SCREEN_WIDTH * 0.4, size: 6, delay: 1800, duration: 4000, color: 'rgba(255,255,255,0.9)' },
  { left: SCREEN_WIDTH * 0.6, size: 9, delay: 400, duration: 4200, color: 'rgba(242,183,5,0.6)' },
  { left: SCREEN_WIDTH * 0.76, size: 5, delay: 1300, duration: 3300, color: 'rgba(255,255,255,0.9)' },
  { left: SCREEN_WIDTH * 0.9, size: 7, delay: 2200, duration: 3800, color: GOLD },
];

// Input box whose border glows gold and lifts slightly while focused
const FocusField = ({ children, focused }: { children: React.ReactNode; focused: boolean }) => {
  const focus = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focus, { toValue: focused ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [focused, focus]);

  return (
    <Animated.View
      style={[
        loginStyles.field,
        {
          borderColor: focus.interpolate({ inputRange: [0, 1], outputRange: ['#CBD5E0', GOLD] }),
          shadowOpacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
          elevation: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch();
  const { mutateAsync: mutateLogin } = useMutateLogin();
  const [_serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // ← new state
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // Entrance: FieldKonnect logo -> Gajra pill -> white sheet -> form rows one by one
  const logoIn = useRef(new Animated.Value(0)).current;
  const pillIn = useRef(new Animated.Value(0)).current;
  const sheetIn = useRef(new Animated.Value(0)).current;
  const rowsIn = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  // Loops: gear turning, pulse around the badge, shine across the button
  const gearSpin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const buttonShine = useRef(new Animated.Value(0)).current;
  const buttonPress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoIn, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(pillIn, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        Animated.spring(sheetIn, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.sequence([
      Animated.delay(550),
      Animated.stagger(90, rowsIn.map(value =>
        Animated.spring(value, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      )),
    ]).start();

    const loops = [
      Animated.loop(Animated.timing(gearSpin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })),
      Animated.loop(
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(buttonShine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(buttonShine, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [logoIn, pillIn, sheetIn, rowsIn, gearSpin, pulse, buttonShine]);

  const pressButton = (toValue: number) =>
    Animated.spring(buttonPress, { toValue, friction: 5, tension: 120, useNativeDriver: true }).start();

  // Fade + rise for the n-th form row
  const rowStyle = (index: number) => ({
    opacity: rowsIn[index],
    transform: [{ translateY: rowsIn[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email('Please enter a valid email')
      .required('Email is required'),
    password: Yup.string()
      .required('Password is required')
      .min(6, 'Password must be at least 6 characters'),
  });

  const initialValues: LoginFormValues = {
    email: '',
    password: '',
  };

  const handleLogin = async (
    values: LoginFormValues,
    { setSubmitting, resetForm }: any
  ) => {
    setServerError(null);
    setSubmitting(true);

    try {
      const fcmToken = await getFcmToken();
      const params = {
        username: values.email.trim(),
        password: values.password,
        app_version: APP_VERSION,
        build_number: APP_BUILD_NUMBER,
        device_name: getDeviceName(),
        device_type: Platform.OS,
        unique_id: getUniqueDeviceId(),
        fcm_token: fcmToken ?? undefined,
      };

      const res = await mutateLogin(params);

      // The API client already displays HTTP 400 messages. Stop here so a
      // device-login restriction is not replaced by a generic login error.
      if (typeof res === 'string') {
        setServerError(res);
        return;
      }

      if (res?.data?.status === 'success') {
        dispatch(setUser(res?.data?.userinfo));
        Toast.show({ type: 'success', text1: res?.data?.message || 'Login successful', visibilityTime: 5000 });

        dispatch(setToken(res?.data?.userinfo?.access_token));
        void initializeLiveLocationTracking().catch(error => {
          console.warn('Live location initialization failed:', error);
        });
        resetForm();
        navigation.replace('BottomTab');
      } else {
        Toast.show({ type: 'error', text1: res?.data?.message || 'Login failed', visibilityTime: 5000 });

        setServerError(res?.data?.message || 'Login failed');
      }
    } catch (error: any) {
      console.log('Login error:', error);
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Login failed', visibilityTime: 5000 });

      setServerError(
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.'
      );
      if (error?.response?.data?.message == "Account deactivated. Contact admin.") {
        navigation.replace('AccountPendingScreen')
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={loginStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#FFC928', '#FFE27A', '#FFF6D6', '#FFFFFF']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SpinningGear size={SCREEN_WIDTH * 0.7} teeth={14} color="rgba(255,255,255,0.35)" duration={24000}
        style={{ top: -SCREEN_WIDTH * 0.3, right: -SCREEN_WIDTH * 0.28 }} />
      <SpinningGear size={SCREEN_WIDTH * 0.42} teeth={10} color="rgba(242,183,5,0.2)" duration={16000} reverse
        style={{ top: SCREEN_HEIGHT * 0.2, left: -SCREEN_WIDTH * 0.2 }} />
      <SpinningGear size={SCREEN_WIDTH * 0.22} teeth={8} color="rgba(255,255,255,0.45)" duration={9000}
        style={{ top: SCREEN_HEIGHT * 0.07, left: SCREEN_WIDTH * 0.06 }} />
      {SPARKLES.map((sparkle, index) => (
        <FloatingDot key={index} {...sparkle} />
      ))}
      <KeyboardAwareScrollView
        contentContainerStyle={loginStyles.scrollContent}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bottomOffset={50}
      >
        <View style={loginStyles.header}>
          <Animated.Image
            // The FieldKonnect logo is white; tint it dark so it shows on the yellow gradient
            style={[
              loginStyles.fieldKonnectLogo,
              {
                tintColor: INK,
                opacity: logoIn,
                transform: [
                  { translateY: logoIn.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
                  { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}
            resizeMode="contain"
            source={require('../../assets/images/FieldKonnectLogo.png')}
          />
          <Animated.View
            style={[
              loginStyles.brandRow,
              {
                opacity: pillIn,
                transform: [
                  { translateX: pillIn.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH * 0.6, 0] }) },
                ],
              },
            ]}
          >
            <View style={loginStyles.badgeArea}>
              <Animated.View
                style={[
                  loginStyles.badgePulse,
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                  },
                ]}
              />
              <View style={loginStyles.gajraBadge}>
                <Animated.Image
                  source={require('../../assets/images/GajraLogo.png')}
                  resizeMode="contain"
                  style={[
                    loginStyles.gajraLogo,
                    {
                      transform: [
                        { rotate: pillIn.interpolate({ inputRange: [0, 1], outputRange: ['-360deg', '0deg'] }) },
                        { rotate: gearSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
            <View style={loginStyles.brandText}>
              <AppText size={18} color={INK} family="InterBlack" style={loginStyles.brandName}>
                GAJRA GEARS
              </AppText>
              <View style={loginStyles.taglineRow}>
                <View style={loginStyles.taglineLine} />
                <AppText size={9} color="#5c5c5c" family="InterSemiBold" style={loginStyles.tagline}>
                  SALES FORCE AUTOMATION
                </AppText>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.subContainer,
            loginStyles.sheet,
            { transform: [{ translateY: sheetIn.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.5, 0] }) }] },
          ]}
        >
          <View style={loginStyles.sheetHandle} />
          <Animated.View style={rowStyle(0)}>
            <AppText color="#111111" family="InterSemiBold" align="center" size={24}>
              Welcome Back 👋
            </AppText>
            <View style={{ height: 7 }} />
            <AppText color="#515151" family="InterLight" align="center" size={16}>
              Please sign in to continue our app
            </AppText>
          </Animated.View>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleLogin}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isSubmitting,
              isValid,
            }) => (
              <View style={styles.inputCollectionView}>
                {/* Email */}
                <Animated.View style={rowStyle(1)}>
                  <FocusField focused={focusedField === 'email'}>
                    <TextInput
                      style={[styles.input, loginStyles.inputInField]}
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onFocus={() => setFocusedField('email')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        handleBlur('email')(e);
                      }}
                      placeholder="Enter Email"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </FocusField>

                  {touched.email && errors.email && (
                    <AppText color="#BE0B0B" family="InterRegular" size={12}>
                      {errors.email}
                    </AppText>
                  )}
                </Animated.View>

                {/* Password + Eye icon container */}
                <Animated.View style={[{ marginTop: 16 }, rowStyle(2)]}>
                  <FocusField focused={focusedField === 'password'}>
                    <TextInput
                      style={[styles.input, loginStyles.inputInField, loginStyles.passwordInput]}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onFocus={() => setFocusedField('password')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        handleBlur('password')(e);
                      }}
                      secureTextEntry={!showPassword} // ← toggled here
                      placeholder="Enter Password"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <Pressable
                      style={loginStyles.eyeButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      {showPassword ? (
                        <ICEye width={22} height={22} stroke={INK} />
                      ) : (
                        <ICEyeOff width={22} height={22} stroke={INK} />
                      )}
                    </Pressable>
                  </FocusField>

                  {touched.password && errors.password && (
                    <AppText color="#BE0B0B" family="InterRegular" size={12}>
                      {errors.password}
                    </AppText>
                  )}
                </Animated.View>

                {/* Submit Button: bounces on press, shine sweeps across while enabled */}
                <Animated.View style={[rowStyle(3), { transform: [...rowStyle(3).transform, { scale: buttonPress }] }]}>
                  <Pressable
                    style={[
                      styles.buttonView,
                      loginStyles.button,
                      { backgroundColor: isValid ? INK : '#A0A0A0' },
                    ]}
                    onPress={() => handleSubmit()}
                    onPressIn={() => pressButton(0.95)}
                    onPressOut={() => pressButton(1)}
                    disabled={!isValid || isSubmitting}
                  >
                    {isValid && !isSubmitting && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          loginStyles.buttonShine,
                          {
                            transform: [
                              { translateX: buttonShine.interpolate({ inputRange: [0, 1], outputRange: [-80, SCREEN_WIDTH] }) },
                              { rotate: '20deg' },
                            ],
                          },
                        ]}
                      />
                    )}
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFD84D" />
                    ) : (
                      <AppText color={isValid ? '#FFD84D' : 'white'} family="InterBold" size={16}>
                        Sign in
                      </AppText>
                    )}
                  </Pressable>
                </Animated.View>
                <View style={{ height: 5 }} />
                {
                  Platform.OS == 'ios' && (
                    <Animated.View style={rowStyle(4)}>
                      <AppText color="gray" family="InterSemiBold" size={14}>Don't have an account <AppText color={INK} onPress={() => {
                        navigation.replace('SignUpScreen')
                      }} family="InterSemiBold" size={14}>Sign Up</AppText></AppText>
                    </Animated.View>
                  )
                }

              </View>
            )}
          </Formik>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const loginStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: SCREEN_HEIGHT * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  fieldKonnectLogo: {
    width: SCREEN_WIDTH * 0.62,
    height: (SCREEN_WIDTH * 0.62 * 512) / 2648,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badgeArea: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePulse: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: GOLD,
  },
  gajraBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  gajraLogo: {
    width: 44,
    height: 44,
  },
  brandText: {
    marginLeft: 12,
  },
  brandName: {
    letterSpacing: 1.5,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  taglineLine: {
    width: 14,
    height: 1.5,
    marginRight: 6,
    backgroundColor: GOLD,
  },
  tagline: {
    letterSpacing: 1.5,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginTop: -26,
    marginBottom: 21,
    backgroundColor: 'rgba(242,183,5,0.5)',
  },
  dot: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.33,
  },
  field: {
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  inputInField: {
    borderWidth: 0,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -15 }],
    padding: 4,
  },
  button: {
    marginTop: 24,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  buttonShine: {
    position: 'absolute',
    top: -20,
    left: 0,
    width: 40,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});

export default LoginScreen;
