import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  type GestureResponderEvent,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Message } from '@/lib/api';
import AvatarDisplay from './AvatarDisplay';

type Props = {
  message: Message;
  isOwn: boolean;
  onLongPress: (message: Message, event: GestureResponderEvent) => void;
  onReplyQuotePress?: (messageId: string) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn, onLongPress, onReplyQuotePress }: Props) {
  const colors = useColors();

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
      {/* Avatar (other only) */}
      {!isOwn && (
        <AvatarDisplay
          avatarKey={message.senderAvatarKey}
          username={message.senderUsername}
          size={28}
        />
      )}

      <TouchableWithoutFeedback onLongPress={(e) => onLongPress(message, e)}>
        <View
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
        </View>
      </TouchableWithoutFeedback>
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
  wrapperOwn: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
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
});
