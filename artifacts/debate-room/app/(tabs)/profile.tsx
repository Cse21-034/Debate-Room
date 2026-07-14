import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import AvatarDisplay from '@/components/AvatarDisplay';
import { AVATAR_COLORS } from '@/constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: myRoomsData } = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: () => api.rooms.list({ myRooms: true, limit: 50 }),
    enabled: !!user,
  });

  const myRooms = myRoomsData?.rooms ?? [];
  const roomsCreated = myRooms.filter((r) => r.isOwner);
  const roomsJoined = myRooms.filter((r) => !r.isOwner);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            queryClient.clear();
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await api.auth.deleteAccount();
              await logout();
              queryClient.clear();
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (!user) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <AvatarDisplay avatarKey={user.avatarKey} username={user.username} size={72} fontSize={30} />
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{roomsCreated.length}</Text>
          <Text style={styles.statLabel}>Created</Text>
        </View>
        <View style={[styles.statCard, styles.statCardMiddle]}>
          <Text style={styles.statNumber}>{roomsJoined.length}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{myRooms.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Rooms I created */}
      {roomsCreated.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My debates</Text>
          {roomsCreated.slice(0, 5).map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomItem}
              onPress={() => router.push(`/room/${room.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.roomItemLeft}>
                <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
                <Text style={styles.roomCategory}>{room.category} · {room.memberCount} members</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#8A8A9A" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/blocked')}
          activeOpacity={0.7}
        >
          <Feather name="slash" size={18} color="#8A8A9A" />
          <Text style={styles.actionText}>Blocked users</Text>
          <Feather name="chevron-right" size={16} color="#8A8A9A" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, isLoggingOut && styles.actionItemDisabled]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Feather name="log-out" size={18} color="#EF4444" />
          )}
          <Text style={[styles.actionText, { color: '#EF4444' }]}>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, isLoggingOut && styles.actionItemDisabled]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          disabled={isLoggingOut}
        >
          <Feather name="trash-2" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  content: { paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 28, gap: 8 },
  username: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  email: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  statsRow: { flexDirection: 'row', marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statCardMiddle: { marginHorizontal: 8 },
  statNumber: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#8A8A9A' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A8A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  roomItem: {
    backgroundColor: '#1A1A1F',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  roomItemLeft: { flex: 1, gap: 2 },
  roomTitle: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  roomCategory: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A', textTransform: 'capitalize' },
  actionItem: {
    backgroundColor: '#1A1A1F',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 12,
  },
  actionText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  actionItemDisabled: { opacity: 0.5 },
});
