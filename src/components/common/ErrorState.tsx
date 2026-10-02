import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon } from '../Icon';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  /** HTTP status when known; `null` means the request never reached the API. */
  status?: number | null;
  onRetry?: () => void;
  onSignIn?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mirrors the web `ErrorState`: the hint changes with the failure mode, and a
 * 401 offers "Sign in again" instead of "Retry".
 */
export function ErrorState({ message, status = null, onRetry, onSignIn, style }: ErrorStateProps) {
  const hint =
    status === 401
      ? 'Your session has expired or you are not signed in.'
      : status === 403
        ? 'This page requires higher privileges.'
        : status === null
          ? 'Cannot reach the API. Is the backend running?'
          : message;

  const isAuthError = status === 401 && onSignIn;

  return (
    <View style={[commonStyles.dashedPanel, styles.container, style]}>
      <Icon name="alertTriangle" size={24} color={theme.colors.amber[500]} />
      <Text style={styles.title}>Could not load page data</Text>
      <Text style={styles.hint}>{hint}</Text>

      {isAuthError ? (
        <Button icon="login" onPress={onSignIn} style={styles.action}>
          Sign in again
        </Button>
      ) : onRetry ? (
        <Button icon="refresh" onPress={onRetry} style={styles.action}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing[10],
  },
  title: {
    marginTop: theme.spacing[3],
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
  },
  hint: {
    marginTop: theme.spacing[1],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: theme.spacing[5],
  },
});
