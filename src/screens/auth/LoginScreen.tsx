import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { theme } from '../../theme';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Invalid username or password.' : err.message);
      } else {
        setError('Cannot reach the API. Is the backend running?');
      }
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="schoolSolid" size={22} color={theme.colors.mint[600]} />
            </View>
            <View>
              <Text style={styles.brandTitle}>SchoolHub</Text>
              <Text style={styles.brandSubtitle}>Sign in to continue</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              leftIcon={<Icon name="mail" size={16} color={theme.colors.ink[400]} />}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Icon name="lock" size={16} color={theme.colors.ink[400]} />}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                if (canSubmit) void handleLogin();
              }}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleLogin} loading={busy} disabled={!canSubmit} block>
              Sign in
            </Button>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>No account? </Text>
            <Pressable onPress={() => navigation.navigate('Register' as never)}>
              <Text style={styles.footerLink}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing[4],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: theme.borderRadius['3xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[8],
    ...theme.shadows.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2.5],
    marginBottom: theme.spacing[7],
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.3,
    color: theme.colors.ink[900],
  },
  brandSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
  },
  form: {
    gap: theme.spacing[4],
  },
  errorBox: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.rose[50],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.rose[600],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[5],
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.mint[600],
  },
});
