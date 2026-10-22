import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, radius, text } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface FieldProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  error?: string;
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Field = ({
  label,
  icon,
  error,
  prefix,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...inputProps
}: FieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.shell,
          focused && styles.shellFocused,
          Boolean(error) && styles.shellError,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.forest : colors.muted}
            style={styles.icon}
          />
        ) : null}

        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}

        <TextInput
          {...inputProps}
          style={[styles.input, style]}
          placeholderTextColor={colors.faint}
          selectionColor={colors.forest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={colors.coral} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...text.label,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  shell: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  shellFocused: {
    borderColor: colors.forest,
    backgroundColor: colors.white,
  },
  shellError: {
    borderColor: colors.coral,
    backgroundColor: '#FFFBF9',
  },
  icon: { marginRight: 10 },
  prefix: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.inkSoft,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15.5,
    color: colors.ink,
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.coralDeep,
    flex: 1,
  },
});
