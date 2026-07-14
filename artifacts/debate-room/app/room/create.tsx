import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import type { Room } from '@/lib/api';
import { CATEGORIES } from '@/components/CategoryFilter';

export default function CreateRoomScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

  const roomCategories = CATEGORIES.filter((c) => c.key !== 'all');

  // Similar rooms query
  const { data: similarRooms, isFetching: loadingSimilar } = useQuery({
    queryKey: ['similar-rooms', title, category],
    queryFn: () => api.rooms.similar(title, category),
    enabled: title.trim().length >= 5 && !!category,
    staleTime: 5000,
  });

  const hasSimilar = (similarRooms?.length ?? 0) > 0;

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (title.length > 100) { setError('Title max 100 characters'); return; }
    if (!category) { setError('Please select a category'); return; }

    setLoading(true);
    try {
      const room = await api.rooms.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
      });
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create room');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Debate topic *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Is social media harmful?"
        placeholderTextColor="#8A8A9A"
        maxLength={100}
        returnKeyType="next"
        multiline={false}
      />
      <Text style={styles.charCount}>{title.length}/100</Text>

      <Text style={[styles.label, { marginTop: 16 }]}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add context to help debaters understand the topic..."
        placeholderTextColor="#8A8A9A"
        maxLength={300}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{description.length}/300</Text>

      <Text style={[styles.label, { marginTop: 16 }]}>Category *</Text>
      <View style={styles.categoryGrid}>
        {roomCategories.map((cat) => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? '#3B82F6' : '#1A1A1F',
                  borderColor: active ? '#3B82F6' : '#2A2A35',
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, { color: active ? '#FFF' : '#8A8A9A' }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Similar rooms warning */}
      {hasSimilar && (
        <View style={styles.similarBox}>
          <Text style={styles.similarTitle}>Similar debates already exist</Text>
          {similarRooms?.slice(0, 3).map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.similarItem}
              onPress={() => {
                router.replace(`/room/${room.id}`);
              }}
              activeOpacity={0.7}
            >
              <Feather name="message-circle" size={14} color="#F97316" />
              <View style={{ flex: 1 }}>
                <Text style={styles.similarRoomTitle} numberOfLines={1}>{room.title}</Text>
                <Text style={styles.similarRoomMeta}>{room.memberCount} members</Text>
              </View>
              <Text style={styles.joinText}>Join →</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.similarNote}>You can still create a new debate if yours is different.</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create Debate</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0D0D0F' },
  container: { padding: 20 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#8A8A9A', marginBottom: 8 },
  input: {
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#F0F0F5',
  },
  textArea: { height: 100, paddingTop: 14 },
  charCount: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8A8A9A', textAlign: 'right', marginTop: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  catText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  similarBox: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    gap: 8,
  },
  similarTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#F97316' },
  similarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  similarRoomTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  similarRoomMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  joinText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#F97316' },
  similarNote: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
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
});
