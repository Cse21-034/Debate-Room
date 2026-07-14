import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import type { BlockedUser } from '@/lib/api';
import AvatarDisplay from '@/components/AvatarDisplay';

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: blocked, isLoading } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => api.blocks.list(),
  });

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert('Unblock user', `Unblock @${user.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          await api.blocks.unblock(user.userId);
          queryClient.invalidateQueries({ queryKey: ['blocks'] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : 0 }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <FlatList
          data={blocked ?? []}
          keyExtractor={(u) => u.userId}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <AvatarDisplay avatarKey={item.avatarKey} username={item.username} size={40} />
              <View style={styles.info}>
                <Text style={styles.username}>@{item.username}</Text>
                <Text style={styles.date}>
                  Blocked {new Date(item.blockedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.unblockBtn}
                onPress={() => handleUnblock(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Feather name="shield" size={48} color="#2A2A35" />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySubtitle}>
                Users you block will appear here
              </Text>
            </View>
          }
          contentContainerStyle={
            (blocked?.length ?? 0) === 0 ? { flex: 1 } : { padding: 16, gap: 8 }
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 12,
  },
  info: { flex: 1 },
  username: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  date: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A', marginTop: 2 },
  unblockBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  unblockText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#3B82F6' },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#F0F0F5' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A', textAlign: 'center' },
});
