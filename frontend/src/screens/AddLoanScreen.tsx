import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { loansApi } from '../api/loans';
import { ApiClientError } from '../lib/api';
import {
  addDays,
  formatDate,
  formatShortDate,
  toYyyyMmDd,
} from '../lib/format';
import { colors, fonts, radius, shadow, spacing, text } from '../theme';
import { AppButton } from '../components/AppButton';
import { Field } from '../components/Field';

type Props = NativeStackScreenProps<RootStackParamList, 'AddLoan'>;

interface FormErrors {
  friendName?: string;
  amount?: string;
  dueDate?: string;
}

const QUICK_DATES = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

const DATE_STRIP_DAYS = 30;

export const AddLoanScreen = ({ navigation }: Props) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>(() => addDays(new Date(), 7));
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DATE_STRIP_DAYS }).map((_, index) => {
      const date = addDays(today, index);
      return {
        date,
        key: toYyyyMmDd(date),
        weekday: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
        day: date.getDate(),
        month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
      };
    });
  }, []);

  const selectedKey = toYyyyMmDd(dueDate);

  const pickReceipt = async () => {
    setFormError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Photo access is needed to attach a receipt. You can still save without one.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setReceipt(result.assets[0]);
        void Haptics.selectionAsync();
      }
    } catch {
      setFormError('Could not open the photo library. Please try again.');
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const parsedAmount = Number(amount.replace(/,/g, '').trim());

    if (friendName.trim().length < 2) {
      nextErrors.friendName = 'Enter the name of the friend you lent money to.';
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Enter an amount greater than ₹0.';
    } else if (parsedAmount > 1_000_000_000) {
      nextErrors.amount = 'That amount is too large.';
    }

    if (Number.isNaN(dueDate.getTime())) {
      nextErrors.dueDate = 'Pick a valid due date.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    setFormError(null);
    if (!validate() || !token) return;

    setSubmitting(true);

    try {
      await loansApi.create(token, {
        friendName: friendName.trim(),
        amount: amount.replace(/,/g, '').trim(),
        dueDate,
        receiptUri: receipt?.uri,
        receiptName: receipt?.fileName ?? undefined,
        receiptType: receipt?.mimeType ?? undefined,
        receiptFile: (receipt as { file?: Blob } | null)?.file ?? null,
      });

      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors({
          friendName: error.fieldErrors.friend_name,
          amount: error.fieldErrors.amount,
          dueDate: error.fieldErrors.due_date,
        });
        setFormError(error.message);
      } else {
        setFormError('Could not save this entry. Please try again.');
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close add loan screen"
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>New entry</Text>
        <View style={styles.topSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>ADD A LOAN</Text>
          <Text style={styles.heading}>Who owes you,{'\n'}and how much?</Text>

          <View style={styles.card}>
            <Field
              label="Friend's name"
              icon="person-outline"
              placeholder="e.g. Rahul Sharma"
              value={friendName}
              onChangeText={(value) => {
                setFriendName(value);
                setErrors((current) => ({ ...current, friendName: undefined }));
              }}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.friendName}
              returnKeyType="next"
            />

            <View style={styles.fieldGap} />

            <Field
              label="Amount lent"
              prefix="₹"
              placeholder="2,500"
              value={amount}
              onChangeText={(value) => {
                setAmount(value.replace(/[^\d.,]/g, ''));
                setErrors((current) => ({ ...current, amount: undefined }));
              }}
              keyboardType="decimal-pad"
              error={errors.amount}
              style={styles.amountInput}
            />

            <View style={styles.divider} />

            <View style={styles.dateHeader}>
              <View>
                <Text style={styles.label}>Due date</Text>
                <Text style={styles.dateValue}>{formatDate(dueDate)}</Text>
              </View>
              <View style={styles.calendarBadge}>
                <Ionicons name="calendar-outline" size={16} color={colors.forest} />
              </View>
            </View>

            <View style={styles.quickRow}>
              {QUICK_DATES.map((option) => {
                const optionDate = addDays(new Date(), option.days);
                const active = toYyyyMmDd(optionDate) === selectedKey;

                return (
                  <Pressable
                    key={option.days}
                    onPress={() => {
                      setDueDate(optionDate);
                      setErrors((current) => ({ ...current, dueDate: undefined }));
                    }}
                    style={[styles.quickChip, active ? styles.quickChipActive : null]}
                  >
                    <Text
                      style={[styles.quickChipText, active ? styles.quickChipTextActive : null]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
            >
              {dates.map((item) => {
                const active = item.key === selectedKey;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      setDueDate(item.date);
                      setErrors((current) => ({ ...current, dueDate: undefined }));
                    }}
                    style={[styles.dateChip, active ? styles.dateChipActive : null]}
                  >
                    <Text style={[styles.dateWeekday, active ? styles.dateTextActive : null]}>
                      {item.weekday}
                    </Text>
                    <Text style={[styles.dateDay, active ? styles.dateTextActive : null]}>
                      {item.day}
                    </Text>
                    <Text style={[styles.dateMonth, active ? styles.dateTextActiveSoft : null]}>
                      {item.month}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {errors.dueDate ? (
              <View style={styles.inlineError}>
                <Ionicons name="alert-circle" size={13} color={colors.coral} />
                <Text style={styles.inlineErrorText}>{errors.dueDate}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionLabel}>Receipt photo</Text>
          <Text style={styles.sectionCopy}>
            Attach a screenshot or photo of the transfer. Optional, but great for your records.
          </Text>

          {receipt ? (
            <View style={styles.receiptCard}>
              <Image source={{ uri: receipt.uri }} style={styles.receiptThumb} />
              <View style={styles.receiptInfo}>
                <Text style={styles.receiptName} numberOfLines={1}>
                  {receipt.fileName ?? 'Receipt attached'}
                </Text>
                <Text style={styles.receiptMeta}>
                  {receipt.mimeType ?? 'image'} ·{' '}
                  {receipt.fileSize ? `${Math.round(receipt.fileSize / 1024)} KB` : 'ready to upload'}
                </Text>
                <Pressable onPress={pickReceipt}>
                  <Text style={styles.replaceText}>Replace image</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setReceipt(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove receipt"
                style={styles.removeButton}
              >
                <Ionicons name="close" size={15} color={colors.coralDeep} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickReceipt}
              style={({ pressed }) => [styles.uploadBox, pressed ? styles.uploadBoxPressed : null]}
            >
              <View style={styles.uploadIcon}>
                <Ionicons name="image-outline" size={22} color={colors.forest} />
              </View>
              <Text style={styles.uploadTitle}>Attach a photo</Text>
              <Text style={styles.uploadCopy}>JPG, PNG, WEBP or HEIC · up to 5 MB</Text>
            </Pressable>
          )}

          {formError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.coralDeep} />
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <AppButton
              label={submitting ? 'Saving…' : 'Save entry'}
              onPress={() => void submit()}
              loading={submitting}
              icon="arrow-forward"
              iconAfter
            />
          </View>

          <Text style={styles.footnote}>
            Due {formatShortDate(dueDate)} · marked overdue automatically after the due date
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  topSpacer: { width: 40 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: 26,
  },
  eyebrow: {
    ...text.eyebrow,
    color: colors.forestLight,
    marginBottom: 9,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -1.1,
    color: colors.ink,
    marginBottom: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadow.card,
  },
  fieldGap: { height: 16 },
  amountInput: {
    fontFamily: fonts.displaySemibold,
    fontSize: 23,
    letterSpacing: -0.6,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...text.label,
  },
  dateValue: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 3,
  },
  calendarBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentDeep,
  },
  quickChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  quickChipTextActive: {
    color: colors.forest,
  },
  dateStrip: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 2,
    paddingRight: 4,
  },
  dateChip: {
    width: 52,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    gap: 1,
  },
  dateChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  dateWeekday: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontFamily: fonts.displaySemibold,
    fontSize: 17,
    color: colors.ink,
  },
  dateMonth: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.muted,
  },
  dateTextActive: { color: colors.white },
  dateTextActiveSoft: { color: 'rgba(255,255,255,0.55)' },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  inlineErrorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.coralDeep,
  },
  sectionLabel: {
    ...text.h2,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginTop: 24,
  },
  sectionCopy: {
    ...text.caption,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 12,
    maxWidth: 320,
  },
  uploadBox: {
    height: 132,
    borderRadius: radius.lg,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: '#C9D2B7',
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadBoxPressed: {
    backgroundColor: colors.accentMuted,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  uploadCopy: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  receiptThumb: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.paperDark,
  },
  receiptInfo: { flex: 1 },
  receiptName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  receiptMeta: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  replaceText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.forestLight,
    marginTop: 5,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: 11,
    marginTop: 16,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.coralDeep,
  },
  buttonRow: {
    marginTop: 22,
  },
  footnote: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
