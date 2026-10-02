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
import { ChipGroup } from '../../components/common/Select';

// Teacher and Admin accounts are provisioned by an administrator, not self-registered.
type Role = 'Student' | 'Parent';

export function RegisterScreen() {
  const { register } = useAuth();
  const navigation = useNavigation();
  const [role, setRole] = useState<Role>('Student');
  const [form, setForm] = useState({
    Username: '',
    Email: '',
    Password: '',
    RollNumber: '',
    Occupation: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleRegister = async () => {
    setError(null);
    setBusy(true);
    try {
      await register({
        Username: form.Username.trim(),
        Email: form.Email.trim(),
        Password: form.Password,
        Role: role,
        ...(role === 'Student' ? { RollNumber: form.RollNumber.trim() } : {}),
        ...(role === 'Parent' ? { Occupation: form.Occupation.trim() } : {}),
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Cannot reach the API. Is the backend running?',
      );
    } finally {
      setBusy(false);
    }
  };

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
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Icon name="arrowLeft" size={14} color={theme.colors.ink[500]} />
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="schoolSolid" size={22} color={theme.colors.mint[600]} />
            </View>
            <View>
              <Text style={styles.brandTitle}>Create account</Text>
              <Text style={styles.brandSubtitle}>Join SchoolHub</Text>
            </View>
          </View>

          <ChipGroup
            options={[
              { value: 'Student', label: 'Student', icon: 'user' },
              { value: 'Parent', label: 'Parent', icon: 'users' },
            ]}
            value={role}
            onChange={setRole}
            style={styles.roleSwitch}
          />

          <View style={styles.form}>
            <Input
              label="Username"
              value={form.Username}
              onChangeText={(v) => set('Username', v)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
            <Input
              label="Email"
              value={form.Email}
              onChangeText={(v) => set('Email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={form.Password}
              onChangeText={(v) => set('Password', v)}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />

            {role === 'Student' ? (
              <Input
                label="Roll Number"
                value={form.RollNumber}
                onChangeText={(v) => set('RollNumber', v)}
              />
            ) : null}

            {role === 'Parent' ? (
              <Input
                label="Occupation"
                value={form.Occupation}
                onChangeText={(v) => set('Occupation', v)}
              />
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleRegister} loading={busy} disabled={busy} block>
              Create account
            </Button>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Sign in</Text>
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
    paddingVertical: theme.spacing[8],
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: theme.borderRadius['3xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[8],
    ...theme.shadows.lg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
    alignSelf: 'flex-start',
    marginBottom: theme.spacing[5],
  },
  backText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2.5],
    marginBottom: theme.spacing[6],
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
  roleSwitch: {
    marginBottom: theme.spacing[5],
  },
  form: {
    gap: theme.spacing[3.5],
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
