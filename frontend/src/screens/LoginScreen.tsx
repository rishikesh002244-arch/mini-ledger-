import React, { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiClientError } from '../lib/api';
import { formatPhone } from '../lib/format';
import { colors, fonts, radius, shadow, spacing, text } from '../theme';
import { BrandMark } from '../components/BrandMark';
import { AppButton } from '../components/AppButton';
import { Field } from '../components/Field';
import { OtpField } from '../components/OtpField';

type Step = 'phone' | 'otp';

export const LoginScreen = () => {
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    Keyboard.dismiss();
    setFormError(null);
    setOtpError(null);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setPhoneError('Enter a valid phone number with at least 10 digits.');
      return;
    }

    setPhoneError(null);
    setRequesting(true);

    try {
      const result = await authApi.requestOtp(phone);
      setStep('otp');
      setOtp('');
      setDevOtp(result.devOtp ?? null);
      setInfo(`Code sent to ${formatPhone(result.phone)}`);
      setCooldown(result.resendAfterSeconds ?? 30);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setPhoneError(error.fieldErrors.phone ?? null);
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setRequesting(false);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    Keyboard.dismiss();
    setFormError(null);

    if (otp.length !== 6) {
      setOtpError('Enter the full 6-digit code.');
      return;
    }

    setOtpError(null);
    setVerifying(true);

    try {
      const result = await authApi.verifyOtp(phone, otp);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn(result.token, result.user);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setOtpError(error.message);
        if (error.code === 'INVALID_OTP' || error.code === 'OTP_EXPIRED') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  }, [otp, phone, signIn]);

  const changeNumber = () => {
    setStep('phone');
    setOtp('');
    setOtpError(null);
    setFormError(null);
    setInfo(null);
    setDevOtp(null);
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.paper, colors.paper]}
      locations={[0, 0.42, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandRow}>
              <BrandMark size={38} />
              <Text style={styles.brandName}>MiniLedger</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ASSIGNMENT</Text>
              </View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>LEND · TRACK · SETTLE</Text>
              <Text style={styles.headline}>Lending to friends,{'\n'}minus the awkward maths.</Text>
              <Text style={styles.heroCopy}>
                A tiny ledger for the money you lend. Log the receipt, set a due date,
                and never forget who owes what.
              </Text>
            </View>

            <View style={styles.card}>
              {step === 'phone' ? (
                <>
                  <View style={styles.stepRow}>
                    <Text style={styles.stepNumber}>01</Text>
                    <View style={styles.stepLine} />
                    <Text style={styles.stepLabel}>SIGN IN</Text>
                  </View>

                  <Text style={styles.cardTitle}>What's your number?</Text>
                  <Text style={styles.cardCopy}>
                    No passwords. We'll generate a one-time code and print it to the
                    backend console.
                  </Text>

                  <Field
                    label="Phone number"
                    icon="call-outline"
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(value);
                      setPhoneError(null);
                      setFormError(null);
                    }}
                    error={phoneError ?? undefined}
                    returnKeyType="done"
                    onSubmitEditing={sendOtp}
                    maxLength={20}
                    containerStyle={styles.field}
                  />

                  {formError ? (
                    <View style={styles.errorBanner}>
                      <Ionicons name="cloud-offline-outline" size={16} color={colors.coralDeep} />
                      <Text style={styles.errorBannerText}>{formError}</Text>
                    </View>
                  ) : null}

                  <AppButton
                    label="Send OTP"
                    onPress={sendOtp}
                    loading={requesting}
                    icon="arrow-forward"
                    iconAfter
                    style={styles.primaryButton}
                  />

                  <View style={styles.noteRow}>
                    <View style={styles.noteIcon}>
                      <Ionicons name="terminal-outline" size={14} color={colors.forest} />
                    </View>
                    <Text style={styles.noteText}>
                      Demo mode: the 6-digit code appears in your backend terminal.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.stepRow}>
                    <Text style={styles.stepNumber}>02</Text>
                    <View style={styles.stepLine} />
                    <Text style={styles.stepLabel}>VERIFY</Text>
                  </View>

                  <Text style={styles.cardTitle}>Check your code.</Text>
                  <Text style={styles.cardCopy}>
                    We generated a 6-digit code for{' '}
                    <Text style={styles.phoneStrong}>{formatPhone(phone)}</Text>. It
                    expires in 5 minutes.
                  </Text>

                  <Text style={styles.otpLabel}>One-time password</Text>
                  <OtpField value={otp} onChange={(value) => { setOtp(value); setOtpError(null); }} hasError={Boolean(otpError)} />

                  {otpError ? (
                    <View style={styles.inlineError}>
                      <Ionicons name="alert-circle" size={13} color={colors.coral} />
                      <Text style={styles.inlineErrorText}>{otpError}</Text>
                    </View>
                  ) : null}

                  {devOtp ? (
                    <Pressable onPress={() => setOtp(devOtp)} style={styles.devOtpChip}>
                      <Ionicons name="sparkles" size={13} color={colors.forest} />
                      <Text style={styles.devOtpText}>Demo OTP: {devOtp}</Text>
                      <Text style={styles.devOtpAction}>FILL</Text>
                    </Pressable>
                  ) : null}

                  {formError ? (
                    <View style={styles.errorBanner}>
                      <Ionicons name="cloud-offline-outline" size={16} color={colors.coralDeep} />
                      <Text style={styles.errorBannerText}>{formError}</Text>
                    </View>
                  ) : null}

                  <AppButton
                    label="Verify & continue"
                    onPress={verifyOtp}
                    loading={verifying}
                    icon="shield-checkmark-outline"
                    style={styles.primaryButton}
                  />

                  <View style={styles.resendRow}>
                    <Pressable
                      onPress={() => {
                        if (cooldown === 0 && !requesting) void sendOtp();
                      }}
                      disabled={cooldown > 0 || requesting}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          cooldown > 0 || requesting ? styles.resendDisabled : null,
                        ]}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={changeNumber}>
                      <Text style={styles.changeText}>Change number</Text>
                    </Pressable>
                  </View>

                  {info ? (
                    <Text style={styles.infoText}>
                      <Ionicons name="checkmark-circle" size={11} color={colors.forest} />{' '}
                      {info}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
              <Text style={styles.footerText}>
                JWT-secured session · mock OTP for demo purposes
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 12,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  badge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,59,44,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(11,59,44,0.10)',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: colors.forest,
  },
  hero: {
    marginTop: 42,
    marginBottom: 28,
  },
  eyebrow: {
    ...text.eyebrow,
    color: colors.forestLight,
    marginBottom: 12,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -1.3,
    color: colors.ink,
  },
  heroCopy: {
    ...text.body,
    color: colors.inkSoft,
    marginTop: 14,
    maxWidth: 330,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepNumber: {
    fontFamily: fonts.displaySemibold,
    fontSize: 11,
    color: colors.forest,
  },
  stepLine: {
    width: 18,
    height: 1,
    backgroundColor: colors.border,
  },
  stepLabel: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  cardTitle: {
    fontFamily: fonts.displaySemibold,
    fontSize: 23,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  cardCopy: {
    ...text.body,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneStrong: {
    fontFamily: fonts.bold,
    color: colors.forest,
  },
  field: { marginBottom: 4 },
  primaryButton: { marginTop: 18 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: 11,
    marginTop: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.coralDeep,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  noteIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  otpLabel: {
    ...text.label,
    marginBottom: 10,
  },
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
    flex: 1,
  },
  devOtpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 14,
  },
  devOtpText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.forest,
  },
  devOtpAction: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.forestLight,
    marginLeft: 2,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  resendText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.forest,
  },
  resendDisabled: {
    color: colors.faint,
  },
  changeText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
  },
  infoText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 28,
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
  },
});
