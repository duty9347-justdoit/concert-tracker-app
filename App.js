import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import USConcertsScreen from './screens/USConcertsScreen';
import ArtistsScreen from './screens/ArtistsScreen';
import usePushNotifications from './hooks/usePushNotifications';

const Tab = createBottomTabNavigator();

export default function App() {
  usePushNotifications();  // registers device and handles notifications
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle:      { backgroundColor: '#0f0f1a' },
          headerTintColor:  '#ffffff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          tabBarStyle: {
            backgroundColor: '#0f0f1a',
            borderTopColor:  '#2a2a3e',
            paddingBottom:   8,
            paddingTop:      6,
            height:          60,
          },
          tabBarActiveTintColor:   '#7c6af7',
          tabBarInactiveTintColor: '#666680',
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if      (route.name === 'Home')    iconName = focused ? 'musical-notes'    : 'musical-notes-outline';
            else if (route.name === 'US Shows') iconName = focused ? 'flag'             : 'flag-outline';
            else if (route.name === 'Artists') iconName = focused ? 'people'           : 'people-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"      component={HomeScreen}      options={{ title: '🎵 All Concerts' }} />
        <Tab.Screen name="US Shows"  component={USConcertsScreen} options={{ title: '🇺🇸 US Shows' }} />
        <Tab.Screen name="Artists"   component={ArtistsScreen}   options={{ title: '🎤 Artists' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
