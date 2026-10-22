import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { LoanSummary } from '../types';
import { formatCurrency } from '../lib/format';
import { colors, fonts, radius } from '../theme';

interface SummaryCardProps {
  summary?: LoanSummary;
  loading?: boolean;
}

export const SummaryCard = ({ summary, loading = false }: SummaryCardProps) => {
  const recoveredPercent =
    summary && summary.totalLent > 0
      ? Math.min(100, Math.round((summary.totalRepaid / summary.totalLent) * 100))
      : 0;

  return (
    <LinearGradient
      colors={[colors.forestLight, colors.forest, colors.forestDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.ring} />
      <View pointerEvents="none" style={styles.ringSmall} />

      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Total lent</Text>
        <View style={styles.timePill}>
          <Ionicons name="time-outline" size={12} color={colors.accent} />
          <Text style={styles.timePillText}>All time</Text>
        </View>
      </View>

      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        {summary ? formatCurrency(summary.totalLent) : '₹—'}
      </Text>

      <Text style={styles.subline}>
        {summary
          ? `${formatCurrency(summary.outstanding)} outstanding · ${summary.totalLoans} ${
              summary.totalLoans === 1 ? 'entry' : 'entries'
            }`
          : loading
            ? 'Loading your ledger…'
            : 'No ledger data yet'}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <View style={styles.statHeader}>
            <View style={styles.statIcon}>
              <Ionicons name="arrow-down" size={11} color={colors.accent} />
            </View>
            <Text style={styles.statLabel}>Repaid</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {summary ? formatCurrency(summary.totalRepaid) : '₹—'}
          </Text>
          <Text style={styles.statMeta}>
            {summary ? `${summary.repaidCount} settled` : '—'}
          </Text>
        </View>

        <View style={styles.statTile}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, styles.statIconAlert]}>
              <Ionicons name="alert" size={11} color="#FFB2A3" />
            </View>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <Text style={[styles.statValue, { color: '#FFB7A8' }]}>
            {summary ? formatCurrency(summary.totalOverdue) : '₹—'}
          </Text>
          <Text style={styles.statMeta}>
            {summary ? `${summary.overdueCount} late` : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${recoveredPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{recoveredPercent}% recovered</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#072A1F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.accent,
    opacity: 0.08,
    right: -70,
    top: -90,
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(217, 242, 124, 0.16)',
    right: -30,
    top: -60,
  },
  ringSmall: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: 'rgba(217, 242, 124, 0.12)',
    right: 30,
    top: 26,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  timePillText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
  },
  amount: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 50,
    letterSpacing: -1.6,
    color: colors.white,
    marginTop: 10,
  },
  subline: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(217,242,124,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconAlert: {
    backgroundColor: 'rgba(255,178,163,0.16)',
  },
  statLabel: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.65)',
  },
  statValue: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.4,
    marginTop: 7,
  },
  statMeta: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  progressText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
  },
});
