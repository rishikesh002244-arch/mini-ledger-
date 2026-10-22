import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LoanStatus } from '../types';
import { colors, fonts, radius } from '../theme';

interface StatusPillProps {
  status: LoanStatus;
  label?: string;
}

const TONES: Record<LoanStatus, { background: string; foreground: string; label: string }> = {
  overdue: { background: colors.coralSoft, foreground: colors.coralDeep, label: 'Overdue' },
  pending: { background: colors.accentMuted, foreground: colors.forest, label: 'Pending' },
  repaid: { background: '#E9F3EC', foreground: '#2F6B4C', label: 'Repaid' },
};

export const StatusPill = ({ status, label }: StatusPillProps) => {
  const tone = TONES[status];

  return (
    <View style={[styles.pill, { backgroundColor: tone.background }]}>
      <View style={[styles.dot, { backgroundColor: tone.foreground }]} />
      <Text style={[styles.label, { color: tone.foreground }]}>{label ?? tone.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
