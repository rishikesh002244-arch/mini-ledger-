import React, { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radius } from '../theme';

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const LENGTH = 6;

export const OtpField = ({ value, onChange, disabled = false, hasError = false }: OtpFieldProps) => {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel="Six digit one time password"
    >
      <View style={styles.row}>
        {Array.from({ length: LENGTH }).map((_, index) => {
          const digit = value[index] ?? '';
          const isActive = index === Math.min(value.length, LENGTH - 1);

          return (
            <View
              key={index}
              style={[
                styles.cell,
                digit ? styles.cellFilled : null,
                isActive && !hasError ? styles.cellActive : null,
                hasError ? styles.cellError : null,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
              {!digit && isActive && !hasError ? <View style={styles.caret} /> : null}
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        autoFocus
        editable={!disabled}
        caretHidden
        style={styles.hiddenInput}
        accessibilityLabel="OTP input"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 58,
    maxWidth: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.forestLight,
    backgroundColor: colors.white,
  },
  cellActive: {
    borderColor: colors.forest,
    borderWidth: 1.6,
  },
  cellError: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSoft,
  },
  digit: {
    fontFamily: fonts.displaySemibold,
    fontSize: 24,
    color: colors.ink,
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: colors.forest,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.011,
    color: 'transparent',
  },
});
