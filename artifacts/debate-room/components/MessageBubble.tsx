import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  type GestureResponderEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Message } from '@/lib/api';
import AvatarDisplay from './AvatarDisplay';

type Props = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  onLongPress: (message: Message, event: GestureResponderEvent) => void;
  onReplyQuotePress?: (messageId: string) => void;
  onSwipeReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SWIPE_THRESHOLD = 52;

export default function MessageBubble({
  message,
  isOwn,
  currentUserId,
  onLongPress,
  onReplyQuotePress,
  onSwipeReply,
  onReact,
}: Props) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0)).current;
  const hasTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        // Only horizontal swipes, and only rightward for others / leftward hidden (both dirs allowed but capped)
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20 && g.dx > 0,
      onPanResponderGrant: () => {
        hasTriggered.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) return;
        const clampedDx = Math.min(g.dx, 80);
        translateX.setValue(clampedDx);

        // Scale up the reply icon as we drag
        const progress = Math.min(clampedDx / SWIPE_THRESHOLD, 1);
        replyIconScale.setValue(progress);

        // Haptic pop at threshold
        if (!hasTriggered.current && g.dx >= SWIPE_THRESHOLD && onSwipeReply && !message.isDeleted) {
          hasTriggered.current = true;
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      },
      onPanResponderRelease: (_, g) => {
        if (hasTriggered.current && onSwipeReply && !message.isDeleted) {
          onSwipeReply(message);
        }
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 200,
          }),
          Animated.spring(replyIconScale, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 200,
          }),
        ]).start(() => {
          hasTriggered.current = false;
        });
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(replyIconScale, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    }),
  ).current;

  if (message.isDeleted) {
    return (
      <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.deletedText, { color: colors.mutedForeground }]}>
            Message deleted
          </Text>
        </View>
      </View>
    );
  }

  const bubbleBg = isOwn ? colors.myBubble : colors.otherBubble;
  const textColor = isOwn ? colors.myBubbleText : colors.otherBubbleText;

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {/* Swipe reply icon (shown behind bubble as you drag) */}
      <Animated.View
        style={[
          styles.replyIconContainer,
          isOwn ? styles.replyIconLeft : styles.replyIconRight,
          { transform: [{ scale: replyIconScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={styles.replyIconBg}>
          <Feather name="corner-up-left" size={16} color="#60A5FA" />
        </View>
      </Animated.View>

      {/* Avatar (other only) */}
      {!isOwn && (
        <AvatarDisplay
          avatarKey={message.senderAvatarKey}
          username={message.senderUsername}
          size={28}
        />
      )}

      {/* Bubble — draggable */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={(e) => onLongPress(message, e)}
          delayLongPress={320}
          style={[
            styles.bubble,
            { backgroundColor: bubbleBg },
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          {/* Sender name (other only) */}
          {!isOwn && (
            <Text style={styles.senderName}>{message.senderUsername}</Text>
          )}

          {/* Reply quote */}
          {message.replyToId && message.replyToBody && (
            <TouchableOpacity
              onPress={() => onReplyQuotePress?.(message.replyToId!)}
              style={[
                styles.replyQuote,
                { borderLeftColor: isOwn ? 'rgba(255,255,255,0.5)' : colors.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.replyUsername,
                  { color: isOwn ? 'rgba(255,255,255,0.75)' : colors.primary },
                ]}
              >
                {message.replyToSenderUsername}
              </Text>
              <Text
                style={[
                  styles.replyBody,
                  { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground },
                ]}
                numberOfLines={2}
              >
                {message.replyToBody}
              </Text>
            </TouchableOpacity>
          )}

          {/* Message body */}
          <Text style={[styles.body, { color: textColor }]}>{message.body}</Text>

          {/* Timestamp */}
          <Text
            style={[
              styles.time,
              { color: isOwn ? 'rgba(255,255,255,0.6)' : colors.mutedForeground },
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
        </TouchableOpacity>

        {/* Reaction pills */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={[styles.reactionsRow, isOwn ? styles.reactionsRowOwn : styles.reactionsRowOther]}>
            {message.reactions.map((r) => {
              const iMine = currentUserId ? r.userIds.includes(currentUserId) : false;
              return (
                <TouchableOpacity
                  key={r.emoji}
                  style={[styles.reactionPill, iMine && styles.reactionPillMine]}
                  onPress={() => onReact?.(message, r.emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.reactionCount, iMine && styles.reactionCountMine]}>
                    {r.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 12,
    marginVertical: 3,
    gap: 6,
  },
  wrapperOwn: { justifyContent: 'flex-end' },
  wrapperOther: { justifyContent: 'flex-start' },

  replyIconContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    zIndex: 0,
  },
  replyIconLeft: { left: 0 },
  replyIconRight: { left: 36 },
  replyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bubble: {
    maxWidth: 280,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  senderName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#60A5FA',
    marginBottom: 2,
  },
  replyQuote: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginBottom: 4,
    gap: 2,
  },
  replyUsername: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  replyBody: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  deletedText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionsRowOwn: { justifyContent: 'flex-end' },
  reactionsRowOther: { justifyContent: 'flex-start' },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  reactionPillMine: {
    backgroundColor: '#1E2A45',
    borderColor: '#3B82F6',
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#8A8A9A',
  },
  reactionCountMine: { color: '#60A5FA' },
});
