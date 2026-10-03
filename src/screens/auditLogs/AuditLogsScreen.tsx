import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchAuditLogs, type AuditLog } from '../../api/auditLogs';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { SearchBar } from '../../components/common/SearchBar';
import { CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Field, FieldGrid, FieldSection } from '../../components/common/Field';
import { Icon, type IconName } from '../../components/Icon';
import { formatDateTime, timeAgo } from '../../lib/format';
import { theme } from '../../theme';

/**
 * Audit log viewer — administrator only, because `api/AuditLogs` is
 * `[Authorize(Roles = "Admin")]`.
 *
 * The endpoint returns the whole log newest-first with no filtering parameters,
 * so filtering happens over the loaded page rather than re-querying.
 */
export function AuditLogsScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = normalizeRole(user?.role) === 'Admin';

  const [query, setQuery] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const logs = useAsync(
    (signal) => (isAdmin ? fetchAuditLogs(signal) : Promise.resolve([])),
    [isAdmin],
  );

  const debouncedQuery = useDebouncedValue(query, 250);

  const refresh = () => {
    void logs.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  /** Distinct actions, ordered by how often they occur. */
  const actionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs.data ?? []) {
      const key = log.Action || 'UNKNOWN';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, hint: `${count} entries` }));
  }, [logs.data]);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return (logs.data ?? []).filter((log) => {
      if (action !== null && (log.Action || 'UNKNOWN') !== action) return false;
      if (!needle) return true;
      return [log.Action, log.Details ?? '', log.Username ?? '', log.IpAddress ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [logs.data, debouncedQuery, action]);

  if (!isAdmin) {
    return (
      <Screen>
        <PageHeader title="Audit Logs" subtitle="Every recorded action, newest first." />
        <View style={styles.restricted}>
          <Icon name="shield" size={22} color={theme.colors.ink[400]} />
          <Text style={styles.restrictedText}>
            Audit logs are restricted to administrators.
          </Text>
        </View>
      </Screen>
    );
  }

  const filtering = query.trim().length > 0 || action !== null;

  return (
    <Screen onRefresh={refresh} refreshing={logs.loading && !!logs.data}>
      <PageHeader
        title="Audit Logs"
        subtitle="Every recorded action, newest first."
      />

      <ListPanel
        title="Activity trail"
        subtitle={
          filtering
            ? `${filtered.length} of ${logs.data?.length ?? 0} entries match the current filters.`
            : 'Search by action, detail, user or IP address.'
        }
        action={<CountPill count={filtered.length} label="entries" />}
        items={filtered}
        keyExtractor={(item) => String(item.Id)}
        loading={logs.loading && !logs.data}
        error={logs.error}
        status={logs.status}
        onRetry={refresh}
        onSignIn={onSignIn}
        emptyTitle={filtering ? 'No matching entries' : undefined}
        emptyMessage={
          filtering
            ? 'Try a different search term or clear the action filter.'
            : 'Nothing has been recorded in the audit log yet.'
        }
        emptyIcon="history"
        skeletonRows={6}
        toolbar={
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Action, detail, user or IP"
            />
            <Select
              value={action}
              options={actionOptions}
              onChange={setAction}
              placeholder="All actions"
              clearLabel="All actions"
              title="Filter by action"
              searchable
              style={styles.filter}
            />
            {filtering ? (
              <Button
                variant="ghost"
                icon="close"
                onPress={() => {
                  setQuery('');
                  setAction(null);
                }}
              >
                Clear
              </Button>
            ) : null}
          </>
        }
        renderItem={(log) => (
          <ListRow
            leading={<ActionTile action={log.Action} />}
            title={log.Action || 'UNKNOWN'}
            meta={`${formatDateTime(log.CreatedAt)}  ·  ${timeAgo(log.CreatedAt)}  ·  ${
              log.Username ?? 'Deleted user'
            }`}
            trailing={
              <View style={styles.rowTrailing}>
                {log.IpAddress ? (
                  <Badge label={log.IpAddress} tone="neutral" />
                ) : null}
                <Icon name="chevronRight" size={16} color={theme.colors.ink[400]} />
              </View>
            }
            onPress={() => setSelected(log)}
          />
        )}
      />

      <Modal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.Action || 'Entry'}
        subtitle={selected ? formatDateTime(selected.CreatedAt) : undefined}
        footer={
          <Button variant="ghost" onPress={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected ? (
          <>
            <FieldSection title="Context">
              <FieldGrid>
                <Field label="Entry ID" value={selected.Id} />
                <Field label="User" value={selected.Username ?? 'Deleted user'} />
                <Field label="IP Address" value={selected.IpAddress ?? 'Not recorded'} />
                <Field label="When" value={formatDateTime(selected.CreatedAt)} />
              </FieldGrid>
            </FieldSection>

            <Text style={styles.detailHeading}>Details</Text>
            <ScrollView style={styles.detailBox} nestedScrollEnabled>
              <Text style={styles.detailText}>{prettyDetails(selected.Details)}</Text>
            </ScrollView>
          </>
        ) : null}
      </Modal>
    </Screen>
  );
}

/** Icon tile that hints at the action family without parsing its arguments. */
function ActionTile({ action }: { action: string }) {
  const icon = actionIcon(action);
  const palette = actionPalette(action);

  return (
    <View style={[styles.actionTile, { backgroundColor: palette.tile }]}>
      <Icon name={icon} size={15} color={palette.fg} />
    </View>
  );
}

function actionIcon(action: string): IconName {
  const value = (action || '').toUpperCase();
  if (value.includes('LOGIN')) return 'login';
  if (value.includes('LOGOUT')) return 'logout';
  if (value.includes('PASSWORD') || value.includes('RESET')) return 'lock';
  if (value.includes('DELETE') || value.includes('REMOVE')) return 'trash';
  if (value.includes('CREATE') || value.includes('ADD') || value.includes('REGISTER')) return 'plus';
  if (value.includes('UPDATE') || value.includes('EDIT')) return 'edit';
  if (value.includes('FEE') || value.includes('PAYMENT')) return 'wallet';
  if (value.includes('ATTENDANCE')) return 'clipboardCheck';
  if (value.includes('EXAM') || value.includes('RESULT')) return 'scrollText';
  if (value.includes('GRADE') || value.includes('MARK')) return 'award';
  return 'history';
}

function actionPalette(action: string): { tile: string; fg: string } {
  const value = (action || '').toUpperCase();
  if (value.includes('DELETE') || value.includes('REMOVE') || value.includes('FAILED')) {
    return { tile: theme.colors.rose[50], fg: theme.colors.rose[500] };
  }
  if (value.includes('LOGIN') || value.includes('CREATE') || value.includes('ADD')) {
    return { tile: theme.colors.mint[50], fg: theme.colors.mint[600] };
  }
  if (value.includes('UPDATE') || value.includes('EDIT') || value.includes('PASSWORD')) {
    return { tile: theme.colors.amber[50], fg: theme.colors.amber[500] };
  }
  return { tile: theme.colors.blue[50], fg: theme.colors.blue[500] };
}

/**
 * `Details` is `jsonb`, so it usually arrives as a JSON string. Pretty-print it
 * when it parses; otherwise show the raw value, since plain text has been
 * written into the column too.
 */
function prettyDetails(raw: string | null): string {
  if (!raw) return 'No details recorded.';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const styles = StyleSheet.create({
  filter: {
    minWidth: 160,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  actionTile: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeading: {
    marginTop: theme.spacing[5],
    marginBottom: theme.spacing[2],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[700],
  },
  detailBox: {
    maxHeight: 240,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.lineSoft,
    padding: theme.spacing[3],
  },
  detailText: {
    fontSize: theme.fontSize.tiny,
    lineHeight: theme.fontSize.tiny * theme.lineHeight.normal,
    color: theme.colors.ink[700],
  },
  restricted: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[3],
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[6],
  },
  restrictedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.ink[500],
    textAlign: 'center',
  },
});
