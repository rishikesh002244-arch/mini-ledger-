import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, radius, shadow } from '../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />

      <View style={styles.card}>
        <View style={[styles.iconWrap, destructive ? styles.iconWrapDanger : null]}>
          <Ionicons
            name={destructive ? 'alert' : 'checkmark-circle'}
            size={22}
            color={destructive ? colors.coralDeep : colors.forest}
          />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              destructive ? styles.dangerButton : styles.confirmButton,
              pressed ? styles.pressed : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={destructive ? colors.white : colors.accent} />
            ) : (
              <Text style={[styles.confirmText, destructive ? styles.dangerText : null]}>
                {confirmLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 22,
    ...shadow.card,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapDanger: {
    backgroundColor: colors.coralSoft,
  },
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 21,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.inkSoft,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.forest,
  },
  dangerButton: {
    backgroundColor: colors.coral,
  },
  cancelText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  confirmText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.accent,
  },
  dangerText: { color: colors.white },
  pressed: { opacity: 0.8 },
});
