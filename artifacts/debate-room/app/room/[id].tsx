import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Clipboard,
  type GestureResponderEvent,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Message } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  getSocket,
  joinRoomChannel,
  leaveRoomChannel,
  emitTypingStart,
  emitTypingStop,
} from '@/lib/socket';
import MessageBubble from '@/components/MessageBubble';
import MessageActionSheet from '@/components/MessageActionSheet';
import AvatarDisplay from '@/components/AvatarDisplay';

const BANNED_WORDS = ['fuck', 'shit', 'bitch', 'nigger', 'faggot'];
function filterText(text: string): string {
  let out = text;
  for (const w of BANNED_WORDS) {
    out = out.replace(new RegExp(w, 'gi'), '*'.repeat(w.length));
  }
  return out;
}

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsernames, setTypingUsernames] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Action sheet state
  const [sheetMessage, setSheetMessage] = useState<Message | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  // Room data
  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.rooms.get(roomId),
    enabled: !!roomId,
  });

  // Set header title
  useEffect(() => {
    if (room) {
      navigation.setOptions({
        title: room.title,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push(`/room/${roomId}/info`)}
            style={{ marginRight: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="info" size={20} color="#F0F0F5" />
          </TouchableOpacity>
        ),
      });
    }
  }, [room, roomId]);

  // Load initial messages
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      try {
        const res = await api.messages.list(roomId, { limit: 30 });
        setMessages(res.messages);
        setHasMore(res.hasMore);
      } catch {
        // ignore
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [roomId]);

  // Socket.io real-time
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (!socket) return;

    joinRoomChannel(roomId);

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, body: '[message deleted]' } : m,
        ),
      );
    };

    const onOnlineCount = ({ count }: { count: number }) => {
      setOnlineCount(count);
    };

    const onTypingUpdate = ({ typingUsernames: names }: { typingUsernames: string[] }) => {
      setTypingUsernames(names.filter((n) => n !== user?.username));
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('online_count', onOnlineCount);
    socket.on('typing_update', onTypingUpdate);

    return () => {
      leaveRoomChannel(roomId);
      socket.off('new_message', onNewMessage);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('online_count', onOnlineCount);
      socket.off('typing_update', onTypingUpdate);
    };
  }, [roomId, user?.username]);

  // Load more messages (upward pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const res = await api.messages.list(roomId, { before: oldest?.id, limit: 30 });
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMore(res.hasMore);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, messages, roomId]);

  // Handle typing indicator
  const handleInputChange = (text: string) => {
    setInput(text);
    if (!isTypingRef.current && text.length > 0) {
      isTypingRef.current = true;
      emitTypingStart(roomId);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTypingStop(roomId);
      }
    }, 2000);
  };

  const handleSend = async () => {
    const body = filterText(input.trim());
    if (!body || sending) return;

    setSending(true);
    setInput('');
    isTypingRef.current = false;
    emitTypingStop(roomId);

    const currentReply = replyTo;
    setReplyTo(null);

    try {
      await api.messages.send(roomId, {
        body,
        replyToId: currentReply?.id ?? null,
      });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Opens the action sheet
  const openSheet = (message: Message) => {
    setSheetMessage(message);
    setSheetVisible(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleLongPress = useCallback(
    (message: Message, _event: GestureResponderEvent) => {
      if (message.isDeleted) return;
      openSheet(message);
    },
    [],
  );

  const handleSwipeReply = useCallback((message: Message) => {
    setReplyTo(message);
  }, []);

  // Action sheet handlers
  const handleSheetReply = () => {
    if (sheetMessage) setReplyTo(sheetMessage);
  };

  const handleSheetCopy = () => {
    if (sheetMessage) Clipboard.setString(sheetMessage.body);
  };

  const handleSheetDelete = () => {
    if (!sheetMessage) return;
    Alert.alert('Delete message', 'Delete this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.messages.delete(sheetMessage.id);
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleSheetReport = () => {
    if (!sheetMessage) return;
    Alert.alert('Report message', 'Why are you reporting this?', [
      { text: 'Spam', onPress: () => api.messages.report(sheetMessage.id, { reason: 'spam' }) },
      { text: 'Harassment', onPress: () => api.messages.report(sheetMessage.id, { reason: 'harassment' }) },
      { text: 'Hate speech', onPress: () => api.messages.report(sheetMessage.id, { reason: 'hate' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const isMember = room?.isMember ?? false;
  const isSheetOwn = sheetMessage?.senderId === user?.id;

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isOwn={item.senderId === user?.id}
      onLongPress={handleLongPress}
      onSwipeReply={handleSwipeReply}
      onReplyQuotePress={(msgId) => {
        const idx = messages.findIndex((m) => m.id === msgId);
        if (idx !== -1) {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true });
        }
      }}
    />
  );

  return (
    <View style={styles.container}>
      {/* Online indicator */}
      {onlineCount > 0 && (
        <View style={styles.onlineBar}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{onlineCount} online</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {initialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            onEndReached={loadMore}
            onEndReachedThreshold={0.2}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMoreIndicator}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Feather name="message-circle" size={48} color="#2A2A35" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubText}>
                  {isMember ? 'Be the first to say something!' : 'Join this debate to participate'}
                </Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Typing indicator */}
        {typingUsernames.length > 0 && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>
              {typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}

        {/* Input bar */}
        {isMember ? (
          <View
            style={[
              styles.inputBar,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8) },
            ]}
          >
            {/* Reply preview */}
            {replyTo && (
              <View style={styles.replyPreview}>
                <View style={styles.replyLine} />
                <View style={styles.replyContent}>
                  <Text style={styles.replyToName}>{replyTo.senderUsername}</Text>
                  <Text style={styles.replyToBody} numberOfLines={1}>{replyTo.body}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7} hitSlop={8}>
                  <Feather name="x" size={18} color="#8A8A9A" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={handleInputChange}
                placeholder="Say something..."
                placeholderTextColor="#8A8A9A"
                multiline
                maxLength={2000}
                returnKeyType="default"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || sending}
                style={[
                  styles.sendBtn,
                  (!input.trim() || sending) && styles.sendBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.joinBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8) }]}>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={async () => {
                try {
                  await api.rooms.join(roomId);
                  queryClient.invalidateQueries({ queryKey: ['room', roomId] });
                  queryClient.invalidateQueries({ queryKey: ['rooms'] });
                } catch (err: any) {
                  Alert.alert('Error', err.message);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.joinBtnText}>Join debate to participate</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Message action sheet */}
      <MessageActionSheet
        visible={sheetVisible}
        message={sheetMessage}
        isOwn={!!isSheetOwn}
        onClose={() => setSheetVisible(false)}
        onReply={handleSheetReply}
        onCopy={handleSheetCopy}
        onDelete={handleSheetDelete}
        onReport={handleSheetReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  onlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1A1A1F',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A35',
    gap: 6,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  onlineText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#10B981' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  messageList: { paddingVertical: 8 },
  loadMoreIndicator: { alignItems: 'center', padding: 12 },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#F0F0F5' },
  emptySubText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A', textAlign: 'center' },
  typingBar: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#0D0D0F' },
  typingText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A', fontStyle: 'italic' },
  inputBar: {
    backgroundColor: '#1A1A1F',
    borderTopWidth: 1,
    borderTopColor: '#2A2A35',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0F',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },
  replyLine: { width: 3, height: '100%', backgroundColor: '#3B82F6', borderRadius: 2 },
  replyContent: { flex: 1 },
  replyToName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#3B82F6', marginBottom: 2 },
  replyToBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#F0F0F5',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2A2A35' },
  joinBar: {
    backgroundColor: '#1A1A1F',
    borderTopWidth: 1,
    borderTopColor: '#2A2A35',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  joinBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  joinBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
