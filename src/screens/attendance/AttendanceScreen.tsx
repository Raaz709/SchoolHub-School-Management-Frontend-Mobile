import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  ATTENDANCE_STATUSES,
  createSession,
  fetchMyAttendance,
  fetchRoster,
  fetchSession,
  fetchSessions,
  fetchStudentAttendance,
  updateSession,
  type AttendanceRoster,
  type AttendanceSessionDetail,
  type RosterStudent,
  type StudentAttendanceRow,
} from '../../api/attendance';
import { fetchClasses, fetchSections } from '../../api/academic';
import { fetchParentChildren, type Child } from '../../api/portals';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge, statusTone } from '../../components/common/Badge';
import { Button, IconButton } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ChipGroup, Select } from '../../components/common/Select';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Field, FieldGrid, FieldSection } from '../../components/common/Field';
import { Icon } from '../../components/Icon';
import { formatDate, initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

/** Colour per attendance status, shared by the picker and the badges. */
const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  Present: { bg: theme.colors.mint[500], fg: theme.colors.white, border: theme.colors.mint[500] },
  Absent: { bg: theme.colors.rose[500], fg: theme.colors.white, border: theme.colors.rose[500] },
  Late: { bg: theme.colors.amber[400], fg: theme.colors.white, border: theme.colors.amber[400] },
  Excused: { bg: theme.colors.blue[500], fg: theme.colors.white, border: theme.colors.blue[500] },
};

/**
 * Attendance module.
 *
 * Staff get a history view and a marking sheet; students see their own record
 * and parents a linked child's — matching the role split in the controller.
 */
