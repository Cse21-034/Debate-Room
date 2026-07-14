import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

export const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'love', label: 'Love' },
  { key: 'romance', label: 'Romance' },
  { key: 'money', label: 'Money' },
  { key: 'business', label: 'Business' },
  { key: 'religion', label: 'Religion' },
  { key: 'politics', label: 'Politics' },
  { key: 'sports', label: 'Sports' },
  { key: 'technology', label: 'Technology' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'other', label: 'Other' },
];

type Props = {
  selected: string;
  onSelect: (key: string) => void;
};

export default function CategoryFilter({ selected, onSelect }: Props) {
  const colors = useColors();

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
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? '#FFFFFF' : colors.mutedForeground,
                  fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
  },
});
