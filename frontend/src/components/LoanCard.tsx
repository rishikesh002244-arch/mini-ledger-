import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Loan } from '../types';
import { dueLabel, formatCurrency } from '../lib/format';
import { colors, fonts, radius, shadow } from '../theme';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';

interface LoanCardProps {
  loan: Loan;
  onRepay: (loan: Loan) => void;
  onOpenReceipt: (loan: Loan) => void;
  repaying?: boolean;
}

export const LoanCard = ({ loan, onRepay, onOpenReceipt, repaying = false }: LoanCardProps) => {
  const overdue = loan.status === 'overdue';
  const repaid = loan.status === 'repaid';
  const hasReceipt = Boolean(loan.receiptImageUrl);

  return (
    <View style={[styles.card, overdue ? styles.cardOverdue : null]}>
      {overdue ? <View style={styles.rail} /> : null}

      <View style={styles.topRow}>
        <Avatar name={loan.friendName} overdue={overdue} />

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {loan.friendName}
          </Text>
          <View style={styles.dueRow}>
            <Ionicons
              name={overdue ? 'alert-circle-outline' : 'calendar-outline'}
              size={13}
              color={overdue ? colors.coralDeep : colors.muted}
            />
            <Text style={[styles.dueText, overdue ? styles.dueTextOverdue : null]}>
              {dueLabel(loan)}
            </Text>
          </View>
        </View>

        <View style={styles.money}>
          <Text style={[styles.amount, repaid ? styles.amountRepaid : null]}>
            {formatCurrency(loan.amount)}
          </Text>
          <View style={styles.pillWrap}>
            <StatusPill status={loan.status} />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <Pressable
          disabled={!hasReceipt}
          onPress={() => onOpenReceipt(loan)}
          accessibilityRole="button"
          accessibilityLabel={hasReceipt ? `View receipt for ${loan.friendName}` : 'No receipt attached'}
          style={({ pressed }) => [
            styles.receiptButton,
            !hasReceipt ? styles.receiptButtonEmpty : null,
            pressed && hasReceipt ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={hasReceipt ? 'receipt-outline' : 'document-outline'}
            size={14}
            color={hasReceipt ? colors.forest : colors.faint}
          />
          <Text style={[styles.receiptText, !hasReceipt ? styles.receiptTextEmpty : null]}>
            {hasReceipt ? 'View receipt' : 'No receipt'}
          </Text>
        </Pressable>

        {repaid ? (
          <View style={styles.settled}>
            <Ionicons name="checkmark-circle" size={16} color="#2F6B4C" />
            <Text style={styles.settledText}>Settled</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => onRepay(loan)}
            disabled={repaying}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${loan.friendName}'s loan as repaid`}
            style={({ pressed }) => [
              styles.repayButton,
              overdue ? styles.repayButtonOverdue : null,
              pressed && !repaying ? styles.pressed : null,
            ]}
          >
            {repaying ? (
              <ActivityIndicator
                size="small"
                color={overdue ? colors.white : colors.forest}
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={overdue ? colors.white : colors.forest}
                />
                <Text
                  style={[
                    styles.repayText,
                    overdue ? styles.repayTextOverdue : null,
                  ]}
                >
                  Mark repaid
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardOverdue: {
    backgroundColor: '#FFF8F6',
    borderColor: '#F0B4A9',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.coral,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  identity: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 3,
    paddingRight: 8,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  dueText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  dueTextOverdue: {
    color: colors.coralDeep,
    fontFamily: fonts.semibold,
  },
  money: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: fonts.displaySemibold,
    fontSize: 19,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  amountRepaid: {
    color: colors.muted,
  },
  pillWrap: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  receiptButtonEmpty: {
    backgroundColor: colors.surfaceMuted,
  },
  receiptText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.forest,
  },
  receiptTextEmpty: {
    color: colors.faint,
  },
  repayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 116,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.forest,
    backgroundColor: colors.white,
  },
  repayButtonOverdue: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  repayText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: colors.forest,
  },
  repayTextOverdue: {
    color: colors.white,
  },
  settled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: '#EAF4EE',
  },
  settledText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#2F6B4C',
  },
  pressed: {
    opacity: 0.75,
  },
});
