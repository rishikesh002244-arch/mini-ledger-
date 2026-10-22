import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Loan } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { resolveImageUrl } from '../lib/config';
import { colors, fonts, radius } from '../theme';

interface ReceiptModalProps {
  loan: Loan | null;
  onClose: () => void;
}

export const ReceiptModal = ({ loan, onClose }: ReceiptModalProps) => {
  const uri = resolveImageUrl(loan?.receiptImageUrl);

  return (
    <Modal
      visible={Boolean(loan)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Receipt</Text>
              <Text style={styles.title}>{loan?.friendName}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close receipt"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.imageCard}>
            {uri ? (
              <Image source={{ uri }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={36} color={colors.faint} />
                <Text style={styles.noImageText}>No receipt attached</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={styles.metaLabel}>Amount</Text>
              <Text style={styles.metaValue}>
                {loan ? formatCurrency(loan.amount) : '—'}
              </Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text style={styles.metaValue}>{loan ? formatDate(loan.dueDate) : '—'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  safeArea: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    padding: 18,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 21,
    color: colors.ink,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    backgroundColor: colors.forestDeep,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 380,
  },
  image: { width: '100%', height: '100%' },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noImageText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  metaRight: { alignItems: 'flex-end' },
  metaLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    color: colors.ink,
    marginTop: 3,
  },
});
