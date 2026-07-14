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
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!username.trim()) { setError('Username is required'); return; }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username: letters, numbers and underscores only');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Navigate to avatar picker with params
    router.push({
      pathname: '/(auth)/avatar',
      params: { email: email.trim(), username: username.trim(), password },
    });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Step 1 of 2 — Your details</Text>
      </View>

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
          returnKeyType="next"
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="debater_123"
          placeholderTextColor="#8A8A9A"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <Text style={styles.hint}>Letters, numbers and underscores only</Text>

        <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Min. 6 characters"
          placeholderTextColor="#8A8A9A"
          secureTextEntry
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleNext}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next — Pick avatar →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.linkHighlight}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0D0D0F' },
  container: { paddingHorizontal: 24, flexGrow: 1 },
  header: { marginBottom: 36 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#8A8A9A', fontSize: 15, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#F0F0F5', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  form: { gap: 4 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#8A8A9A', marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A', marginTop: 4 },
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
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#8A8A9A', fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkHighlight: { color: '#3B82F6', fontFamily: 'Inter_600SemiBold' },
});
