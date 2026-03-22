import React, { useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { loading } = useAuth();

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
          <AppNavigator />
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
