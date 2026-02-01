import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
        <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>Profile</Text>
        <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
          This is placeholder content for the authenticated tab.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  containerLight: {
    backgroundColor: '#F5F5F7',
  },
  containerDark: {
    backgroundColor: '#0C0C0F',
  },
  card: {
    padding: 24,
    borderRadius: 20,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
  },
  cardDark: {
    backgroundColor: '#16161D',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  titleLight: {
    color: '#101114',
  },
  titleDark: {
    color: '#F5F5F7',
  },
  subtitle: {
    fontSize: 15,
  },
  subtitleLight: {
    color: 'rgba(16,17,20,0.6)',
  },
  subtitleDark: {
    color: 'rgba(247,247,250,0.65)',
  },
});

export default ProfileScreen;
