import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, radius, text } from '../theme';
import { AppButton } from './AppButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  title,
  message,
  icon = 'receipt-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <View style={styles.iconInner}>
        <Ionicons name={icon} size={26} color={colors.forest} />
      </View>
      <View style={styles.spark} />
    </View>

    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>

    {actionLabel && onAction ? (
      <AppButton
        label={actionLabel}
        onPress={onAction}
        variant="outline"
        icon="add"
        fullWidth={false}
        style={styles.action}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 44,
    paddingBottom: 32,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.paperDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    right: 4,
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentDeep,
  },
  title: {
    ...text.h2,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    ...text.body,
    textAlign: 'center',
    color: colors.muted,
    fontFamily: fonts.body,
    maxWidth: 280,
  },
  action: {
    marginTop: 22,
    paddingHorizontal: 20,
  },
});
