import { View, ScrollView, Pressable, Alert, ActivityIndicator, Platform, StyleSheet } from 'react-native'
import React, { useCallback, useState } from 'react'
import { styles } from './styles'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogoIcon, SunnyIcon } from '../../assets/svgs/HomePageSvgs'
import AppText from '../../components/AppText/AppText'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { logout, setToken, setUser } from '../../components/redux/slice/AuthSlice'
import { useDispatch } from 'react-redux'
import store, { useAppSelector } from '../../components/redux/Store'
import axiosClient, { BASE_URL } from '../../api/AxiosClient'
import { API_ENDPOINT } from '../../api/ApiUrls'
import MediaImage from '../../components/atoms/MediaImage'
import { brandGradient, colors } from '../../utils/Colors'
import { BackIcon, UserIcon } from '../../assets/svgs/SvgsFile'
import axios from 'axios'
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/misc'
import { stopLiveLocationTracking } from '../../services/liveLocationService'
import { navigationRef } from '../../services/NavigationService'
import { logoutApi } from '../../api/query/AuthAPI'
import Svg, { Path } from 'react-native-svg'
import SpinningGear from '../../components/atoms/SpinningGear'

// Drawer menu. `icon` is a path on the 24 grid, drawn by DrawerIcon in the brand colours.
const data = [
  { id: 1, name: 'My Profile', icon: 'M12 11.5a4 4 0 100-8 4 4 0 000 8zM4.5 20.5c0-3.9 3.4-6.5 7.5-6.5s7.5 2.6 7.5 6.5' },
  { id: 9, name: 'Tour Plan', icon: 'M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5zM4 10h16M8.5 3v4M15.5 3v4M12 18s-2.5-2.1-2.5-3.8a2.5 2.5 0 015 0C14.5 15.9 12 18 12 18z' },
  { id: 3, name: 'Report', icon: 'M4 20.5h16M7 16.5v-5M12 16.5v-10M17 16.5v-7' },
  { id: 4, name: 'Documents', icon: 'M14 3H7.5A2.5 2.5 0 005 5.5v13A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5V8zM14 3v5h5M9 13h6M9 16.5h4' },
  { id: 6, name: 'Logout', icon: 'M14 4h3.5A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5H14M10 16.5L5.5 12 10 7.5M5.5 12H15' },
  { id: 7, name: 'Delete Account', icon: 'M4 7h16M9 7V4.5h6V7m3 0l-1 13.5H7L6 7m4 4v6m4-6v6', danger: true },
]

const getDesignation = (user: any) => {
  const value = user?.designation_name
    || (typeof user?.designation === 'object'
      ? user.designation?.designation_name || user.designation?.name
      : user?.designation);

  return typeof value === 'string' ? value.trim() : '';
}

