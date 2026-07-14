import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
};

export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

export function RoomCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Skeleton width="60%" height={16} />
        <Skeleton width={30} height={12} />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={40} height={12} />
      </View>
      <Skeleton width="80%" height={12} style={{ marginTop: 8 } as object} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
