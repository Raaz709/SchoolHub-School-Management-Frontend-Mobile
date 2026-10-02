import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  TIMETABLE_DAYS,
  createTimeSlot,
  createTimetableEntry,
  deleteTimeSlot,
  deleteTimetableEntry,
  dayLabel,
  fetchMyTimetable,
  fetchStudentTimetable,
  fetchTimeSlots,
  fetchTimetable,
  updateTimeSlot,
  updateTimetableEntry,
  type TimeSlot,
  type TimetableEntry,
} from '../../api/timetable';
import { fetchClasses, fetchSections, fetchSubjects, type Subject } from '../../api/academic';
import { fetchTeachers, type Teacher } from '../../api/teachers';
import { fetchParentChildren, type Child } from '../../api/portals';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Button, IconButton } from '../../components/common/Button';
import { ConfirmModal, Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ChipGroup, Select } from '../../components/common/Select';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { formatTime } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

type PendingDelete =
  | { kind: 'entry'; item: TimetableEntry }
  | { kind: 'slot'; item: TimeSlot }
  | null;

/**
 * Timetable module.
 *
 * Scope depends on the role, mirroring the API's own authorization:
 *   Admin         — any class/section week, plus entry and period management
 *   Teacher       — their own teaching week
 *   Student       — their own class's week, resolved server-side
 *   Parent        — a linked child's week, picked from their children
 */
