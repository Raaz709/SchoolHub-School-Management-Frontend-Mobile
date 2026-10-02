import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  assignTeacherSubjects,
  createTeacher,
  deactivateTeacher,
  fetchTeachers,
  updateTeacher,
  type Teacher,
} from '../../api/teachers';
import { fetchDepartments, fetchSubjects, type Department, type Subject } from '../../api/academic';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge } from '../../components/common/Badge';
import { Button, IconButton } from '../../components/common/Button';
import { ConfirmModal, Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchBar } from '../../components/common/SearchBar';
import { CheckboxList } from '../../components/common/Checkbox';
import { ActionBar, Field, FieldGrid, FieldSection } from '../../components/common/Field';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { formatDate, initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type Feedback = { tone: 'success' | 'error'; message: string } | null;

export function TeachersScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<Teacher | null>(null);
  const [busy, setBusy] = useState(false);

  // Every read is admin-gated: the endpoints 403 for anyone else, so a
  // non-admin must not issue them at all.
  const load = useCallback(
    <T,>(fetcher: (signal?: AbortSignal) => Promise<T>, fallback: T) =>
      isAdmin ? fetcher : () => Promise.resolve(fallback),
    [isAdmin],
  );

  const teachers = useAsync(load(fetchTeachers, [] as Teacher[]), [isAdmin]);
  const departments = useAsync(load(fetchDepartments, [] as Department[]), [isAdmin]);
  const subjects = useAsync(load(fetchSubjects, [] as Subject[]), [isAdmin]);

  const refresh = () => {
    void teachers.refetch();
    void departments.refetch();
    void subjects.refetch();
  };

  const departmentOptions = useMemo(
    () => (departments.data ?? []).map((d) => ({ value: d.Id, label: d.Name })),
    [departments.data],
  );

  const rows = useMemo(() => teachers.data ?? [], [teachers.data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((teacher) => {
      if (status === 'active' && !teacher.IsActive) return false;
      if (status === 'inactive' && teacher.IsActive) return false;
      if (!needle) return true;
      return [teacher.Username, teacher.Email, teacher.EmployeeCode, teacher.DepartmentName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, status]);

  const activeCount = rows.filter((t) => t.IsActive).length;

  /** A subject belongs to the teacher whose id matches its `TeacherId`. */
  const taughtSubjects = useMemo(
    () => (subjects.data ?? []).filter((s) => s.TeacherId === selected?.Id),
    [subjects.data, selected],
  );

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

  if (!isAdmin) {
    return (
      <Screen>
        <PageHeader title="Teachers" subtitle="Staff directory and subject allocation." />
        <View style={styles.restricted}>
          <Icon name="shield" size={22} color={theme.colors.ink[400]} />
          <Text style={styles.restrictedText}>
            Teacher management is restricted to administrators.
          </Text>
        </View>
      </Screen>
    );
  }

  const onSignIn = () => {
    void signOut();
  };

  return (
    <Screen onRefresh={refresh} refreshing={teachers.loading && !!teachers.data}>
      <PageHeader
        title="Teachers"
        subtitle={`${rows.length} teacher${rows.length === 1 ? '' : 's'} · ${activeCount} active`}
        action={
          <Button icon="plus" onPress={() => setCreating(true)}>
            Add Teacher
          </Button>
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ListPanel
        title="Staff directory"
        subtitle="Search by name, email, employee code or department."
        action={<CountPill count={filtered.length} label="shown" />}
        items={filtered}
        keyExtractor={(item) => String(item.Id)}
        loading={teachers.loading && !teachers.data}
        error={teachers.error}
        status={teachers.status}
        onRetry={refresh}
        onSignIn={onSignIn}
        emptyTitle={query || status !== 'all' ? 'No matching teachers' : undefined}
        emptyMessage={
          query || status !== 'all'
            ? 'Try a different search or status filter.'
            : 'No teachers have been added yet.'
        }
        emptyIcon="teachers"
        toolbar={
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Name, email, code or department"
            />
            <Select
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => setStatus(value ?? 'all')}
              placeholder="All statuses"
              title="Filter by status"
              style={styles.filter}
            />
          </>
        }
        renderItem={(teacher) => (
          <ListRow
            leading={<Avatar text={initials(teacher.Username)} tone="blue" />}
            title={teacher.Username}
            meta={`${teacher.EmployeeCode}  ·  ${teacher.DepartmentName ?? 'No department'}  ·  ${formatDate(teacher.HireDate)}`}
            selected={selected?.Id === teacher.Id}
            trailing={
              <View style={styles.rowTrailing}>
                <Badge
                  label={teacher.IsActive ? 'Active' : 'Inactive'}
                  tone={teacher.IsActive ? 'mint' : 'rose'}
                />
                <IconButton
                  icon="edit"
                  label={`Edit ${teacher.Username}`}
                  size={30}
                  iconSize={14}
                  onPress={() => setEditing(teacher)}
                />
                {teacher.IsActive ? (
                  <IconButton
                    icon="userRemove"
                    label={`Deactivate ${teacher.Username}`}
                    size={30}
                    iconSize={14}
                    variant="danger"
                    color={theme.colors.rose[600]}
                    onPress={() => setPendingDeactivate(teacher)}
                  />
                ) : null}
              </View>
            }
            onPress={() => setSelected((prev) => (prev?.Id === teacher.Id ? null : teacher))}
          />
        )}
      />

      {selected ? (
        <>
          <View style={styles.detailCard}>
            <FieldSection title={`Teacher record — ${selected.Username}`}>
              <FieldGrid>
                <Field label="Employee Code" value={selected.EmployeeCode} />
                <Field label="Department" value={selected.DepartmentName ?? 'Not assigned'} />
                <Field label="Hire Date" value={formatDate(selected.HireDate)} />
                <Field label="Email" value={selected.Email} />
                <Field label="Status" value={selected.IsActive ? 'Active' : 'Inactive'} />
                <Field label="User ID" value={selected.UserId} />
              </FieldGrid>
            </FieldSection>

            <ActionBar>
              <Button variant="ghost" icon="edit" onPress={() => setEditing(selected)}>
                Edit
              </Button>
              <Button
                variant={selected.IsActive ? 'danger' : 'mint'}
                disabled={!selected.IsActive}
                icon={selected.IsActive ? 'xCircle' : 'checkCircle'}
                onPress={() => {
                  if (selected.IsActive) setPendingDeactivate(selected);
                }}
              >
                {selected.IsActive ? 'Deactivate' : 'Already inactive'}
              </Button>
            </ActionBar>

            <Text style={styles.detailHint}>
              There is no reactivate endpoint for teachers yet, so deactivation cannot be undone
              from the app.
            </Text>
          </View>

          <ListPanel
            title="Subjects taught"
            subtitle={`Subjects currently assigned to ${selected.Username}.`}
            action={<CountPill count={taughtSubjects.length} label="subjects" />}
            items={taughtSubjects}
            keyExtractor={(item) => String(item.Id)}
            loading={subjects.loading && !subjects.data}
            emptyMessage={`${selected.Username} has no subjects assigned yet. Use Edit to allocate them.`}
            emptyIcon="library"
            skeletonRows={2}
            style={styles.subjectsPanel}
            renderItem={(subject) => (
              <ListRow
                leading={<Avatar text={initials(subject.Name)} tone="violet" />}
                title={subject.Name}
                meta={subject.Code}
              />
            )}
          />
        </>
      ) : null}

      <EditTeacherModal
        teacher={editing}
        departments={departments.data ?? []}
        departmentOptions={departmentOptions}
        subjects={subjects.data ?? []}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={(payload) => {
          const target = editing;
          if (!target) return;
          void run(
            () => updateTeacher(target.Id, payload),
            `${payload.EmployeeCode} updated.`,
            () => setEditing(null),
          );
        }}
        onSaveSubjects={(subjectIds) => {
          const target = editing;
          if (!target) return;
          void run(
            () => assignTeacherSubjects(target.Id, subjectIds),
            `Subjects updated for ${target.Username}.`,
          );
        }}
      />

      <CreateTeacherModal
        visible={creating}
        departmentOptions={departmentOptions}
        busy={busy}
        onClose={() => setCreating(false)}
        onSave={(payload) =>
          run(
            () => createTeacher(payload),
            `${payload.Username} added to the staff directory.`,
            () => setCreating(false),
          )
        }
      />

      <ConfirmModal
        visible={pendingDeactivate !== null}
        busy={busy}
        confirmLabel="Deactivate"
        title="Deactivate teacher?"
        message={
          pendingDeactivate
            ? `${pendingDeactivate.Username} will no longer be able to sign in. Their records are kept, but there is no reactivate endpoint yet.`
            : ''
        }
        onConfirm={() => {
          const target = pendingDeactivate;
          if (!target) return;
          void run(
            () => deactivateTeacher(target.Id),
            `${target.Username} deactivated.`,
            () => setPendingDeactivate(null),
          );
        }}
        onClose={() => setPendingDeactivate(null)}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------- modals */

function EditTeacherModal({
  teacher,
  departments,
  departmentOptions,
  subjects,
  busy,
  onClose,
  onSave,
  onSaveSubjects,
}: {
  teacher: Teacher | null;
  departments: Department[];
  departmentOptions: { value: number; label: string }[];
  subjects: Subject[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: { DepartmentId: number; EmployeeCode: string }) => void;
  onSaveSubjects: (subjectIds: number[]) => void;
}) {
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [seededFor, setSeededFor] = useState<number | null>(null);

  // Seed the form when a different teacher is opened. Deriving from state
  // instead of an effect keeps the first render correct.
  if (teacher && seededFor !== teacher.Id) {
    setSeededFor(teacher.Id);
    setCode(teacher.EmployeeCode);
    setDepartmentId(teacher.DepartmentId);
    // Current allocation comes from the subject list: a subject belongs to the
    // teacher whose id matches its TeacherId.
    setPicked(subjects.filter((s) => s.TeacherId === teacher.Id).map((s) => s.Id));
  }

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal
      visible={teacher !== null}
      onClose={onClose}
      title="Edit Teacher"
      subtitle={teacher?.Username}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          {subjects.length > 0 ? (
            <Button
              variant="ghost"
              icon="save"
              onPress={() => onSaveSubjects(picked)}
              disabled={busy}
            >
              Save Subjects
            </Button>
          ) : null}
          <Button
            loading={busy}
            disabled={busy || !code.trim()}
            onPress={() => onSave({ DepartmentId: departmentId ?? 0, EmployeeCode: code.trim() })}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Input label="Employee Code" value={code} onChangeText={setCode} />

        <Select
          label="Department"
          value={departmentId}
          options={departmentOptions}
          onChange={setDepartmentId}
          placeholder="No department"
          clearLabel="No department"
          title="Select department"
          searchable
        />
        {departments.length === 0 ? (
          <Text style={styles.hintText}>No departments are set up yet.</Text>
        ) : null}

        <View>
          <Text style={styles.fieldLabel}>Subjects</Text>
          <CheckboxList
            items={subjects}
            selectedIds={picked}
            onToggle={toggle}
            keyExtractor={(item) => item.Id}
            labelExtractor={(item) => item.Name}
            hintExtractor={(item) => item.Code}
            emptyMessage="No subjects have been created yet."
          />
          <Text style={styles.hintText}>
            Saving a subject allocation replaces the teacher&apos;s current subjects.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function CreateTeacherModal({
  visible,
  departmentOptions,
  busy,
  onClose,
  onSave,
}: {
  visible: boolean;
  departmentOptions: { value: number; label: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    Username: string;
    Email: string;
    Password: string;
    EmployeeCode: string;
    DepartmentId: number | null;
    HireDate: string | null;
  }) => void;
}) {
  const [form, setForm] = useState({
    Username: '',
    Email: '',
    Password: '',
    EmployeeCode: '',
    DepartmentId: null as number | null,
    HireDate: todayInput(),
  });

  const canSubmit =
    form.Username.trim().length > 0 &&
    form.Email.trim().length > 0 &&
    form.Password.length > 0 &&
    form.EmployeeCode.trim().length > 0;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Add Teacher"
      subtitle="Creates the login and staff record together."
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
                Username: form.Username.trim(),
                Email: form.Email.trim(),
                Password: form.Password,
                EmployeeCode: form.EmployeeCode.trim(),
                DepartmentId: form.DepartmentId,
                HireDate: form.HireDate || null,
              })
            }
          >
            Create Teacher
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Input
          label="Full Name"
          value={form.Username}
          onChangeText={(v) => setForm((p) => ({ ...p, Username: v }))}
        />
        <Input
          label="Employee Code"
          value={form.EmployeeCode}
          onChangeText={(v) => setForm((p) => ({ ...p, EmployeeCode: v }))}
        />
        <Input
          label="Email"
          value={form.Email}
          onChangeText={(v) => setForm((p) => ({ ...p, Email: v }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Temporary Password"
          value={form.Password}
          onChangeText={(v) => setForm((p) => ({ ...p, Password: v }))}
          secureTextEntry
        />
        <Select
          label="Department"
          value={form.DepartmentId}
          options={departmentOptions}
          onChange={(value) => setForm((p) => ({ ...p, DepartmentId: value }))}
          placeholder="No department"
          clearLabel="No department"
          title="Select department"
          searchable
        />
        <Input
          label="Hire Date"
          value={form.HireDate}
          onChangeText={(v) => setForm((p) => ({ ...p, HireDate: v }))}
          placeholder="YYYY-MM-DD"
          hint="Defaults to today when left as-is."
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  filter: {
    minWidth: 150,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
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
  detailCard: {
    marginTop: theme.spacing[5],
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing[5],
  },
  detailHint: {
    marginTop: theme.spacing[3],
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
  subjectsPanel: {
    marginTop: theme.spacing[5],
  },
  formStack: {
    gap: theme.spacing[3.5],
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[700],
    marginBottom: theme.spacing[1.5],
  },
  hintText: {
    marginTop: theme.spacing[1.5],
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
});
