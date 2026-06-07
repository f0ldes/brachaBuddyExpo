import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import mobileAds from 'react-native-google-mobile-ads';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsProvider } from './contexts/CreditsContext';
import { initPurchases } from './utils/purchases';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';

SplashScreen.preventAutoHideAsync();

// Initialize the Google Mobile Ads SDK once at startup.
mobileAds()
  .initialize()
  .catch((e) => console.warn('Mobile Ads init failed', e));

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  // Point RevenueCat at the Firebase uid so IAP webhooks grant to the right
  // user. The anon→real upgrade preserves the uid, so this stays stable.
  useEffect(() => {
    if (user?.uid) initPurchases(user.uid);
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'ShipporiMincho-Regular': require('./assets/fonts/ShipporiMincho-Regular.ttf'),
    'ShipporiMincho-Bold': require('./assets/fonts/ShipporiMincho-Bold.ttf'),
    'ShipporiMincho-Medium': require('./assets/fonts/ShipporiMincho-Medium.ttf'),
    'ShipporiMincho-SemiBold': require('./assets/fonts/ShipporiMincho-SemiBold.ttf'),
    'ShipporiMincho-ExtraBold': require('./assets/fonts/ShipporiMincho-ExtraBold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.containerStyle} onLayout={onLayoutRootView}>
        <AuthProvider>
          <CreditsProvider>
            <AppNavigator />
          </CreditsProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: '#FFEEBF',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEEBF',
  },
});
