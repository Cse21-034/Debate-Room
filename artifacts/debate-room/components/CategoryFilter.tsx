import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';

export const CATEGORIES = [
  { key: 'all',        label: 'All',        emoji: '✨' },
  { key: 'love',       label: 'Love',       emoji: '❤️' },
  { key: 'romance',    label: 'Romance',    emoji: '💫' },
  { key: 'money',      label: 'Money',      emoji: '💰' },
  { key: 'business',   label: 'Business',   emoji: '💼' },
  { key: 'religion',   label: 'Religion',   emoji: '🕊️' },
  { key: 'politics',   label: 'Politics',   emoji: '🏛️' },
  { key: 'sports',     label: 'Sports',     emoji: '⚡' },
  { key: 'technology', label: 'Tech',       emoji: '🤖' },
  { key: 'lifestyle',  label: 'Lifestyle',  emoji: '🌿' },
  { key: 'other',      label: 'Other',      emoji: '💬' },
];

type Props = {
  selected: string;
  onSelect: (key: string) => void;
};

export default function CategoryFilter({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const active = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[styles.card, active && styles.cardActive]}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {cat.label}
            </Text>
            {active && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: '#2A2A35',
    minWidth: 64,
  },
  cardActive: {
    backgroundColor: '#1E2D4D',
    borderColor: '#3B82F6',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#8A8A9A',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#60A5FA',
    fontFamily: 'Inter_600SemiBold',
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3B82F6',
  },
});
