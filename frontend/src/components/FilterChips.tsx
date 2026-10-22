import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LoanFilter } from '../types';
import { colors, fonts, radius } from '../theme';

interface FilterChipsProps {
  value: LoanFilter;
  onChange: (filter: LoanFilter) => void;
  counts?: Partial<Record<LoanFilter, number>>;
}

const FILTERS: { key: LoanFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'repaid', label: 'Repaid' },
];

export const FilterChips = ({ value, onChange, counts }: FilterChipsProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {FILTERS.map((filter) => {
        const selected = filter.key === value;
        const count = counts?.[filter.key];

        return (
          <Pressable
            key={filter.key}
            onPress={() => onChange(filter.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected ? styles.chipSelected : null,
              pressed ? styles.chipPressed : null,
            ]}
          >
            {filter.key === 'overdue' && !selected ? (
              <View style={styles.overdueDot} />
            ) : null}
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {filter.label}
            </Text>
            {typeof count === 'number' ? (
              <Text style={[styles.count, selected ? styles.countSelected : null]}>
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  chipPressed: { opacity: 0.8 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  labelSelected: { color: colors.white },
  count: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: colors.muted,
    backgroundColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
    minWidth: 18,
    textAlign: 'center',
  },
  countSelected: {
    color: colors.accent,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  overdueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.coral,
  },
});