const ProfileTab = ({ handleDrawerClose }: any) => {
  const navigation: any = useNavigation()
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { user } = useAppSelector(
    (state) => state.auth
  );
  // Pull the latest name / mobile / photo (it may have been changed in the CRM or from My Profile)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      axiosClient.get(API_ENDPOINT.GET_PROFILE)
        .then((response: any) => {
          const info = response?.data?.userinfo;
          const current = store.getState().auth?.user;
          if (!active || !info || !current) return;
          const changed = ['name', 'mobile', 'email', 'profile_image'].some(key => (info[key] ?? '') !== (current[key] ?? ''));
          if (changed) {
            dispatch(setUser({ ...current, name: info.name, mobile: info.mobile, email: info.email, profile_image: info.profile_image }));
          }
        })
        .catch(() => { /* keep the cached profile */ });
      return () => { active = false; };
    }, [dispatch]),
  );

  const designation = getDesignation(user);
  const displayName = `${user?.name || 'User'}${designation ? ` - ${designation}` : ''}`;

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    // Never let a slow network or GPS keep the user stuck on the spinner
    const withTimeout = (promise: Promise<unknown>, ms: number) =>
      Promise.race([promise, new Promise<void>(resolve => setTimeout(() => resolve(), ms))]);

    try {
      await withTimeout(logoutApi(), 8000);
    } catch (error) {
      console.warn('Logout API failed:', error);
    }
    try {
      await withTimeout(stopLiveLocationTracking({ captureFinalLocation: false }), 3000);
    } catch (error) {
      console.warn('Stopping location tracking failed:', error);
    }

    dispatch(logout());
    dispatch(setUser(null));
    dispatch(setToken(null));
    setLoading(false);
    handleDrawerClose?.();
    // Reset the root stack (this drawer lives inside the tab navigator)
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    } else {
      navigation?.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              await axios.post(
                `${BASE_URL}api/delete-user`,
                {
                  user_id: user?.id,
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              );

              await stopLiveLocationTracking({ captureFinalLocation: false });
              dispatch(logout());
              dispatch(setUser(null));
              dispatch(setToken(null));

              navigation?.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });

            } catch (error) {
              console.log('Delete Account Error:', error);
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>

      <ScrollView style={[styles.container, { marginBottom: 20 }]} showsVerticalScrollIndicator={false}>
        {/* <View style={[styles.blueContaier, {
          height: 255 ,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }]} /> */}
        {
          loading && (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.3)',
                height: SCREEN_HEIGHT,
                width: SCREEN_WIDTH,
                position: 'absolute',
              }}
            >
              <ActivityIndicator size="large" color={colors.blue} />
            </View>
          )
        }

        <View style={[{ width: '100%', backgroundColor: colors.goldLight, justifyContent: 'space-between', paddingTop: useSafeAreaInsets()?.top, gap: 30, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }]}>
          <LinearGradient {...brandGradient} style={StyleSheet.absoluteFill} />
          <SpinningGear size={140} teeth={12} color="rgba(255,255,255,0.4)" duration={20000} style={{ top: -45, right: -35 }} />
          <View style={[styles.header, styles.row, {}]}>
            <Pressable style={{ alignItems: 'center', flexDirection: "row", gap: 20 }} onPress={handleDrawerClose}>
              <BackIcon size={28} color={colors.blue} />
              <LogoIcon color={colors.blue} />
            </Pressable>
            <View style={[styles.row, styles.button]}>
              <AppText size={12} color={colors.blue} family='InterMedium'>Good Day</AppText>
              <SunnyIcon color={colors.blue} />
            </View>

          </View>
          <LinearGradient style={[styles.profileView, styles.row]} colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)']} locations={[0.5, 1]}>
            <View style={{ height: 101, width: 101, borderRadius: 55, marginLeft: 16, marginBottom: 20, backgroundColor: 'rgba(43,43,43,0.35)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', }}>
              {!user?.profile_image && <UserIcon />}
              {!!user?.profile_image && (
                <MediaImage path={user.profile_image} placeholder={require('../../assets/images/Dummy/user.png')} style={{ height: 101, width: 101, borderRadius: 101, position: 'absolute' }} />
              )}
              {/* <FastImage source={require('../../assets/images/HomeTabs/profile.png')} style={{ height: 101, width: 101, borderRadius: 101, position: 'absolute' }} /> */}
              {/* {
                user?.profile_image && (
                  <FastImage source={{ uri: resolveMediaUrl(user?.profile_image) }} style={{ height: 101, width: 101, borderRadius: 101, position: 'absolute' }} />
                )
              } */}

            </View>
            <View style={{ gap: 5, paddingLeft: 20, marginBottom: 20 }}>

              <AppText size={20} family='InterBold' color={colors.blue}>{displayName}</AppText>
              <AppText size={20} family='InterMedium' color='#5c5c5c'>{user?.mobile}</AppText>
            </View>

          </LinearGradient>
        </View>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>

          <View style={{ flex: 1, marginTop: 4, gap: 8, paddingHorizontal: 16 }}>
            {
              data?.map((item: any) => {
                if(Platform.OS == "android" && item?.name == "Delete Account"){
                  return null;
                } 
                return (
                  <Pressable key={item.id} style={[styles.itemVIew, styles.row]} onPress={async () => {
                    if (item?.name == "My Profile") {
                      handleDrawerClose()
                      navigation.navigate('MyProfile')
                    }
                    else if (item?.name == "Report") {
                      navigation.navigate('Reports')
                      handleDrawerClose()
                      // navigation.navigate('UserActivityPage')
                      // navigation.navigate('AttendanceReport')
                    }
                    else if (item?.name == "Documents") {
                      navigation.navigate('Documents')
                      handleDrawerClose()
                    }
                    else if (item?.name == "Tour Plan") {
                      navigation.navigate('TourPlanPage')
                      handleDrawerClose()
                    }
                    else if (item?.name == "Order History") {
                      navigation.navigate('OrderList')
                      handleDrawerClose()
                    }
                    else if (item?.name == "Logout") {
                      await handleLogout();
                    }
                    else if (item?.name == "Delete Account") {
                      handleDeleteAccount();
                    }

                  }}>
                    <View style={[drawerStyles.iconBox, item?.danger && drawerStyles.iconBoxDanger]}>
                      <DrawerIcon d={item.icon} color={item?.danger ? '#D93025' : colors.blue} />
                    </View>
                    <AppText size={16} color={item?.danger ? '#D93025' : colors.blue} family='InterMedium'>{item?.name}</AppText>
                    <View style={drawerStyles.chevron}>
                      <DrawerIcon d="M9.5 6l6 6-6 6" color={item?.danger ? '#D93025' : '#B0B0B0'} size={18} />
                    </View>
                  </Pressable>
                )
              })
            }
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  )
}

export default ProfileTab

const DrawerIcon = ({ d, color, size = 20 }: { d: string; color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={d} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

const drawerStyles = StyleSheet.create({
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(242,183,5,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDanger: {
    backgroundColor: '#FDECEA',
    borderColor: 'rgba(217,48,37,0.25)',
  },
  chevron: {
    marginLeft: 'auto',
  },
})
