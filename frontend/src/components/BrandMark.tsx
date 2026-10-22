import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme';

interface BrandMarkProps {
  size?: number;
  tone?: 'dark' | 'light';
}

export const BrandMark = ({ size = 42, tone = 'dark' }: BrandMarkProps) => {
  const dark = tone === 'dark';

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.31,
          backgroundColor: dark ? colors.forest : colors.accent,
        },
      ]}
    >
      <Ionicons
        name="wallet"
        size={size * 0.46}
        color={dark ? colors.accent : colors.forest}
      />
      <View
        style={[
          styles.dot,
          {
            width: size * 0.17,
            height: size * 0.17,
            borderRadius: size * 0.085,
            backgroundColor: dark ? colors.coral : colors.forest,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: '18%',
    top: '18%',
  },
});
