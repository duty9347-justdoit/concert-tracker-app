// hooks/usePushNotifications.js
import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiFetch } from '../utils/apiFetch';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export default function usePushNotifications() {
  const notificationListener = useRef();
  const responseListener     = useRef();

  useEffect(() => {
    registerForPushNotifications();

    // Fired when notification received in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Fired when user taps notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices.');
    return;
  }

  console.log('Registering for push notifications...');

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('Existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('New permission status:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Notifications Disabled',
      'Enable notifications in Settings to get concert alerts.'
    );
    console.log('Permission denied — aborting token registration.');
    return;
  }

  // Get Expo push token
  console.log('Getting Expo push token...');
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token     = tokenData.data;
    console.log('Expo push token:', token);

    // Register token with backend
    console.log('Sending token to backend...');
    const res = await apiFetch('/push-token', {
      method:  'POST',
      body:    JSON.stringify({ token }),
    });
    const data = await res.json();
    console.log('Backend response:', JSON.stringify(data));
  } catch (e) {
    console.error('Push token registration error:', e.message);
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}