export function AttendanceScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isStaff = role === 'Admin' || role === 'Teacher';
  const isParent = role === 'Parent';

  const [staffTab, setStaffTab] = useState<'history' | 'mark'>('history');
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [filterClassId, setFilterClassId] = useState<number | null>(null);
  const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [markDate, setMarkDate] = useState(todayInput());
  const [childId, setChildId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AttendanceSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const classes = useAsync(
    (signal) => (isStaff ? fetchClasses(signal) : Promise.resolve([])),
    [isStaff],
  );
  const sections = useAsync(
    (signal) => (isStaff ? fetchSections(signal) : Promise.resolve([])),
    [isStaff],
  );
  const children = useAsync(
    (signal) => (isParent ? fetchParentChildren(signal) : Promise.resolve([])),
    [isParent],
  );

  const historyKey = `${filterClassId ?? ''}:${filterSectionId ?? ''}:${from}:${to}`;
  const sessions = useAsync(
    (signal) =>
      isStaff
        ? fetchSessions(
            { classId: filterClassId, sectionId: filterSectionId, from: from || null, to: to || null },
            signal,
          )
        : Promise.resolve([]),
    [isStaff, historyKey],
  );

  const markKey = `${classId ?? ''}:${sectionId ?? ''}:${markDate}`;
  const roster = useAsync(
    (signal) =>
      isStaff && staffTab === 'mark' && classId !== null && sectionId !== null && markDate
        ? fetchRoster(classId, sectionId, markDate, signal)
        : Promise.resolve(null as AttendanceRoster | null),
    [isStaff, staffTab, markKey],
  );

  /**
   * The roster endpoint does not return the session id, only per-record ids, and
   * the API rejects a second POST for the same section and date. Looking the
   * session up here means the sheet updates the existing register instead of
   * failing with a 409 on the second save.
   */
  const existingSession = useAsync(
    (signal) => {
      if (!isStaff || staffTab !== 'mark' || classId === null || sectionId === null || !markDate) {
        return Promise.resolve(null);
      }
      return fetchSessions({ classId, sectionId, from: markDate, to: markDate }, signal).then(
        (rows) => rows.find((row) => row.Date.slice(0, 10) === markDate) ?? null,
      );
    },
    [isStaff, staffTab, markKey],
  );

  const mineKey = isParent ? `child:${childId ?? ''}` : 'mine';
  const mine = useAsync(
    (signal) => {
      if (isStaff) return Promise.resolve([] as StudentAttendanceRow[]);
      if (isParent) {
        if (childId === null) return Promise.resolve([] as StudentAttendanceRow[]);
        return fetchStudentAttendance(childId, signal);
      }
      return fetchMyAttendance(signal);
    },
    [isStaff, isParent, mineKey],
  );

  /* --------------------------------------------------------------- defaults */

  useEffect(() => {
    if (!isStaff) return;
    if (classId === null && classes.data && classes.data.length > 0) {
      setClassId(classes.data[0].Id);
    }
  }, [isStaff, classes.data, classId]);

  useEffect(() => {
    if (!isStaff || classId === null) return;
    if (sectionId === null || !(sections.data ?? []).some((s) => s.Id === sectionId && s.ClassId === classId)) {
      setSectionId((sections.data ?? []).find((s) => s.ClassId === classId)?.Id ?? null);
    }
  }, [isStaff, sections.data, classId, sectionId]);

  useEffect(() => {
    if (!isParent) return;
    if (childId === null && children.data && children.data.length > 0) {
      setChildId(children.data[0].StudentId);
    }
  }, [isParent, children.data, childId]);

  const sectionsOf = (forClassId: number | null) =>
    (sections.data ?? []).filter((s) => s.ClassId === forClassId);

  const refresh = () => {
    void sessions.refetch();
    void roster.refetch();
    void existingSession.refetch();
    void mine.refetch();
    void classes.refetch();
    void sections.refetch();
    if (isParent) void children.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  async function run(action: () => Promise<unknown>, successMessage: string, close?: () => void) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: 'success', message: successMessage });
      close?.();
      refresh();
      return true;
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Something went wrong.',
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const openDetail = async (sessionId: number) => {
    setDetailLoading(true);
    setFeedback(null);
    try {
      setDetail(await fetchSession(sessionId));
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not load that session.',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  /* ----------------------------------------------------- learner / parent UI */

  if (!isStaff) {
    const rows = mine.data ?? [];
    const summary = summarize(rows);

    return (
      <Screen onRefresh={refresh} refreshing={mine.loading && !!mine.data}>
        <PageHeader
          title="Attendance"
          subtitle={isParent ? 'Your child’s attendance record.' : 'Your attendance record.'}
        />

        {isParent ? (
          <Select
            label="Child"
            value={childId}
            options={(children.data ?? []).map((child: Child) => ({
              value: child.StudentId,
              label: `${child.StudentName} — ${child.ClassName ?? 'No class'}`,
            }))}
            onChange={setChildId}
            placeholder="Select child"
            title="Select child"
            style={styles.childPicker}
          />
        ) : null}

        <View style={styles.summaryRow}>
          <SummaryTile label="Present" value={summary.Present} tone="mint" />
          <SummaryTile label="Absent" value={summary.Absent} tone="rose" />
          <SummaryTile label="Late" value={summary.Late} tone="amber" />
          <SummaryTile label="Excused" value={summary.Excused} tone="blue" />
        </View>

        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>Attendance rate</Text>
          <Text style={styles.rateValue}>{summary.rate}%</Text>
          <Text style={styles.rateHint}>
            {summary.attended} of {rows.length} marked session{rows.length === 1 ? '' : 's'}
          </Text>
        </View>

        <ListPanel
          title="Daily record"
          subtitle="Most recent first."
          action={<CountPill count={rows.length} label="days" />}
          items={rows}
          keyExtractor={(item) => String(item.Id)}
          loading={mine.loading && !mine.data}
          error={mine.error}
          status={mine.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyTitle={isParent && childId === null ? 'No child selected' : undefined}
          emptyMessage={
            isParent && childId === null
              ? 'Pick a child to see their attendance.'
              : 'No attendance has been recorded yet.'
          }
          emptyIcon="clipboardCheck"
          style={styles.listSpacing}
          renderItem={(row) => (
            <ListRow
              leading={<Avatar text={initials(row.Status)} tone="mint" />}
              title={formatDate(row.Date)}
              meta={[row.ClassName, row.SectionName, row.Remarks || null]
                .filter(Boolean)
                .join('  ·  ')}
              trailing={<Badge label={row.Status} tone={statusTone(row.Status)} />}
            />
          )}
        />
      </Screen>
    );
  }

  /* ------------------------------------------------------------ staff UI */

  return (
    <Screen onRefresh={refresh} refreshing={sessions.loading && !!sessions.data}>
      <PageHeader
        title="Attendance"
        subtitle="Mark a section's register and review past sessions."
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ChipGroup
        options={[
          { value: 'history', label: 'Session History', icon: 'history' },
          { value: 'mark', label: 'Mark Attendance', icon: 'checkCircle' },
        ]}
        value={staffTab}
        onChange={setStaffTab}
        style={styles.tabs}
      />

      {staffTab === 'history' ? (
        <>
          <View style={styles.filterRow}>
            <Select
              label="Class"
              value={filterClassId}
              options={(classes.data ?? []).map((c) => ({ value: c.Id, label: c.Name }))}
              onChange={(value) => {
                setFilterClassId(value);
                setFilterSectionId(null);
              }}
              placeholder="All classes"
              clearLabel="All classes"
              title="Filter by class"
              searchable
              style={styles.filter}
            />
            <Select
              label="Section"
              value={filterSectionId}
              options={sectionsOf(filterClassId).map((s) => ({ value: s.Id, label: s.Name }))}
              onChange={setFilterSectionId}
              placeholder="All sections"
              clearLabel="All sections"
              title="Filter by section"
              disabled={filterClassId === null}
              style={styles.filter}
            />
            <Input
              label="From"
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.filter}
            />
            <Input
              label="To"
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.filter}
            />
          </View>

          <ListPanel
            title="Sessions"
            subtitle="Newest first. Tap a session to see every mark and correct it."
            action={<CountPill count={sessions.data?.length ?? 0} label="sessions" />}
            items={sessions.data ?? []}
            keyExtractor={(item) => String(item.Id)}
            loading={sessions.loading && !sessions.data}
            error={sessions.error}
            status={sessions.status}
            onRetry={refresh}
            onSignIn={onSignIn}
            emptyMessage="No attendance sessions match these filters."
            emptyIcon="clipboardCheck"
            renderItem={(session) => (
              <ListRow
                leading={
                  <View style={styles.markTile}>
                    <Text style={styles.markValue}>{session.Marked}</Text>
                    <Text style={styles.markTotal}>/{session.Total}</Text>
                  </View>
                }
                title={`${session.ClassName} · ${session.SectionName}`}
                meta={`${formatDate(session.Date)}  ·  ${
                  session.TeacherName ?? 'Marked by an administrator'
                }`}
                trailing={
                  <View style={styles.actions}>
                    <Badge
                      label={session.Marked === session.Total ? 'Complete' : 'Partial'}
                      tone={session.Marked === session.Total ? 'mint' : 'amber'}
                    />
                    <IconButton
                      icon="eye"
                      label="View session"
                      size={30}
                      iconSize={14}
                      onPress={() => void openDetail(session.Id)}
                    />
                  </View>
                }
                onPress={() => void openDetail(session.Id)}
              />
            )}
          />
        </>
      ) : (
        <>
          <View style={styles.filterRow}>
            <Select
              label="Class"
              value={classId}
              options={(classes.data ?? []).map((c) => ({ value: c.Id, label: c.Name }))}
              onChange={(value) => {
                setClassId(value);
                setSectionId(null);
              }}
              placeholder="Select class"
              title="Select class"
              searchable
              style={styles.filter}
            />
            <Select
              label="Section"
              value={sectionId}
              options={sectionsOf(classId).map((s) => ({ value: s.Id, label: s.Name }))}
              onChange={setSectionId}
              placeholder={classId === null ? 'Pick a class first' : 'Select section'}
              title="Select section"
              disabled={classId === null}
              style={styles.filter}
            />
            <Input
              label="Date"
              value={markDate}
              onChangeText={setMarkDate}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.filter}
            />
          </View>

          <MarkingSheet
            roster={roster.data}
            existingSessionId={existingSession.data?.Id ?? null}
            loading={roster.loading}
            error={roster.error}
            status={roster.status}
            onRetry={refresh}
            onSignIn={onSignIn}
            busy={busy}
            onSave={(records) => {
              if (classId === null || sectionId === null) return Promise.resolve(false);
              const payload = {
                ClassId: classId,
                SectionId: sectionId,
                Date: markDate,
                Records: records.map((record) => ({
                  StudentId: record.StudentId,
                  Status: record.Status,
                  // The API stores remarks as a non-null string.
                  Remarks: record.Remarks ?? '',
                })),
              };
              const existingId = existingSession.data?.Id ?? null;
              return run(
                () =>
                  existingId ? updateSession(existingId, payload) : createSession(payload),
                existingId ? 'Attendance updated.' : 'Attendance marked successfully.',
              );
            }}
          />
        </>
      )}

      {/* ---------------------------------------------------------- detail */}

      <Modal
        visible={detail !== null}
        onClose={() => setDetail(null)}
        title="Session detail"
        subtitle={
          detail
            ? `${detail.Session.ClassName} · ${detail.Session.SectionName} · ${formatDate(detail.Session.Date)}`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onPress={() => setDetail(null)}>
              Close
            </Button>
            <Button
              icon="edit"
              onPress={() => {
                if (!detail) return;
                // Jump into the marking sheet pre-set to this session's class,
                // section and date so it can be corrected in place.
                setClassId(detail.Session.ClassId);
                setSectionId(detail.Session.SectionId);
                setMarkDate(toDateInputString(detail.Session.Date));
                setDetail(null);
                setStaffTab('mark');
              }}
            >
              Correct in marking sheet
            </Button>
          </>
        }
      >
        {detailLoading ? (
          <Text style={styles.loadingText}>Loading session…</Text>
        ) : detail ? (
          <>
            <FieldSection title="Session">
              <FieldGrid>
                <Field label="Date" value={formatDate(detail.Session.Date)} />
                <Field label="Section" value={`${detail.Session.ClassName} · ${detail.Session.SectionName}`} />
                <Field
                  label="Teacher"
                  value={
                    detail.Records.length > 0
                      ? detail.Session.TeacherId
                        ? `Teacher ID ${detail.Session.TeacherId}`
                        : 'Marked by an administrator'
                      : '—'
                  }
                />
                <Field label="Records" value={detail.Records.length} />
              </FieldGrid>
            </FieldSection>

            <Text style={styles.detailHeading}>Marks</Text>
            {detail.Records.map((record) => (
              <View key={record.Id} style={styles.detailRow}>
                <View style={styles.detailRowText}>
                  <Text style={styles.detailName}>{record.Username}</Text>
                  <Text style={styles.detailMeta}>
                    Roll {record.RollNumber}
                    {record.Remarks ? `  ·  ${record.Remarks}` : ''}
                  </Text>
                </View>
                <Badge label={record.Status} tone={statusTone(record.Status)} />
              </View>
            ))}
          </>
        ) : null}
      </Modal>
    </Screen>
  );
}

