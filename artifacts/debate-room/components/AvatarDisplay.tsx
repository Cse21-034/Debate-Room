import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AVATAR_COLORS } from '@/constants/colors';

type Props = {
  avatarKey: string;
  username: string;
  size?: number;
  fontSize?: number;
};

export default function AvatarDisplay({ avatarKey, username, size = 40, fontSize }: Props) {
  const color = AVATAR_COLORS[avatarKey] ?? '#60A5FA';
  const initial = (username[0] ?? '?').toUpperCase();
  const textSize = fontSize ?? Math.round(size * 0.4);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}25`,
          borderColor: `${color}60`,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: textSize, color }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initial: {
    fontFamily: 'Inter_700Bold',
  },
});
