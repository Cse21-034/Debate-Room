import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Message } from '@/lib/api';
import { api } from '@/lib/api';

const REASONS = [
  { key: 'spam',        label: 'Spam',          icon: 'alert-octagon' as const, desc: 'Repetitive or irrelevant content' },
  { key: 'harassment',  label: 'Harassment',    icon: 'user-x'        as const, desc: 'Targeting or bullying someone' },
  { key: 'hate',        label: 'Hate speech',   icon: 'slash'         as const, desc: 'Hateful or discriminatory language' },
  { key: 'other',       label: 'Other',         icon: 'more-horizontal' as const, desc: 'Something else entirely' },
];

const SHEET_HEIGHT = 520;

type Props = {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
};

type Step = 'pick' | 'submitting' | 'done';

export default function ReportModal({ visible, message, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [reason, setReason] = useState('');
  const [note,   setNote]   = useState('');
  const [step,   setStep]   = useState<Step>('pick');

  useEffect(() => {
    if (visible) {
      setReason('');
      setNote('');
      setStep('pick');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!message) return null;

  const handleSubmit = async () => {
    if (!reason) return;
    setStep('submitting');
    try {
      await api.messages.report(message.id, { reason, note: note.trim() || undefined });
      setStep('done');
    } catch {
      setStep('pick');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === 'done' ? onClose : undefined} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle bar */}
          <View style={styles.handle} />

          {step === 'done' ? (
            /* ── Success state ── */
            <View style={styles.doneContainer}>
              <View style={styles.doneIcon}>
                <Feather name="check" size={32} color="#10B981" />
              </View>
              <Text style={styles.doneTitle}>Report submitted</Text>
              <Text style={styles.doneBody}>
                Thanks for letting us know. Our team will review this message and take action if it
                violates community guidelines.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

          ) : (
            /* ── Reason picker ── */
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Report message</Text>
                <TouchableOpacity onPress={onClose} hitSlop={10}>
                  <Feather name="x" size={20} color="#8A8A9A" />
                </TouchableOpacity>
              </View>

              {/* Message preview */}
              <View style={styles.preview}>
                <View style={styles.previewBar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewSender} numberOfLines={1}>
                    {message.senderUsername}
                  </Text>
                  <Text style={styles.previewBody} numberOfLines={2}>
                    {message.body}
                  </Text>
                </View>
              </View>

              <Text style={styles.reasonLabel}>Why are you reporting this?</Text>

              {/* Reason options */}
              {REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.reasonRow, active && styles.reasonRowActive]}
                    onPress={() => setReason(r.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.reasonIcon, active && styles.reasonIconActive]}>
                      <Feather name={r.icon} size={16} color={active ? '#60A5FA' : '#8A8A9A'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reasonTitle, active && styles.reasonTitleActive]}>
                        {r.label}
                      </Text>
                      <Text style={styles.reasonDesc}>{r.desc}</Text>
                    </View>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Optional note */}
              {reason && (
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note (optional)…"
                  placeholderTextColor="#8A8A9A"
                  multiline
                  maxLength={300}
                />
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, (!reason || step === 'submitting') && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!reason || step === 'submitting'}
                activeOpacity={0.8}
              >
                {step === 'submitting' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Submit report</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderTopWidth: 1,
    borderColor: '#2A2A35',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#2A2A35',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#F0F0F5',
  },
  preview: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0F',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  previewBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  previewSender: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#F59E0B',
    marginBottom: 2,
  },
  previewBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#8A8A9A',
    lineHeight: 18,
  },
  reasonLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A8A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0F',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 12,
  },
  reasonRowActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#0F1A2E',
  },
  reasonIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1A1A1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonIconActive: { backgroundColor: '#1E2D4D' },
  reasonTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#F0F0F5',
  },
  reasonTitleActive: { color: '#60A5FA' },
  reasonDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#8A8A9A',
    marginTop: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2A2A35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#3B82F6' },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  noteInput: {
    backgroundColor: '#0D0D0F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A35',
    color: '#F0F0F5',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    padding: 12,
    minHeight: 72,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  // Done state
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0D2E1F',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doneTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#F0F0F5',
  },
  doneBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8A8A9A',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  doneBtn: {
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: '#2A2A35',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#F0F0F5',
  },
});
