import React, { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/apiClient';

// TODO: Replace with your actual Web client ID from Firebase Console > Auth > Google provider
GoogleSignin.configure({
  webClientId: '749460609316-ih3holdrmf19qsaf4vkfq2mam2aqtatg.apps.googleusercontent.com',
  iosClientId: '749460609316-ci95fgqv0bk2995ccmvl3injg09fd8mt.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const { user, continueAsGuest, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track if user was a guest when they entered this screen
  const wasGuest = useRef(!user);

  useEffect(() => {
    // Auto-navigate back when a guest successfully authenticates
    if (user && wasGuest.current) {
      navigation.goBack();
    }
  }, [user]);

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

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken } = appleCredential;
      if (!identityToken) throw new Error('No identity token from Apple');

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.goBack();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch('/account', {
                method: 'DELETE',
              });
              if (!response.ok) {
                throw new Error('Failed to delete account');
              }
              await signOut();
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
              console.error('Account deletion error:', error);
            }
          },
        },
      ],
    );
  };

  // Authenticated user view — account management
  if (user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#373329" />
        </TouchableOpacity>
        <View style={styles.container}>
          <Text style={styles.title}>BrachaBuddy</Text>
          <Text style={styles.subtitle}>Account</Text>
          <Text style={styles.accountEmail}>{user.email || 'Signed In'}</Text>

          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Guest view — login form
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Ionicons name="close" size={28} color="#373329" />
      </TouchableOpacity>
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

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={40}
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
          />
        )}

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFEEBF',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginRight: 16,
    marginTop: 4,
  },
  container: {
    flex: 1,
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
  accountEmail: {
    fontSize: 16,
    color: '#A0977D',
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
  appleButton: {
    height: 48,
    marginTop: 12,
  },
  toggleText: {
    color: '#D4A017',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  deleteButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontSize: 15,
  },
});
