import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { avatarPalette, initialsOf } from '../lib/format';
import { colors, fonts } from '../theme';

interface AvatarProps {
  name: string | null | undefined;
  size?: number;
  overdue?: boolean;
}

export const Avatar = ({ name, size = 46, overdue = false }: AvatarProps) => {
  const palette = avatarPalette(name ?? 'MiniLedger');
  const background = overdue ? colors.coralSoft : palette.background;
  const foreground = overdue ? colors.coralDeep : palette.foreground;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: foreground, fontSize: size * 0.34 },
        ]}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bold,
    letterSpacing: -0.2,
  },
});
