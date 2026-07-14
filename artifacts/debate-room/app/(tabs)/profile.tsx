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
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import AvatarDisplay from '@/components/AvatarDisplay';
import { AVATAR_COLORS, AVATAR_COLOR_KEYS } from '@/constants/colors';

const CATEGORY_EMOJI: Record<string, string> = {
  love: '❤️', romance: '💫', money: '💰', business: '💼',
  religion: '🕊️', politics: '🏛️', sports: '⚡', technology: '🤖',
  lifestyle: '🌿', other: '💬',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarKey, setEditAvatarKey] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const { data: myRoomsData } = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: () => api.rooms.list({ myRooms: true, limit: 50 }),
    enabled: !!user,
  });

  const myRooms = myRoomsData?.rooms ?? [];
  const roomsCreated = myRooms.filter((r) => r.isOwner);
  const roomsJoined  = myRooms.filter((r) => !r.isOwner);

  const openEdit = () => {
    setEditUsername(user?.username ?? '');
    setEditAvatarKey(user?.avatarKey ?? '');
    setEditError('');
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (editUsername.trim().length < 3) {
      setEditError('Username must be at least 3 characters');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await api.auth.updateMe({ username: editUsername.trim(), avatarKey: editAvatarKey });
      await refreshUser?.();
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setEditVisible(false);
    } catch (err: any) {
      setEditError(err.message ?? 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try { await logout(); queryClient.clear(); }
          finally { setIsLoggingOut(false); }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try { await api.auth.deleteAccount(); await logout(); queryClient.clear(); }
            finally { setIsLoggingOut(false); }
          },
        },
      ],
    );
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const avatarColor = user?.avatarKey ? (AVATAR_COLORS[user.avatarKey] ?? '#3B82F6') : '#3B82F6';

  if (!user) return null;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover + avatar */}
        <View style={[styles.cover, { backgroundColor: `${avatarColor}22` }]}>
          <View style={[styles.coverAccent, { backgroundColor: `${avatarColor}11` }]} />
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarRing, { borderColor: avatarColor }]}>
              <AvatarDisplay avatarKey={user.avatarKey} username={user.username} size={80} fontSize={34} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Name + edit */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>@{user.username}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.7}>
              <Feather name="edit-2" size={14} color="#60A5FA" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Member since */}
          <View style={styles.memberSince}>
            <Feather name="calendar" size={12} color="#8A8A9A" />
            <Text style={styles.memberSinceText}>Member since {formatDate(user.createdAt)}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard value={roomsCreated.length} label="Created" icon="plus-circle" color="#3B82F6" />
            <StatCard value={roomsJoined.length}  label="Joined"  icon="log-in"     color="#10B981" />
            <StatCard value={myRooms.length}       label="Total"   icon="layers"     color="#F59E0B" />
          </View>

          {/* Rooms created */}
          {roomsCreated.length > 0 && (
            <Section title="My debates">
              {roomsCreated.slice(0, 5).map((room) => (
                <RoomRow key={room.id} room={room} onPress={() => router.push(`/room/${room.id}`)} />
              ))}
            </Section>
          )}

          {/* Rooms joined */}
          {roomsJoined.length > 0 && (
            <Section title="Debates I joined">
              {roomsJoined.slice(0, 5).map((room) => (
                <RoomRow key={room.id} room={room} onPress={() => router.push(`/room/${room.id}`)} />
              ))}
            </Section>
          )}

          {/* Account actions */}
          <Section title="Account">
            <ActionRow icon="slash" label="Blocked users" onPress={() => router.push('/blocked')} />
            <ActionRow
              icon="log-out"
              label={isLoggingOut ? 'Signing out…' : 'Sign out'}
              onPress={handleLogout}
              color="#EF4444"
              disabled={isLoggingOut}
              loading={isLoggingOut}
            />
            <ActionRow
              icon="trash-2"
              label="Delete account"
              onPress={handleDeleteAccount}
              color="#EF4444"
              disabled={isLoggingOut}
            />
          </Section>
        </View>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Edit profile</Text>

            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
              maxLength={30}
              placeholderTextColor="#8A8A9A"
            />

            <Text style={styles.fieldLabel}>Avatar color</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLOR_KEYS.map((key) => {
                const selected = editAvatarKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: AVATAR_COLORS[key] },
                      selected && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setEditAvatarKey(key)}
                    activeOpacity={0.8}
                  >
                    {selected && <Feather name="check" size={14} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {editError ? <Text style={styles.editError}>{editError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, editSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={editSaving}
                activeOpacity={0.8}
              >
                {editSaving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ── Sub-components ── */

function StatCard({ value, label, icon, color }: { value: number; label: string; icon: any; color: string }) {
  return (
    <View style={[statStyles.card, { borderColor: `${color}25` }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  label: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#8A8A9A' },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  title: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A8A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
});

function RoomRow({ room, onPress }: { room: any; onPress: () => void }) {
  const emoji = CATEGORY_EMOJI[room.category] ?? '💬';
  return (
    <TouchableOpacity style={roomRowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={roomRowStyles.emojiWrap}>
        <Text style={roomRowStyles.emoji}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={roomRowStyles.title} numberOfLines={1}>{room.title}</Text>
        <Text style={roomRowStyles.sub}>{room.memberCount} members</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#8A8A9A" />
    </TouchableOpacity>
  );
}

const roomRowStyles = StyleSheet.create({
  row: {
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 12,
  },
  emojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2A2A35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  title: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A', marginTop: 1 },
});

function ActionRow({
  icon, label, onPress, color = '#F0F0F5', disabled, loading,
}: { icon: any; label: string; onPress: () => void; color?: string; disabled?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity
      style={[actionStyles.row, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} style={{ width: 20 }} />
        : <Feather name={icon} size={18} color={color} />
      }
      <Text style={[actionStyles.label, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={15} color="#2A2A35" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 12,
  },
  label: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});

/* ── Main styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  cover: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  coverAccent: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  avatarWrapper: {
    position: 'absolute',
    bottom: -40,
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 46,
    padding: 2,
    backgroundColor: '#0D0D0F',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 52,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  email: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#8A8A9A', marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#60A5FA' },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  memberSinceText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1A1A1F',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#F0F0F5',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A8A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#0D0D0F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A35',
    color: '#F0F0F5',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 12,
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editError: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#EF4444',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#F0F0F5' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
