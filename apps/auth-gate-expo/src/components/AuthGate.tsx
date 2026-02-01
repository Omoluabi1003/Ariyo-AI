import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail } from '../utils/email';
import { useAuthStore } from '../store/useAuthStore';

const ANIMATION_DURATION_MS = 520;

const AuthGate = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const floatingLabel = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const { setAuthenticated } = useAuthStore();

  const canContinue = useMemo(() => isValidEmail(email), [email]);

  const handleFocus = () => {
    Animated.timing(floatingLabel, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    if (email.length === 0) {
      Animated.timing(floatingLabel, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
    setShowError(true);
  };

  const handleChange = (value: string) => {
    setEmail(value);
    if (value.length > 0) {
      Animated.timing(floatingLabel, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  };

  const handleContinue = () => {
    if (!canContinue) {
      setShowError(true);
      return;
    }

    Keyboard.dismiss();
    setIsAnimatingOut(true);

    Animated.parallel([
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 40,
        duration: ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAuthenticated(true, email.trim().toLowerCase());
    });
  };

  const labelStyle = {
    top: floatingLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -10],
    }),
    fontSize: floatingLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: floatingLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isDark ? 'rgba(255,255,255,0.6)' : 'rgba(20,20,20,0.45)',
        isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,20,20,0.7)',
      ],
    }),
  } as const;

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <Animated.View style={[styles.card, isDark ? styles.cardDark : styles.cardLight, { opacity: fadeOut, transform: [{ translateY }] }]}>
        <View style={styles.logoWrapper}>
          <Text style={[styles.logoText, isDark ? styles.logoTextDark : styles.logoTextLight]}>MyApp</Text>
          <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
            Welcome back. Let’s get you signed in.
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <Animated.Text style={[styles.floatingLabel, labelStyle]}>Email address</Animated.Text>
          <TextInput
            value={email}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="you@example.com"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(20,20,20,0.35)'}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            editable={!isAnimatingOut}
          />
        </View>

        {showError && !canContinue ? (
          <Text style={styles.errorText}>Enter a valid email (e.g. name@example.com).</Text>
        ) : null}

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue || isAnimatingOut}
          style={({ pressed }) => [
            styles.button,
            isDark ? styles.buttonDark : styles.buttonLight,
            (!canContinue || isAnimatingOut) && styles.buttonDisabled,
            pressed && canContinue && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, isDark ? styles.buttonTextDark : styles.buttonTextLight]}>
            Continue
          </Text>
        </Pressable>

        <Text style={[styles.hintText, isDark ? styles.hintTextDark : styles.hintTextLight]}>
          We’ll send you a magic link to finish signing in.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  containerLight: {
    backgroundColor: '#F5F5F7',
  },
  containerDark: {
    backgroundColor: '#0C0C0F',
  },
  card: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
  },
  cardDark: {
    backgroundColor: '#16161D',
    shadowColor: '#000',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  logoTextLight: {
    color: '#101114',
  },
  logoTextDark: {
    color: '#F7F7FA',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  subtitleLight: {
    color: 'rgba(16,17,20,0.6)',
  },
  subtitleDark: {
    color: 'rgba(247,247,250,0.65)',
  },
  inputWrapper: {
    marginBottom: 14,
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  inputLight: {
    color: '#0F1012',
    borderColor: 'rgba(15,16,18,0.12)',
    backgroundColor: '#FFFFFF',
  },
  inputDark: {
    color: '#F5F5F7',
    borderColor: 'rgba(245,245,247,0.2)',
    backgroundColor: '#1C1C24',
  },
  errorText: {
    color: '#D63B3B',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonLight: {
    backgroundColor: '#101114',
  },
  buttonDark: {
    backgroundColor: '#F7F7FA',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextLight: {
    color: '#FFFFFF',
  },
  buttonTextDark: {
    color: '#101114',
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  hintTextLight: {
    color: 'rgba(16,17,20,0.5)',
  },
  hintTextDark: {
    color: 'rgba(247,247,250,0.5)',
  },
});

export default AuthGate;
