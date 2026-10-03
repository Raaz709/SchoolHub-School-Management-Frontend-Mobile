import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fetchFeeCollectionReport,
  fetchStudentsByClassReport,
  type FeeCollectionRow,
  type StudentsByClassRow,
} from '../../api/reports';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge, statusTone } from '../../components/common/Badge';
import { ChipGroup } from '../../components/common/Select';
import { CountPill, ListPanel, ListRow, Avatar } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { formatAmount, formatCurrency, percentage } from '../../lib/format';
import { theme } from '../../theme';

type Tab = 'students' | 'fees';
type Feedback = { tone: 'success' | 'error'; message: string } | null;

const STATUS_COLORS: Record<string, string> = {
  Paid: theme.colors.mint[500],
  Overdue: theme.colors.rose[500],
  Partial: theme.colors.amber[400],
  Unpaid: theme.colors.ink[400],
};

/**
 * Reports module — administrator only, because `api/reports/*` carries a
 * class-level `[Authorize(Roles = "Admin")]`.
 *
 * Only the two reports the API actually exposes are shown; nothing here is
 * computed client-side beyond summing rows the API already returned.
 */
export function ReportsScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = normalizeRole(user?.role) === 'Admin';

  const [tab, setTab] = useState<Tab>('students');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const studentsByClass = useAsync(
    (signal) => (isAdmin ? fetchStudentsByClassReport(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const feeCollection = useAsync(
    (signal) => (isAdmin ? fetchFeeCollectionReport(signal) : Promise.resolve([])),
    [isAdmin],
  );

  const refresh = () => {
    void studentsByClass.refetch();
    void feeCollection.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  /* ----------------------------------------------------------- fee totals */

  const feeTotals = useMemo(() => {
    const rows = feeCollection.data ?? [];
    const total = rows.reduce(
      (acc, row) => ({
        FeeCount: acc.FeeCount + Number(row.FeeCount ?? 0),
        TotalAmount: acc.TotalAmount + Number(row.TotalAmount ?? 0),
        TotalPaid: acc.TotalPaid + Number(row.TotalPaid ?? 0),
        TotalOutstanding: acc.TotalOutstanding + Number(row.TotalOutstanding ?? 0),
      }),
      { FeeCount: 0, TotalAmount: 0, TotalPaid: 0, TotalOutstanding: 0 },
    );
    return { ...total, rate: percentage(total.TotalPaid, total.TotalAmount) };
  }, [feeCollection.data]);

  /** Largest amount across statuses, used to scale the bars. */
  const feeMax = useMemo(
    () => Math.max(1, ...(feeCollection.data ?? []).map((row) => Number(row.TotalAmount ?? 0))),
    [feeCollection.data],
  );

  /* -------------------------------------------------------- enrolment data */

  const enrolment = useMemo(() => {
    const rows = studentsByClass.data ?? [];
    const classNames = Array.from(new Set(rows.map((row) => row.ClassName)));
    const largest = Math.max(1, ...rows.map((row) => Number(row.StudentCount ?? 0)));
    return { rows, classNames, largest };
  }, [studentsByClass.data]);

  if (!isAdmin) {
    return (
      <Screen>
        <PageHeader title="Reports" subtitle="School-wide enrolment and fee collection summaries." />
        {feedback ? <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} /> : null}
        <View style={styles.restricted}>
          <Icon name="shield" size={22} color={theme.colors.ink[400]} />
          <Text style={styles.restrictedText}>
            Reports are restricted to administrators.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={(studentsByClass.loading || feeCollection.loading) && !!studentsByClass.data}
    >
      <PageHeader
        title="Reports"
        subtitle="Read-only summaries produced by the reporting endpoints."
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ChipGroup
        options={[
          { value: 'students', label: 'Students by Class', icon: 'student' },
          { value: 'fees', label: 'Fee Collection', icon: 'wallet' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {tab === 'students' ? (
        <>
          <View style={styles.statRow}>
            <StatTile
              label="Classes"
              value={String(enrolment.classNames.length)}
              icon="library"
              tone="violet"
            />
            <StatTile
              label="Class / section rows"
              value={String(enrolment.rows.length)}
              icon="layers"
              tone="blue"
            />
            <StatTile
              label="Largest section"
              value={String(enrolment.largest)}
              icon="student"
              tone="mint"
            />
          </View>

          <ListPanel
            title="Students by class"
            subtitle="Each row is one class/section group, exactly as the report groups it."
            action={<CountPill count={enrolment.rows.length} label="rows" />}
            items={enrolment.rows}
            keyExtractor={(item, index) =>
              `${item.ClassName}-${item.SectionName ?? 'none'}-${index}`
            }
            loading={studentsByClass.loading && !studentsByClass.data}
            error={studentsByClass.error}
            status={studentsByClass.status}
            onRetry={refresh}
            onSignIn={onSignIn}
            emptyMessage="No classes have been set up yet."
            emptyIcon="library"
            style={styles.panel}
            renderItem={(row: StudentsByClassRow) => {
              const count = Number(row.StudentCount ?? 0);
              return (
                <ListRow
                  leading={<Avatar text={initialsOf(row.ClassName)} tone="violet" />}
                  title={row.SectionName ? `${row.ClassName} · ${row.SectionName}` : row.ClassName}
                  meta={
                    row.SectionName
                      ? 'Section group'
                      : 'Class group (no sections defined yet)'
                  }
                  trailing={
                    <View style={styles.rowTrailing}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: pct(percentage(count, enrolment.largest)),
                              backgroundColor: theme.colors.violet[400],
                            },
                          ]}
                        />
                      </View>
                      <Badge label={`${count}`} tone={count === 0 ? 'neutral' : 'violet'} />
                    </View>
                  }
                />
              );
            }}
          />
        </>
      ) : (
        <>
          <View style={styles.statRow}>
            <StatTile
              label="Billed"
              value={formatCurrency(feeTotals.TotalAmount)}
              icon="wallet"
              tone="blue"
            />
            <StatTile
              label="Collected"
              value={formatCurrency(feeTotals.TotalPaid)}
              icon="checkCircle"
              tone="mint"
            />
            <StatTile
              label="Outstanding"
              value={formatCurrency(feeTotals.TotalOutstanding)}
              icon="alertCircle"
              tone="rose"
            />
          </View>

          <View style={styles.rateCard}>
            <View style={styles.rateHead}>
              <Text style={styles.rateLabel}>Collection rate</Text>
              <Text style={styles.rateValue}>{feeTotals.rate.toFixed(1)}%</Text>
            </View>
            <View style={styles.rateTrack}>
              <View
                style={[
                  styles.rateFill,
                  {
                    width: pct(feeTotals.rate),
                    backgroundColor: theme.colors.mint[500],
                  },
                ]}
              />
            </View>
            <Text style={styles.rateHint}>
              {formatAmount(feeTotals.TotalPaid)} collected of{' '}
              {formatAmount(feeTotals.TotalAmount)} billed across {feeTotals.FeeCount} fee
              {feeTotals.FeeCount === 1 ? '' : 's'}.
            </Text>
          </View>

          <ListPanel
            title="Status breakdown"
            subtitle="The API derives each status with the same precedence fees use."
            action={<CountPill count={feeCollection.data?.length ?? 0} label="statuses" />}
            items={feeCollection.data ?? []}
            keyExtractor={(item) => item.Status}
            loading={feeCollection.loading && !feeCollection.data}
            error={feeCollection.error}
            status={feeCollection.status}
            onRetry={refresh}
            onSignIn={onSignIn}
            emptyMessage="No fee structures have been assigned yet."
            emptyIcon="wallet"
            style={styles.panel}
            renderItem={(row: FeeCollectionRow) => (
              <ListRow
                leading={
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[row.Status] ?? theme.colors.ink[400] },
                    ]}
                  />
                }
                title={row.Status}
                meta={`${row.FeeCount} fee${row.FeeCount === 1 ? '' : 's'}  ·  ${formatCurrency(
                  row.TotalPaid,
                )} of ${formatCurrency(row.TotalAmount)}`}
                trailing={
                  <View style={styles.rowTrailing}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: pct(percentage(Number(row.TotalAmount ?? 0), feeMax)),
                            backgroundColor: STATUS_COLORS[row.Status] ?? theme.colors.ink[400],
                          },
                        ]}
                      />
                    </View>
                    <Badge
                      label={formatAmount(row.TotalOutstanding)}
                      tone={statusTone(row.Status)}
                    />
                  </View>
                }
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

function initialsOf(value: string): string {
  return value.slice(0, 2).toUpperCase();
}

/** Clamped percentage for bar widths, typed for React Native's `DimensionValue`. */
function pct(value: number): `${number}%` {
  const clamped = Math.max(0, Math.min(100, value));
  return `${clamped}%` as `${number}%`;
}

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  tone: 'mint' | 'blue' | 'violet' | 'rose';
}) {
  const palette = {
    mint: { tile: theme.colors.mint[50], fg: theme.colors.mint[600] },
    blue: { tile: theme.colors.blue[50], fg: theme.colors.blue[500] },
    violet: { tile: theme.colors.violet[50], fg: theme.colors.violet[500] },
    rose: { tile: theme.colors.rose[50], fg: theme.colors.rose[500] },
  }[tone];

  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: palette.tile }]}>
        <Icon name={icon} size={15} color={palette.fg} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  tabs: {
    marginBottom: theme.spacing[5],
  },
  panel: {
    marginTop: theme.spacing[5],
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  statTile: {
    flex: 1,
    minWidth: '30%',
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.3,
    color: theme.colors.ink[900],
  },
  statLabel: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.colors.ink[500],
  },
  rateCard: {
    marginTop: theme.spacing[4],
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[5],
  },
  rateHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  rateLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  rateValue: {
    fontSize: theme.fontSize['6xl'],
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.5,
    color: theme.colors.ink[900],
  },
  rateTrack: {
    marginTop: theme.spacing[3],
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.lineSoft,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  rateHint: {
    marginTop: theme.spacing[3],
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  barTrack: {
    width: 56,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.lineSoft,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
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
