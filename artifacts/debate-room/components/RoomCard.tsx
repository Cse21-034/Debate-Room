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

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  love:       { emoji: '❤️',  color: '#FB7185' },
  romance:    { emoji: '💫',  color: '#F472B6' },
  money:      { emoji: '💰',  color: '#FBBF24' },
  business:   { emoji: '💼',  color: '#34D399' },
  religion:   { emoji: '🕊️', color: '#A78BFA' },
  politics:   { emoji: '🏛️', color: '#60A5FA' },
  sports:     { emoji: '⚡',  color: '#FB923C' },
  technology: { emoji: '🤖',  color: '#22D3EE' },
  lifestyle:  { emoji: '🌿',  color: '#A3E635' },
  other:      { emoji: '💬',  color: '#94A3B8' },
};

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

function isRecentlyActive(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 30 * 60 * 1000;
}

type Props = {
  room: Room;
  onPress: () => void;
};

export default function RoomCard({ room, onPress }: Props) {
  const colors = useColors();
  const meta = CATEGORY_META[room.category] ?? { emoji: '💬', color: '#94A3B8' };
  const active = isRecentlyActive(room.lastActivityAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
    >
      {/* Left accent bar colored by category */}
      <View style={[styles.accent, { backgroundColor: meta.color }]} />

      <View style={styles.body}>
        {/* Top row: title + time */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {room.title}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTime(room.lastActivityAt)}
          </Text>
        </View>

        {/* Last message */}
        <Text
          style={[styles.lastMessage, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {room.lastMessage ?? 'No messages yet'}
        </Text>

        {/* Footer row */}
        <View style={styles.footer}>
          {/* Category chip with emoji */}
          <View style={[styles.categoryChip, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}35` }]}>
            <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
            <Text style={[styles.categoryText, { color: meta.color }]}>
              {room.category}
            </Text>
          </View>

          <View style={styles.footerRight}>
            {/* Live indicator */}
            {active && (
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}

            {/* Member count */}
            <View style={styles.statItem}>
              <Feather name="users" size={11} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {room.memberCount}
              </Text>
            </View>

            {/* Joined badge */}
            {room.isMember && (
              <View style={[styles.joinedBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Feather name="check" size={10} color={colors.primary} />
                <Text style={[styles.joinedText, { color: colors.primary }]}>Joined</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accent: {
    width: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
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
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  categoryEmoji: { fontSize: 11 },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#10B981',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  joinedText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});
