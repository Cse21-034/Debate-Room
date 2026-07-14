import React from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AvatarDisplay from '@/components/AvatarDisplay';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function RoomInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: room, isLoading: loadingRoom } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.rooms.get(roomId),
    enabled: !!roomId,
  });

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => api.rooms.members(roomId),
    enabled: !!roomId,
  });

  const handleJoin = async () => {
    try {
      await api.rooms.join(roomId);
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave debate', 'Leave this debate room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.rooms.leave(roomId);
            queryClient.invalidateQueries({ queryKey: ['room', roomId] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (memberId: string, username: string) => {
    Alert.alert('Remove member', `Remove @${username} from this debate?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.rooms.removeMember(roomId, memberId);
          queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
        },
      },
    ]);
  };

  const handleDeleteRoom = () => {
    Alert.alert('Delete debate', 'This will permanently delete the debate room and all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.rooms.delete(roomId);
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (loadingRoom) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  if (!room) return null;

  const isOwner = room.ownerId === user?.id;
  const isMember = room.isMember;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Room header */}
      <View style={styles.roomHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{room.category}</Text>
        </View>
        <Text style={styles.roomTitle}>{room.title}</Text>
        {room.description ? (
          <Text style={styles.roomDescription}>{room.description}</Text>
        ) : null}
        <Text style={styles.createdAt}>Created {formatDate(room.createdAt)}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{room.memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="activity" size={20} color="#3B82F6" />
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Join / Leave button */}
      {isOwner ? null : isMember ? (
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.8}>
          <Feather name="log-out" size={16} color="#EF4444" />
          <Text style={styles.leaveBtnText}>Leave debate</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} activeOpacity={0.8}>
          <Feather name="user-plus" size={16} color="#FFF" />
          <Text style={styles.joinBtnText}>Join debate</Text>
        </TouchableOpacity>
      )}

      {/* Members list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({members?.length ?? 0})</Text>
        {loadingMembers ? (
          <ActivityIndicator color="#3B82F6" style={{ padding: 20 }} />
        ) : (
          members?.map((member) => (
            <View key={member.userId} style={styles.memberItem}>
              <AvatarDisplay avatarKey={member.avatarKey} username={member.username} size={36} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberUsername}>@{member.username}</Text>
                {member.role === 'owner' && (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerText}>Owner</Text>
                  </View>
                )}
              </View>
              {isOwner && member.userId !== user?.id && (
                <TouchableOpacity
                  onPress={() => handleRemoveMember(member.userId, member.username)}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Owner controls */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner controls</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteRoom} activeOpacity={0.8}>
            <Feather name="trash-2" size={16} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Delete debate room</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0F' },
  roomHeader: { marginBottom: 20, gap: 8 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#60A5FA', textTransform: 'capitalize' },
  roomTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  roomDescription: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A', lineHeight: 20 },
  createdAt: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  statNum: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  joinBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  joinBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  leaveBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  leaveBtnText: { color: '#EF4444', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A8A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberUsername: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  ownerBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownerText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#3B82F6' },
  dangerBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  dangerBtnText: { color: '#EF4444', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
