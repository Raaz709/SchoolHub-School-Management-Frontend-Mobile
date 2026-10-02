import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Button, IconButton } from './Button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Set false for content that manages its own scrolling. */
  scrollable?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  style,
  scrollable = true,
}: ModalProps) {
  if (!visible) return null;

  return (
    <RNModal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop press dismisses; the surface below swallows its own taps. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[commonStyles.modalContent, style]}>
          <View style={commonStyles.modalHeader}>
            <View style={styles.headerText}>
              <Text style={commonStyles.modalTitle}>{title}</Text>
              {subtitle ? <Text style={commonStyles.modalSubtitle}>{subtitle}</Text> : null}
            </View>
            <IconButton icon="close" label="Close" onPress={onClose} size={32} iconSize={16} />
          </View>

          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={commonStyles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.scroll}>{children}</View>
          )}

          {footer ? <View style={commonStyles.modalFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

/** Yes/No confirmation used by every destructive action in the app. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  busy = false,
  destructive = true,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Text style={styles.confirmMessage}>{message}</Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  headerText: {
    flex: 1,
  },
  scroll: {
    flexGrow: 0,
  },
  confirmMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.ink[700],
    lineHeight: theme.fontSize.md * theme.lineHeight.normal,
  },
});
