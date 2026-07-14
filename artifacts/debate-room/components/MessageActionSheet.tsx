import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Message } from '@/lib/api';

type Props = {
  visible: boolean;
  message: Message | null;
  isOwn: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReport: () => void;
};

const SHEET_HEIGHT = 280;

export default function MessageActionSheet({
  visible,
  message,
  isOwn,
  onClose,
  onReply,
  onCopy,
  onDelete,
  onReport,
}: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!message) return null;

  const handleAction = (fn: () => void) => {
    onClose();
    // Small delay so sheet closes before action runs
    setTimeout(fn, 150);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Message preview */}
          <View style={styles.preview}>
            <View style={styles.previewBar} />
            <View style={styles.previewContent}>
              <Text style={styles.previewSender} numberOfLines={1}>
                {message.senderUsername}
              </Text>
              <Text style={styles.previewBody} numberOfLines={2}>
                {message.body}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Reply */}
          <TouchableOpacity
            style={styles.action}
            onPress={() => handleAction(onReply)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Feather name="corner-up-left" size={20} color="#60A5FA" />
            </View>
            <Text style={styles.actionLabel}>Reply</Text>
          </TouchableOpacity>

          {/* Copy */}
          <TouchableOpacity
            style={styles.action}
            onPress={() => handleAction(onCopy)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Feather name="copy" size={20} color="#F0F0F5" />
            </View>
            <Text style={styles.actionLabel}>Copy text</Text>
          </TouchableOpacity>

          {/* Delete (own) or Report (others) */}
          {isOwn ? (
            <TouchableOpacity
              style={styles.action}
              onPress={() => handleAction(onDelete)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.actionLabel, styles.destructive]}>Delete message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.action}
              onPress={() => handleAction(onReport)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="flag" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.actionLabel, { color: '#F59E0B' }]}>Report</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: '#2A2A35',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  previewBar: {
    width: 3,
    height: '100%',
    minHeight: 36,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  previewContent: { flex: 1 },
  previewSender: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#60A5FA',
    marginBottom: 3,
  },
  previewBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8A8A9A',
    lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: '#2A2A35' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 16,
  },
  actionIcon: { width: 28, alignItems: 'center' },
  actionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#F0F0F5',
  },
  destructive: { color: '#EF4444' },
});
