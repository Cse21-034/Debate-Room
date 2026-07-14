import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.auth.login({ email: email.trim(), password });
      await login(token, user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 40, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      {/* Logo / Brand */}
      <View style={styles.brand}>
        <View style={styles.logoContainer}>
          <View style={[styles.bubble, styles.bubbleBlue]} />
          <View style={[styles.bubble, styles.bubbleOrange]} />
        </View>
        <Text style={styles.appName}>DebateRoom</Text>
        <Text style={styles.tagline}>Every opinion deserves a stage</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#8A8A9A"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#8A8A9A"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>
            No account?{' '}
            <Text style={styles.linkHighlight}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0D0D0F' },
  container: { paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 48 },
  logoContainer: { width: 72, height: 72, marginBottom: 16, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  bubble: { width: 40, height: 40, borderRadius: 20, position: 'absolute' },
  bubbleBlue: { backgroundColor: '#3B82F6', left: 4, top: 0 },
  bubbleOrange: { backgroundColor: '#F97316', right: 4, bottom: 0 },
  appName: { fontSize: 32, fontFamily: 'Inter_700Bold', color: '#F0F0F5', marginBottom: 6 },
  tagline: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  form: { gap: 4 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#8A8A9A', marginBottom: 6 },
  input: {
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#F0F0F5',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#EF4444', fontSize: 14, fontFamily: 'Inter_400Regular' },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#8A8A9A', fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkHighlight: { color: '#3B82F6', fontFamily: 'Inter_600SemiBold' },
});
