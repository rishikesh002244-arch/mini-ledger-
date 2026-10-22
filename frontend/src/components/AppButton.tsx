import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, radius } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconAfter?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<
  ButtonVariant,
  { background: string; foreground: string; border: string }
> = {
  primary: { background: colors.forest, foreground: colors.white, border: colors.forest },
  accent: { background: colors.accent, foreground: colors.forestDeep, border: colors.accent },
  outline: { background: 'transparent', foreground: colors.ink, border: colors.border },
  ghost: { background: 'transparent', foreground: colors.inkSoft, border: 'transparent' },
  danger: { background: colors.coralSoft, foreground: colors.coralDeep, border: 'transparent' },
};

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconAfter = false,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: AppButtonProps) => {
  const palette = PALETTE[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        fullWidth ? styles.fullWidth : styles.autoWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : (
        <>
          {icon && !iconAfter ? (
            <Ionicons name={icon} size={18} color={palette.foreground} style={styles.iconBefore} />
          ) : null}
          <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
          {icon && iconAfter ? (
            <Ionicons name={icon} size={18} color={palette.foreground} style={styles.iconAfter} />
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  fullWidth: { alignSelf: 'stretch' },
  autoWidth: { alignSelf: 'flex-start' },
  label: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  iconBefore: { marginRight: 8 },
  iconAfter: { marginLeft: 8 },
});
