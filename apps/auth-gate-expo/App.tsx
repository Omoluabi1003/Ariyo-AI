import React from 'react';
import { StatusBar, StyleSheet, View, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthGate from './src/components/AuthGate';
import MainTabs from './src/navigation/MainTabs';
import { useAuthStore } from './src/store/useAuthStore';

const App = () => {
  const colorScheme = useColorScheme();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return <View style={styles.hydrationPlaceholder} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {isAuthenticated ? (
        <NavigationContainer theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <MainTabs />
        </NavigationContainer>
      ) : (
        <AuthGate />
      )}
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  hydrationPlaceholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default App;
