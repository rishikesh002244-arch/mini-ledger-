import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { loansApi } from '../api/loans';
import { ApiClientError } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { formatCurrency, formatPhone, greeting } from '../lib/format';
import type { Loan, LoanFilter } from '../types';
import { colors, fonts, shadow, spacing, text } from '../theme';
import { SummaryCard } from '../components/SummaryCard';
import { FilterChips } from '../components/FilterChips';
import { LoanCard } from '../components/LoanCard';
import { EmptyState } from '../components/EmptyState';
import { ReceiptModal } from '../components/ReceiptModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Avatar } from '../components/Avatar';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const EMPTY_COPY: Record<LoanFilter, { title: string; message: string }> = {
  all: {
    title: 'No loans yet',
    message: 'Add the first entry and keep every borrowed rupee accounted for.',
  },
  pending: {
    title: 'Nothing pending',
    message: 'Every loan has either been repaid or is running late. Add a new entry to keep going.',
  },
  overdue: {
    title: 'Nothing overdue',
    message: 'Friends are on time. You can relax — or add a new loan to test the red state.',
  },
  repaid: {
    title: 'No repayments yet',
    message: 'When a friend pays you back, mark it as repaid and it will appear here.',
  },
};

export const DashboardScreen = ({ navigation }: Props) => {
  const { token, user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<LoanFilter>('all');
  const [receiptLoan, setReceiptLoan] = useState<Loan | null>(null);
  const [repayTarget, setRepayTarget] = useState<Loan | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => loansApi.summary(token as string),
    enabled: Boolean(token),
  });

  const loansQuery = useQuery({
    queryKey: queryKeys.loans(filter),
    queryFn: () => loansApi.list(token as string, filter),
    enabled: Boolean(token),
  });

  const repayMutation = useMutation({
    mutationFn: (loan: Loan) => loansApi.repay(token as string, loan.id),
    onSuccess: async (result) => {
      setRepayingId(null);
      setRepayTarget(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      if (result.alreadyRepaid) return;
    },
    onError: (error) => {
      setRepayingId(null);
      setRepayTarget(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message =
        error instanceof ApiClientError ? error.message : 'Could not mark this loan as repaid.';
      setActionError(message);
    },
  });

  const loans = useMemo(() => {
    const rank: Record<Loan['status'], number> = { overdue: 0, pending: 1, repaid: 2 };

    return [...(loansQuery.data?.loans ?? [])].sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }, [loansQuery.data]);
  const summary = summaryQuery.data;

  const counts = summary
    ? {
        all: summary.totalLoans,
        pending: summary.pendingCount,
        overdue: summary.overdueCount,
        repaid: summary.repaidCount,
      }
    : undefined;

  const refreshing = loansQuery.isRefetching || summaryQuery.isRefetching;

  const onRefresh = () => {
    void summaryQuery.refetch();
    void loansQuery.refetch();
  };

  const confirmRepay = () => {
    if (!repayTarget) return;
    setRepayingId(repayTarget.id);
    repayMutation.mutate(repayTarget);
  };

  const logout = async () => {
    setLogoutVisible(false);
    await signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name ?? formatPhone(user?.phone ?? '')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setLogoutVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.inkSoft} />
          </Pressable>
          <Avatar name={user?.name ?? user?.phone ?? 'You'} size={42} />
        </View>
      </View>

      <View style={styles.summaryWrap}>
        <SummaryCard summary={summary} loading={summaryQuery.isLoading} />
      </View>

      <View style={styles.listHeader}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>Your ledger</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {summary ? `${summary.totalLoans} ${summary.totalLoans === 1 ? 'entry' : 'entries'}` : '—'}
            </Text>
          </View>
        </View>

        <FilterChips value={filter} onChange={setFilter} counts={counts} />
      </View>

      {actionError ? (
        <Pressable onPress={() => setActionError(null)} style={styles.actionError}>
          <Ionicons name="alert-circle" size={15} color={colors.coralDeep} />
          <Text style={styles.actionErrorText}>{actionError}</Text>
          <Ionicons name="close" size={14} color={colors.coralDeep} />
        </Pressable>
      ) : null}

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            onRepay={setRepayTarget}
            onOpenReceipt={setReceiptLoan}
            repaying={repayingId === item.id}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 120 + insets.bottom },
          loans.length === 0 ? styles.listEmptyContent : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.forest}
            colors={[colors.forest]}
          />
        }
        ListEmptyComponent={
          loansQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.forest} size="small" />
              <Text style={styles.loadingText}>Opening your ledger…</Text>
            </View>
          ) : (
            <EmptyState
              title={EMPTY_COPY[filter].title}
              message={EMPTY_COPY[filter].message}
              icon={filter === 'repaid' ? 'checkmark-done-outline' : 'receipt-outline'}
              actionLabel={filter === 'all' ? 'Add your first loan' : 'Show all entries'}
              onAction={() => {
                if (filter === 'all') navigation.navigate('AddLoan');
                else setFilter('all');
              }}
            />
          )
        }
        ListFooterComponent={<View style={styles.listFooter} />}
      />

      <Pressable
        onPress={() => navigation.navigate('AddLoan')}
        accessibilityRole="button"
        accessibilityLabel="Add a loan"
        style={({ pressed }) => [
          styles.fab,
          { bottom: Math.max(insets.bottom, 14) + 16 },
          pressed ? styles.fabPressed : null,
        ]}
      >
        <Ionicons name="add" size={21} color={colors.forestDeep} />
        <Text style={styles.fabText}>Add loan</Text>
      </Pressable>

      <ReceiptModal loan={receiptLoan} onClose={() => setReceiptLoan(null)} />

      <ConfirmDialog
        visible={Boolean(repayTarget)}
        title="Mark as repaid?"
        message={
          repayTarget
            ? `${repayTarget.friendName} has paid you ${formatCurrency(repayTarget.amount)}. This will move the entry to your repaid list.`
            : ''
        }
        confirmLabel="Yes, received"
        loading={repayMutation.isPending}
        onConfirm={confirmRepay}
        onCancel={() => {
          if (!repayMutation.isPending) setRepayTarget(null);
        }}
      />

      <ConfirmDialog
        visible={logoutVisible}
        title="Sign out of MiniLedger?"
        message="Your ledger stays safe on the server. You can sign back in with a new OTP."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => void logout()}
        onCancel={() => setLogoutVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerText: { flex: 1, paddingRight: 12 },
  greeting: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: colors.ink,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  summaryWrap: {
    paddingHorizontal: spacing.xl,
  },
  listHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: 22,
    paddingBottom: 12,
    gap: 12,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    ...text.h2,
    fontSize: 18,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.forestLight,
  },
  liveText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.muted,
  },
  actionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: spacing.xl,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.coralSoft,
  },
  actionErrorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.coralDeep,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 2,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  loadingWrap: {
    paddingTop: 54,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  listFooter: { height: 12 },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 15,
    paddingRight: 19,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentDeep,
    ...shadow.floating,
  },
  fabPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: colors.accentDeep,
  },
  fabText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.forestDeep,
    letterSpacing: 0.1,
  },
});