export function TimetableScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'Admin';
  const isTeacher = role === 'Teacher';
  const isParent = role === 'Parent';

  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [childId, setChildId] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [adminTab, setAdminTab] = useState<'week' | 'periods'>('week');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [editingEntry, setEditingEntry] = useState<{ entry: TimetableEntry | null } | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ slot: TimeSlot | null } | null>(null);

  /* ------------------------------------------------------------ reference */

  const classes = useAsync(
    (signal) => (isAdmin ? fetchClasses(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const sections = useAsync(
    (signal) => (isAdmin ? fetchSections(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const subjects = useAsync(
    (signal) => (isAdmin ? fetchSubjects(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const teachers = useAsync(
    (signal) => (isAdmin ? fetchTeachers(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const slots = useAsync(
    (signal) => (isAdmin ? fetchTimeSlots(signal) : Promise.resolve([])),
    [isAdmin],
  );
  const children = useAsync(
    (signal) => (isParent ? fetchParentChildren(signal) : Promise.resolve([])),
    [isParent],
  );

  /* ------------------------------------------------------------- the week */

  // A class/section pair is required for the admin grid; pick a sensible default
  // from the reference data rather than showing an empty page.
  useEffect(() => {
    if (!isAdmin) return;
    if (classId === null && classes.data && classes.data.length > 0) {
      setClassId(classes.data[0].Id);
    }
  }, [isAdmin, classes.data, classId]);

  useEffect(() => {
    if (!isAdmin || classId === null) return;
    const firstOfClass = (sections.data ?? []).find((s) => s.ClassId === classId);
    setSectionId(firstOfClass?.Id ?? null);
  }, [isAdmin, sections.data, classId]);

  useEffect(() => {
    if (!isParent) return;
    if (childId === null && children.data && children.data.length > 0) {
      setChildId(children.data[0].StudentId);
    }
  }, [isParent, children.data, childId]);

  const weekKey =
    isAdmin && classId !== null && sectionId !== null
      ? `class:${classId}:${sectionId}`
      : isParent && childId !== null
        ? `student:${childId}`
        : 'mine';

  const week = useAsync((signal) => {
    if (isAdmin) {
      if (classId === null || sectionId === null) return Promise.resolve([] as TimetableEntry[]);
      return fetchTimetable(classId, sectionId, signal);
    }
    if (isParent) {
      if (childId === null) return Promise.resolve([] as TimetableEntry[]);
      return fetchStudentTimetable(childId, signal);
    }
    // Teacher and Student both use the server-resolved "mine" endpoint.
    return fetchMyTimetable(signal);
  }, [weekKey]);

  const sectionOptions = useMemo(
    () => (sections.data ?? []).filter((s) => s.ClassId === classId).map((s) => ({
      value: s.Id,
      label: s.Name,
    })),
    [sections.data, classId],
  );

  const dayChips = useMemo(
    () =>
      TIMETABLE_DAYS.map((d) => ({
        value: String(d.value),
        label: d.short,
        icon: undefined,
      })),
    [],
  );

  const entriesForDay = useMemo(
    () =>
      (week.data ?? [])
        .filter((entry) => entry.DayOfWeek === day)
        .sort((a, b) => a.StartTime.localeCompare(b.StartTime)),
    [week.data, day],
  );

  const countForDay = (dayValue: number) =>
    (week.data ?? []).filter((entry) => entry.DayOfWeek === dayValue).length;

  const refresh = () => {
    void week.refetch();
    if (isAdmin) {
      void classes.refetch();
      void sections.refetch();
      void subjects.refetch();
      void teachers.refetch();
      void slots.refetch();
    }
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
      // Clash and overlap errors carry a precise 409 message — keep it.
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Something went wrong.',
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const needsSelection =
    (isAdmin && (classId === null || sectionId === null)) || (isParent && childId === null);

  const subtitle = isAdmin
    ? classId && sectionId
      ? `${(classes.data ?? []).find((c) => c.Id === classId)?.Name ?? ''} · ${
          sectionOptions.find((s) => s.value === sectionId)?.label ?? ''
        }`
      : 'Pick a class and section to build its week.'
    : isParent
      ? 'Your child’s weekly schedule.'
      : isTeacher
        ? 'Everything you are scheduled to teach.'
        : 'Your class’s weekly schedule.';

  return (
    <Screen onRefresh={refresh} refreshing={week.loading && !!week.data}>
      <PageHeader
        title="Timetable"
        subtitle={subtitle}
        action={
          isAdmin && adminTab === 'week' ? (
            <Button
              icon="plus"
              disabled={needsSelection || (slots.data ?? []).length === 0}
              onPress={() => setEditingEntry({ entry: null })}
            >
              Add Period
            </Button>
          ) : isAdmin && adminTab === 'periods' ? (
            <Button icon="plus" onPress={() => setEditingSlot({ slot: null })}>
              New Period
            </Button>
          ) : undefined
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      {isAdmin ? (
        <ChipGroup
          options={[
            { value: 'week', label: 'Timetable', icon: 'calendar' },
            { value: 'periods', label: 'Periods', icon: 'clock' },
          ]}
          value={adminTab}
          onChange={setAdminTab}
          style={styles.tabs}
        />
      ) : null}

      {isAdmin && adminTab === 'week' ? (
        <View style={styles.pickerRow}>
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
            style={styles.picker}
          />
          <Select
            label="Section"
            value={sectionId}
            options={sectionOptions}
            onChange={setSectionId}
            placeholder={classId === null ? 'Pick a class first' : 'Select section'}
            title="Select section"
            disabled={classId === null}
            style={styles.picker}
          />
        </View>
      ) : null}

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

      {isTeacher || (isAdmin && adminTab === 'periods') ? null : (
        <View style={styles.dayStrip}>
          {TIMETABLE_DAYS.map((d) => {
            const active = d.value === day;
            const count = countForDay(d.value);
            return (
              <View key={d.value} style={styles.dayChipWrapper}>
                <Button
                  variant={active ? 'primary' : 'ghost'}
                  onPress={() => setDay(d.value)}
                  style={styles.dayChip}
                >
                  {`${d.short}${count > 0 ? ` (${count})` : ''}`}
                </Button>
              </View>
            );
          })}
        </View>
      )}

      {isAdmin && adminTab === 'periods' ? (
        <ListPanel
          title="Periods"
          subtitle="The time slots every timetable entry is scheduled into."
          action={<CountPill count={slots.data?.length ?? 0} label="periods" />}
          items={slots.data ?? []}
          keyExtractor={(item) => String(item.Id)}
          loading={slots.loading && !slots.data}
          error={slots.error}
          status={slots.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyMessage="No periods have been defined yet. Add one before scheduling lessons."
          emptyIcon="clock"
          renderItem={(slot) => (
            <ListRow
              leading={<Avatar text={initialsOf(slot.Label ?? 'Period')} tone="violet" />}
              title={slot.Label ?? `${formatTime(slot.StartTime)} – ${formatTime(slot.EndTime)}`}
              meta={`${formatTime(slot.StartTime)} – ${formatTime(slot.EndTime)}`}
              trailing={
                <View style={styles.actions}>
                  <IconButton
                    icon="edit"
                    label="Edit period"
                    size={30}
                    iconSize={14}
                    onPress={() => setEditingSlot({ slot })}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete period"
                    size={30}
                    iconSize={14}
                    variant="danger"
                    color={theme.colors.rose[600]}
                    onPress={() => setPendingDelete({ kind: 'slot', item: slot })}
                  />
                </View>
              }
            />
          )}
        />
      ) : (
        <ListPanel
          title={`${dayLabel(day)} schedule`}
          subtitle={isAdmin ? 'Entries for the selected class and section.' : undefined}
          action={<CountPill count={entriesForDay.length} label="periods" />}
          items={needsSelection ? [] : entriesForDay}
          keyExtractor={(item) => String(item.Id)}
          loading={week.loading && !week.data}
          error={week.error}
          status={week.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyTitle={needsSelection ? 'Nothing selected' : undefined}
          emptyMessage={
            needsSelection
              ? 'Choose a class and section to see that week.'
              : `No lessons are scheduled for ${dayLabel(day)}.`
          }
          emptyIcon="calendar"
          renderItem={(entry) => (
            <ListRow
              leading={
                <View style={styles.timeTile}>
                  <Text style={styles.timeStart}>{formatTime(entry.StartTime)}</Text>
                  <Text style={styles.timeEnd}>{formatTime(entry.EndTime)}</Text>
                </View>
              }
              title={entry.SubjectName}
              meta={[
                isAdmin ? `${entry.ClassName} ${entry.SectionName}` : null,
                entry.TeacherName ? `Teacher: ${entry.TeacherName}` : 'No teacher assigned',
                entry.SlotLabel,
              ]
                .filter(Boolean)
                .join('  ·  ')}
              trailing={
                isAdmin ? (
                  <View style={styles.actions}>
                    <IconButton
                      icon="edit"
                      label={`Edit ${entry.SubjectName} entry`}
                      size={30}
                      iconSize={14}
                      onPress={() => setEditingEntry({ entry })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${entry.SubjectName} entry`}
                      size={30}
                      iconSize={14}
                      variant="danger"
                      color={theme.colors.rose[600]}
                      onPress={() => setPendingDelete({ kind: 'entry', item: entry })}
                    />
                  </View>
                ) : undefined
              }
            />
          )}
        />
      )}

      {isAdmin && adminTab === 'week' && (slots.data ?? []).length === 0 && !slots.loading ? (
        <View style={styles.notice}>
          <Icon name="info" size={15} color={theme.colors.blue[500]} />
          <Text style={styles.noticeText}>
            Add at least one period under the Periods tab before scheduling lessons.
          </Text>
        </View>
      ) : null}

      {/* ------------------------------------------------------------ modals */}

      <TimetableEntryModal
        open={editingEntry !== null}
        entry={editingEntry?.entry ?? null}
        defaultDay={day}
        classId={classId}
        sectionId={sectionId}
        classOptions={(classes.data ?? []).map((c) => ({ value: c.Id, label: c.Name }))}
        sections={sections.data ?? []}
        subjects={subjects.data ?? []}
        teachers={teachers.data ?? []}
        slots={slots.data ?? []}
        busy={busy}
        onClose={() => setEditingEntry(null)}
        onSave={(payload) => {
          const target = editingEntry?.entry ?? null;
          return run(
            () =>
              target
                ? updateTimetableEntry(target.Id, payload)
                : createTimetableEntry(payload),
            target ? 'Timetable entry updated.' : 'Period added to the timetable.',
            () => setEditingEntry(null),
          );
        }}
      />

      <TimeSlotModal
        open={editingSlot !== null}
        slot={editingSlot?.slot ?? null}
        busy={busy}
        onClose={() => setEditingSlot(null)}
        onSave={(payload) => {
          const target = editingSlot?.slot ?? null;
          return run(
            () => (target ? updateTimeSlot(target.Id, payload) : createTimeSlot(payload)),
            target ? 'Period updated.' : 'Period created.',
            () => setEditingSlot(null),
          );
        }}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        busy={busy}
        confirmLabel="Delete"
        title={pendingDelete?.kind === 'slot' ? 'Delete period?' : 'Remove from timetable?'}
        message={
          pendingDelete
            ? pendingDelete.kind === 'slot'
              ? `Delete "${pendingDelete.item.Label ?? 'this period'}"? The API refuses while timetable entries are still scheduled into it.`
              : `Remove ${pendingDelete.item.SubjectName} from ${dayLabel(pendingDelete.item.DayOfWeek)} at ${formatTime(pendingDelete.item.StartTime)}?`
            : ''
        }
        onConfirm={() => {
          const action = pendingDelete;
          if (!action) return;
          void run(
            () =>
              action.kind === 'slot'
                ? deleteTimeSlot(action.item.Id)
                : deleteTimetableEntry(action.item.Id),
            action.kind === 'slot' ? 'Period deleted.' : 'Timetable entry removed.',
            () => setPendingDelete(null),
          );
        }}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

function initialsOf(value: string): string {
  return value.slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------- modals */

function TimetableEntryModal({
  open,
  entry,
  defaultDay,
  classId,
  sectionId,
  classOptions,
  sections,
  subjects,
  teachers,
  slots,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  entry: TimetableEntry | null;
  defaultDay: number;
  classId: number | null;
  sectionId: number | null;
  classOptions: { value: number; label: string }[];
  sections: { Id: number; Name: string; ClassId: number | null }[];
  subjects: Subject[];
  teachers: Teacher[];
  slots: TimeSlot[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    ClassId: number;
    SectionId: number;
    SubjectId: number;
    TeacherId: number;
    TimeSlotId: number;
    DayOfWeek: number;
  }) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    ClassId: null as number | null,
    SectionId: null as number | null,
    SubjectId: null as number | null,
    TeacherId: null as number | null,
    TimeSlotId: null as number | null,
    DayOfWeek: defaultDay,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      ClassId: entry?.ClassId ?? classId,
      SectionId: entry?.SectionId ?? sectionId,
      SubjectId: entry?.SubjectId ?? null,
      TeacherId: entry?.TeacherId ?? null,
      TimeSlotId: entry?.TimeSlotId ?? (slots[0]?.Id ?? null),
      DayOfWeek: entry?.DayOfWeek ?? defaultDay,
    });
  }, [open, entry, classId, sectionId, defaultDay, slots]);

  const sectionOptions = sections
    .filter((s) => s.ClassId === form.ClassId)
    .map((s) => ({ value: s.Id, label: s.Name }));

  const canSubmit =
    form.ClassId !== null &&
    form.SectionId !== null &&
    form.SubjectId !== null &&
    form.TimeSlotId !== null;

  return (
    <Modal
      visible={open}
      onClose={onClose}
      title={entry ? 'Edit Period' : 'Add Period to Timetable'}
      subtitle="The API rejects a double-booked class/section slot or teacher."
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || !canSubmit}
            onPress={() =>
              onSave({
                ClassId: form.ClassId as number,
                SectionId: form.SectionId as number,
                SubjectId: form.SubjectId as number,
                // 0 means "no teacher": the API stores that as NULL.
                TeacherId: form.TeacherId ?? 0,
                TimeSlotId: form.TimeSlotId as number,
                DayOfWeek: form.DayOfWeek,
              })
            }
          >
            {entry ? 'Save Changes' : 'Add to Timetable'}
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Select
          label="Day"
          value={form.DayOfWeek}
          options={TIMETABLE_DAYS.map((d) => ({ value: d.value, label: d.label }))}
          onChange={(value) => setForm((p) => ({ ...p, DayOfWeek: value ?? 1 }))}
          placeholder="Select day"
          title="Select day"
        />

        <Select
          label="Period"
          value={form.TimeSlotId}
          options={slots.map((slot) => ({
            value: slot.Id,
            label:
              slot.Label ?? `${formatTime(slot.StartTime)} – ${formatTime(slot.EndTime)}`,
            hint: slot.Label ? `${formatTime(slot.StartTime)} – ${formatTime(slot.EndTime)}` : undefined,
          }))}
          onChange={(value) => setForm((p) => ({ ...p, TimeSlotId: value }))}
          placeholder="Select period"
          title="Select period"
        />

        <Select
          label="Class"
          value={form.ClassId}
          options={classOptions}
          onChange={(value) => setForm((p) => ({ ...p, ClassId: value, SectionId: null }))}
          placeholder="Select class"
          title="Select class"
          searchable
        />

        <Select
          label="Section"
          value={form.SectionId}
          options={sectionOptions}
          onChange={(value) => setForm((p) => ({ ...p, SectionId: value }))}
          placeholder={form.ClassId === null ? 'Pick a class first' : 'Select section'}
          title="Select section"
          disabled={form.ClassId === null}
        />

        <Select
          label="Subject"
          value={form.SubjectId}
          options={subjects.map((s) => ({ value: s.Id, label: s.Name, hint: s.Code }))}
          onChange={(value) => setForm((p) => ({ ...p, SubjectId: value }))}
          placeholder="Select subject"
          title="Select subject"
          searchable
        />

        <Select
          label="Teacher (optional)"
          value={form.TeacherId}
          options={teachers.map((t) => ({ value: t.Id, label: t.Username, hint: t.EmployeeCode }))}
          onChange={(value) => setForm((p) => ({ ...p, TeacherId: value }))}
          placeholder="No teacher"
          clearLabel="No teacher"
          title="Select teacher"
          searchable
        />
      </View>
    </Modal>
  );
}

function TimeSlotModal({
  open,
  slot,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  slot: TimeSlot | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    StartTime: string;
    EndTime: string;
    Label: string | null;
  }) => Promise<boolean>;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open) return;
    // The API returns `HH:mm:ss`; the form edits `HH:mm`.
    setStart(slot ? formatTime(slot.StartTime) : '');
    setEnd(slot ? formatTime(slot.EndTime) : '');
    setLabel(slot?.Label ?? '');
  }, [open, slot]);

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const timesValid = timePattern.test(start) && timePattern.test(end);

  return (
    <Modal
      visible={open}
      onClose={onClose}
      title={slot ? 'Edit Period' : 'New Period'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || !timesValid}
            onPress={() =>
              onSave({
                StartTime: `${start}:00`,
                EndTime: `${end}:00`,
                Label: label.trim() || null,
              })
            }
          >
            {slot ? 'Save' : 'Create Period'}
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Input
          label="Start Time"
          value={start}
          onChangeText={setStart}
          placeholder="08:00"
          hint="24-hour HH:mm."
          autoFocus={!slot}
        />
        <Input
          label="End Time"
          value={end}
          onChangeText={setEnd}
          placeholder="08:45"
          hint="24-hour HH:mm. Must be after the start time."
        />
        <Input
          label="Label (optional)"
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Period 1"
        />
        {!timesValid && (start.length > 0 || end.length > 0) ? (
          <Text style={styles.hintText}>Enter both times as HH:mm, for example 08:00.</Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  tabs: {
    marginBottom: theme.spacing[4],
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  picker: {
    flex: 1,
    minWidth: 150,
  },
  childPicker: {
    marginBottom: theme.spacing[4],
  },
  dayStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1.5],
    marginBottom: theme.spacing[4],
  },
  dayChipWrapper: {
    flexGrow: 1,
    flexBasis: '13%',
  },
  dayChip: {
    paddingHorizontal: theme.spacing[1],
    minHeight: 36,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  timeTile: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.lineSoft,
    paddingVertical: theme.spacing[1.5],
  },
  timeStart: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  timeEnd: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
    marginTop: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.blue[50],
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[3],
  },
  noticeText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.blue[500],
  },
  formStack: {
    gap: theme.spacing[3.5],
  },
  hintText: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
});
