import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AVATAR_COLORS, AVATAR_COLOR_KEYS } from '@/constants/colors';

export default function AvatarPickerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { email, username, password } = useLocalSearchParams<{
    email: string;
    username: string;
    password: string;
  }>();

  const [selectedKey, setSelectedKey] = useState(AVATAR_COLOR_KEYS[6]!); // blue default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initial = (username?.[0] ?? 'D').toUpperCase();

  const handleCreate = async () => {
    if (!email || !username || !password) {
      setError('Missing registration data');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.auth.register({
        email,
        username,
        password,
        avatarKey: selectedKey,
      });
      await login(token, user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const color = AVATAR_COLORS[selectedKey] ?? '#60A5FA';

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 20 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Pick your avatar</Text>
      <Text style={styles.subtitle}>Step 2 of 2 — Choose your color</Text>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <View
          style={[
            styles.preview,
            { backgroundColor: `${color}25`, borderColor: `${color}60` },
          ]}
        >
          <Text style={[styles.previewInitial, { color }]}>{initial}</Text>
        </View>
        <Text style={styles.previewUsername}>@{username}</Text>
      </View>

      {/* Color grid */}
      <FlatList
        data={AVATAR_COLOR_KEYS}
        numColumns={4}
        keyExtractor={(k) => k}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        renderItem={({ item: key }) => {
          const c = AVATAR_COLORS[key]!;
          const selected = key === selectedKey;
          return (
            <TouchableOpacity
              onPress={() => {
                setSelectedKey(key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.colorCell,
                { backgroundColor: `${c}20`, borderColor: selected ? c : 'transparent' },
                selected && styles.colorCellSelected,
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.colorSwatch, { backgroundColor: c }]}>
                <Text style={styles.swatchInitial}>{initial}</Text>
              </View>
              {selected && (
                <View style={[styles.checkmark, { backgroundColor: c }]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: color }, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create my account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F', paddingHorizontal: 24, paddingBottom: 24 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#8A8A9A', fontSize: 15, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#F0F0F5', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A', marginBottom: 28 },
  previewContainer: { alignItems: 'center', marginBottom: 28 },
  preview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 10,
  },
  previewInitial: { fontSize: 36, fontFamily: 'Inter_700Bold' },
  previewUsername: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#8A8A9A' },
  grid: { paddingBottom: 16 },
  colorCell: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  colorCellSelected: {},
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchInitial: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#EF4444', fontSize: 14, fontFamily: 'Inter_400Regular' },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
