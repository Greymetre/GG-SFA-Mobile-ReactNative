import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomHeader from '../components/Header';
import GearTabBar from './GearTabBar';
import Home from '../screens/Home';
import OrderList from '../screens/OrderScreen';
import { PacScreen } from '../screens/ComingSoon';
import RatingScreen from '../screens/Rating';
const Tab = createBottomTabNavigator();

const BottomTab = () => {
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      tabBar={(props) => <GearTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        header: (props) => <CustomHeader {...props} />,
      }}
      >
      <Tab.Screen name='Home' component={Home} options={{ headerShown: false }} />
      <Tab.Screen name='Pac' component={PacScreen} options={{ headerShown: false, title: 'PAC' }} />
      <Tab.Screen name='Rating' component={RatingScreen} options={{ headerShown: false, title: 'Rating' }} />
      <Tab.Screen name='OrderList' component={OrderList} options={{ headerShown: true, title: 'Orders' }} />
    </Tab.Navigator>
  )
}

export default BottomTab
