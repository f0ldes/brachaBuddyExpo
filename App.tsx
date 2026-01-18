import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import HomeScreen from './screens/HomeScreen';

SplashScreen.preventAutoHideAsync();

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
        <SafeAreaView style={styles.safeContainerStyle}>
          <HomeScreen />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: '#FFEEBF',
    height: '100%',
    width: '100%',
  },
  safeContainerStyle: {
    backgroundColor: '#FFEEBF',
    height: '100%',
    width: '100%',
  },
});

