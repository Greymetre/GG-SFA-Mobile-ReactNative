import { View, Pressable, ScrollView, StyleSheet } from 'react-native'
import React from 'react'
import Svg, { Path } from 'react-native-svg'
import LinearGradient from 'react-native-linear-gradient'
import AppText from '../../components/AppText/AppText'
import { colors } from '../../utils/Colors'

// Same pages the Gajra Gro app shows on its login screen, served by the Railway-hosted landing site.
const LOCATOR_BASE_URL = 'https://gajragrolandingwebsite-production.up.railway.app';

// `icon` is a path on the 24 grid
const LOCATORS = [
  {
    name: 'e-Catalogue',
    subtitle: 'Browse the complete product range',
    tag: 'Products',
    title: 'e-Catalogue',
    url: LOCATOR_BASE_URL,
    icon: 'M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v14a2 2 0 012-2h6z',
  },
  {
    name: 'Distributor / Retailer',
    subtitle: 'Find distributors & retailers nearby',
    tag: 'Nearby search',
    title: 'Distributor / Retailer Locator',
    url: `${LOCATOR_BASE_URL}/customer-details/Retailer?status=true`,
    icon: 'M4 9.5L5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20',
  },
  {
    name: 'Mechanic Locator',
    subtitle: 'Find mechanics, fleet & owners',
    tag: 'Nearby search',
    title: 'Mechanic / Fleet / Owner Locator',
    url: `${LOCATOR_BASE_URL}/customer-details/Mechanic?mechanicStatus=true`,
    icon: 'M14.7 6.3a4 4 0 00-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 005.1-5.4l-2.5 2.5-2.5-.5-.5-2.5z',
  },
]

const Locator = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {
          LOCATORS.map(item => (
            <Pressable
              key={item.name}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('LocatorWebView', { url: item.url, title: item.title })}
            >
              <LinearGradient colors={['#FFD84D', '#F2B705']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
                <LocatorIcon d={item.icon} color={colors.blue} size={26} />
              </LinearGradient>

              <View style={styles.info}>
                <AppText size={16} color="#202432" family="InterBold" numLines={1}>{item.name}</AppText>
                <AppText size={12} color="#858DA0" family="InterRegular" numLines={1}>{item.subtitle}</AppText>
                <View style={styles.tag}>
                  <View style={styles.tagDot} />
                  <AppText size={11} color="#8A6A00" family="InterSemiBold">{item.tag}</AppText>
                </View>
              </View>

              <View style={styles.arrow}>
                <LocatorIcon d="M9.5 6l6 6-6 6" color="white" size={16} strokeWidth={2.4} />
              </View>
            </Pressable>
          ))
        }
      </ScrollView>
    </View>
  )
}

export default Locator

const LocatorIcon = ({ d, color, size = 20, strokeWidth = 1.9 }: { d: string; color: string; size?: number; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 36,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E4E8EF',
    elevation: 3,
    shadowColor: '#17203A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242,183,5,0.6)',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: colors.goldSoft,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
  },
})