/* --------------------------------------------------------- marking sheet */

interface DraftRecord {
  StudentId: number;
  Status: string;
  Remarks: string | null;
}

/**
 * The register itself. Every student defaults to Present (matching the API's own
 * default), statuses already stored for the date are pre-filled, and a bulk
 * "mark all present" keeps a large section quick to record.
 */
function MarkingSheet({
  roster,
  existingSessionId,
  loading,
  error,
  status,
  onRetry,
  onSignIn,
  busy,
  onSave,
}: {
  roster: AttendanceRoster | null;
  /** Non-null when the section already has a register for this date. */
  existingSessionId: number | null;
  loading: boolean;
  error: Error | null;
  status: number | null;
  onRetry: () => void;
  onSignIn: () => void;
  busy: boolean;
  onSave: (records: DraftRecord[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Record<number, DraftRecord>>({});
  const [remarkTarget, setRemarkTarget] = useState<RosterStudent | null>(null);
  const [remarkText, setRemarkText] = useState('');

  // Re-seed whenever the roster changes (class, section or date switched).
  useEffect(() => {
    if (!roster) {
      setDraft({});
      return;
    }
    const next: Record<number, DraftRecord> = {};
    for (const student of roster.Students) {
      next[student.StudentId] = {
        StudentId: student.StudentId,
        Status: student.Status ?? 'Present',
        Remarks: student.Remarks ?? null,
      };
    }
    setDraft(next);
  }, [roster]);

  const records = useMemo(() => Object.values(draft), [draft]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
    for (const record of records) base[record.Status] = (base[record.Status] ?? 0) + 1;
    return base;
  }, [records]);

  const setAll = (next: string) =>
    setDraft((prev) => {
      const copy: Record<number, DraftRecord> = {};
      for (const [key, value] of Object.entries(prev)) {
        copy[Number(key)] = { ...value, Status: next };
      }
      return copy;
    });

  const setStatus = (studentId: number, next: string) =>
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], Status: next } }));

  const saveRemark = () => {
    if (!remarkTarget) return;
    setDraft((prev) => ({
      ...prev,
      [remarkTarget.StudentId]: { ...prev[remarkTarget.StudentId], Remarks: remarkText || null },
    }));
    setRemarkTarget(null);
  };

  if (!roster && !loading) {
    return (
      <View style={styles.panelPlaceholder}>
        <Icon name="clipboardCheck" size={22} color={theme.colors.ink[400]} />
        <Text style={styles.placeholderText}>
          Pick a class, section and date to open the register.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerText}>
          <Text style={styles.cardTitle}>Register</Text>
          <Text style={styles.cardSubtitle}>
            {roster
              ? `${roster.Date.slice(0, 10)} · ${records.length} student(s)`
              : 'Loading register…'}
          </Text>
        </View>
        <CountPill count={counts.Present} label="present" />
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading register…</Text>
      ) : error ? (
        <View style={styles.padded}>
          <Banner tone="error" message={error.message} />
          <View style={styles.retryRow}>
            <Button variant="ghost" icon="refresh" onPress={onRetry}>
              Retry
            </Button>
            {status === 401 ? (
              <Button variant="ghost" icon="login" onPress={onSignIn}>
                Sign in again
              </Button>
            ) : null}
          </View>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.padded}>
          <Banner
            tone="info"
            message="No students are enrolled in this section, so there is nothing to mark."
          />
        </View>
      ) : (
        <>
          <View style={styles.bulkRow}>
            <Button variant="ghost" icon="check" onPress={() => setAll('Present')}>
              All present
            </Button>
            <Button variant="ghost" icon="close" onPress={() => setAll('Absent')}>
              All absent
            </Button>
          </View>

          <View style={styles.countRow}>
            {ATTENDANCE_STATUSES.map((s) => (
              <Text key={s} style={styles.countText}>
                {s}: {counts[s] ?? 0}
              </Text>
            ))}
          </View>

          {(roster?.Students ?? []).map((student) => (
            <View key={student.StudentId} style={styles.registerRow}>
              <View style={styles.registerHead}>
                <Avatar text={initials(student.Username)} />
                <View style={styles.registerText}>
                  <Text style={styles.registerName} numberOfLines={1}>
                    {student.Username}
                  </Text>
                  <Text style={styles.registerMeta}>
                    Roll {student.RollNumber}
                    {draft[student.StudentId]?.Remarks
                      ? `  ·  ${draft[student.StudentId]?.Remarks}`
                      : ''}
                  </Text>
                </View>
                <IconButton
                  icon="edit"
                  label={`Add remark for ${student.Username}`}
                  size={30}
                  iconSize={14}
                  onPress={() => {
                    setRemarkTarget(student);
                    setRemarkText(draft[student.StudentId]?.Remarks ?? '');
                  }}
                />
              </View>

              <View style={styles.statusRow}>
                {ATTENDANCE_STATUSES.map((option) => {
                  const active = draft[student.StudentId]?.Status === option;
                  const palette = STATUS_COLORS[option];
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setStatus(student.StudentId, option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.statusChip,
                        active
                          ? { backgroundColor: palette.bg, borderColor: palette.border }
                          : null,
                      ]}
                    >
                      <Text
                        style={[styles.statusChipText, active ? { color: palette.fg } : null]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.saveRow}>
            <Button
              loading={busy}
              disabled={busy}
              icon="save"
              onPress={() => void onSave(records)}
            >
              {existingSessionId ? 'Update Attendance' : 'Save Attendance'}
            </Button>
          </View>
        </>
      )}

      <Modal
        visible={remarkTarget !== null}
        onClose={() => setRemarkTarget(null)}
        title="Remark"
        subtitle={remarkTarget?.Username}
        footer={
          <>
            <Button variant="ghost" onPress={() => setRemarkTarget(null)}>
              Cancel
            </Button>
            <Button onPress={saveRemark}>Apply</Button>
          </>
        }
      >
        <Input
          label="Remark (optional)"
          value={remarkText}
          onChangeText={setRemarkText}
          placeholder="e.g. Doctor's appointment"
          autoFocus
        />
      </Modal>
    </View>
  );
}

/**
 * The roster endpoint does not return the session id, only per-record ids. The
 * service therefore resolves the id from the session list when the sheet is
 * saved, which is why the API returns the existing session on a 409.
 */
/* ---------------------------------------------------------------- helpers */

function toDateInputString(value: string): string {
  // The API returns a full ISO instant; the form and roster expect YYYY-MM-DD.
  return value.slice(0, 10);
}

function summarize(rows: StudentAttendanceRow[]) {
  const counts: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
  for (const row of rows) {
    if (row.Status in counts) counts[row.Status] = (counts[row.Status] ?? 0) + 1;
  }

  const present = counts.Present ?? 0;
  const absent = counts.Absent ?? 0;
  const late = counts.Late ?? 0;
  const excused = counts.Excused ?? 0;

  const attended = present + late;
  const counted = present + absent + late;
  const rate = counted === 0 ? 0 : Math.round((attended / counted) * 100);

  return {
    Present: present,
    Absent: absent,
    Late: late,
    Excused: excused,
    attended,
    rate,
    counted,
  };
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'mint' | 'rose' | 'amber' | 'blue';
}) {
  const palette = {
    mint: { bg: theme.colors.mint[50], fg: theme.colors.mint[700] },
    rose: { bg: theme.colors.rose[50], fg: theme.colors.rose[600] },
    amber: { bg: theme.colors.amber[50], fg: theme.colors.amber[500] },
    blue: { bg: theme.colors.blue[50], fg: theme.colors.blue[500] },
  }[tone];

  return (
    <View style={[styles.summaryTile, { backgroundColor: palette.bg }]}>
      <Text style={[styles.summaryValue, { color: palette.fg }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  tabs: {
    marginBottom: theme.spacing[4],
  },
  childPicker: {
    marginBottom: theme.spacing[4],
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  filter: {
    flex: 1,
    minWidth: 140,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  summaryTile: {
    flex: 1,
    minWidth: '22%',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSize['5xl'],
    fontWeight: theme.fontWeight.bold,
  },
  summaryLabel: {
    marginTop: 2,
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
  rateLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  rateValue: {
    marginTop: theme.spacing[1],
    fontSize: 30,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.5,
    color: theme.colors.ink[900],
  },
  rateHint: {
    marginTop: theme.spacing[0.5],
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[400],
  },
  listSpacing: {
    marginTop: theme.spacing[5],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  markTile: {
    width: 44,
    height: 36,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  markTotal: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
  },
  panelPlaceholder: {
    alignItems: 'center',
    gap: theme.spacing[3],
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing[10],
  },
  placeholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.ink[500],
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  loadingText: {
    padding: theme.spacing[5],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
  },
  padded: {
    padding: theme.spacing[4],
  },
  retryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  bulkRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  countText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  registerRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2.5],
  },
  registerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  registerText: {
    flex: 1,
  },
  registerName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  registerMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1.5],
  },
  statusChip: {
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
  },
  statusChipText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[500],
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  detailHeading: {
    marginTop: theme.spacing[5],
    marginBottom: theme.spacing[2],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[700],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  detailRowText: {
    flex: 1,
  },
  detailName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[900],
  },
  detailMeta: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 1,
  },
});
