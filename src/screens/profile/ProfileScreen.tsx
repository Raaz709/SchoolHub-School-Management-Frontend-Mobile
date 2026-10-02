import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchProfile, updateProfile } from '../../api/profile';
import { ApiError } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { ErrorState } from '../../components/common/ErrorState';
import { Screen } from '../../components/common/Screen';
import { Skeleton } from '../../components/common/Skeleton';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/Icon';
import { formatDate, initials } from '../../lib/format';
import { theme } from '../../theme';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const profile = useAsync((signal) => fetchProfile(signal));

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const data = profile.data;

  // Seed the form once the profile arrives, and again after a save re-fetches.
  useEffect(() => {
    if (!data) return;
    setUsername(data.Username);
    setEmail(data.Email);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updateProfile({ Username: username, Email: email });
      setSuccessMsg('Profile updated successfully.');
      setEditing(false);
      void profile.refetch();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setUsername(data?.Username ?? '');
    setEmail(data?.Email ?? '');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <Screen onRefresh={profile.refetch} refreshing={profile.loading}>
      <PageHeader title="My Profile" subtitle="Manage your personal account details." />

      {profile.error ? (
        <ErrorState
          message={profile.error.message}
          status={profile.status}
          onRetry={profile.refetch}
          onSignIn={signOut}
        />
      ) : (
        <Card style={styles.card}>
          {profile.loading || !data ? (
            <View style={styles.skeletonStack}>
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.identityRow}>
                <View style={styles.avatarTile}>
                  <Text style={styles.avatarText}>
                    {username ? initials(username) : 'US'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.identityName}>{data.Username}</Text>
                  <Text style={styles.identityRole}>Role: {user?.role ?? 'User'}</Text>
                </View>
              </View>

              {successMsg ? (
                <View style={styles.successBox}>
                  <Icon name="checkmarkCircle" size={16} color={theme.colors.mint[600]} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                editable={editing}
                autoCapitalize="none"
                leftIcon={<Icon name="student" size={16} color={theme.colors.ink[400]} />}
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                editable={editing}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Icon name="mail" size={16} color={theme.colors.ink[400]} />}
              />

              <View style={styles.metaRow}>
                <View style={styles.metaCard}>
                  <Icon name="shield" size={16} color={theme.colors.ink[500]} />
                  <View>
                    <Text style={styles.metaLabel}>Account Status</Text>
                    <Text style={styles.metaValue}>{data.IsActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>

                <View style={styles.metaCard}>
                  <Icon name="calendar" size={16} color={theme.colors.ink[500]} />
                  <View>
                    <Text style={styles.metaLabel}>Member Since</Text>
                    <Text style={styles.metaValue}>{formatDate(data.CreatedAt)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.footerRow}>
                {!editing ? (
                  <Button onPress={() => setEditing(true)}>Edit Profile</Button>
                ) : (
                  <>
                    <Button variant="ghost" onPress={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onPress={handleSave} loading={saving} disabled={saving}>
                      Save Changes
                    </Button>
                  </>
                )}
              </View>
            </View>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 640,
    padding: theme.spacing[6],
  },
  skeletonStack: {
    gap: theme.spacing[4],
  },
  form: {
    gap: theme.spacing[4],
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  avatarTile: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: theme.colors.mint[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize['6xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.mint[600],
  },
  identityName: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  identityRole: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[50],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  successText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.mint[700],
  },
  errorBox: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.rose[50],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  errorText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.rose[600],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  metaCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.lineSoft,
    padding: theme.spacing[3.5],
  },
  metaLabel: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
  },
  metaValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing[4],
  },
});
