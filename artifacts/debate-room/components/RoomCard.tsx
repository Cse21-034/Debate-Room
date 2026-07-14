import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Room } from '@/lib/api';
import AvatarDisplay from './AvatarDisplay';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return d.toLocaleDateString();
}

type Props = {
  room: Room;
  onPress: () => void;
};

export default function RoomCard({ room, onPress }: Props) {
  const colors = useColors();

  const categoryColor = getCategoryColor(room.category);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {room.title}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTime(room.lastActivityAt)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {/* Category chip */}
          <View style={[styles.categoryChip, { backgroundColor: `${categoryColor}20`, borderColor: `${categoryColor}40` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {room.category}
            </Text>
          </View>

          {/* Member count */}
          <View style={styles.statItem}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {room.memberCount}
            </Text>
          </View>

          {/* Member badge */}
          {room.isMember && (
            <View style={[styles.memberBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.memberText, { color: colors.primary }]}>Joined</Text>
            </View>
          )}
        </View>
      </View>

      {/* Last message */}
      {room.lastMessage ? (
        <Text
          style={[styles.lastMessage, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {room.lastMessage}
        </Text>
      ) : (
        <Text style={[styles.lastMessage, { color: colors.mutedForeground }]}>
          No messages yet
        </Text>
      )}
    </TouchableOpacity>
  );
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    love: '#FB7185',
    romance: '#F472B6',
    money: '#FBBF24',
    business: '#34D399',
    religion: '#A78BFA',
    politics: '#60A5FA',
    sports: '#FB923C',
    technology: '#22D3EE',
    lifestyle: '#A3E635',
    other: '#94A3B8',
  };
  return map[category] ?? '#94A3B8';
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    gap: 6,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  memberBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  memberText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
