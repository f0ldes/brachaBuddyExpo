import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';

// TODO: Replace with your actual Web client ID from Firebase Console > Auth > Google provider
GoogleSignin.configure({
  webClientId: '749460609316-ih3holdrmf19qsaf4vkfq2mam2aqtatg.apps.googleusercontent.com',
  iosClientId: '749460609316-ci95fgqv0bk2995ccmvl3injg09fd8mt.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={styles.title}>BrachaBuddy</Text>
      <Text style={styles.subtitle}>
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#A0977D"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#A0977D"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEmailAuth}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.googleButton, loading && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={loading}>
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggleText}>
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFEEBF',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#373329',
    textAlign: 'center',
    fontFamily: 'ShipporiMincho-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#373329',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'ShipporiMincho-Regular',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D5B5',
    color: '#373329',
  },
  button: {
    backgroundColor: '#D4A017',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D4A017',
  },
  googleButtonText: {
    color: '#373329',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleText: {
    color: '#D4A017',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});
