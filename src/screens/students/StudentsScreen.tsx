import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ApiError,
} from '../../api/client';
import {
  assignStudentClass,
  createStudent,
  deactivateStudent,
  reactivateStudent,
  searchStudents,
  updateStudent,
  type Student,
} from '../../api/students';
import { fetchClasses, fetchSections } from '../../api/academic';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ConfirmModal, Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchBar } from '../../components/common/SearchBar';
import { ActionBar, Field, FieldGrid, FieldSection } from '../../components/common/Field';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { formatDate, initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

/** Admin actions that need a confirmation before they touch a record. */
type PendingAction =
  | { kind: 'deactivate'; student: Student }
  | { kind: 'reactivate'; student: Student }
  | null;

export function StudentsScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = normalizeRole(user?.role) === 'Admin';

  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [assignTarget, setAssignTarget] = useState<Student | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Reference data for the filters and the create/assign forms.
  const classes = useAsync((signal) => fetchClasses(signal));
  const sections = useAsync((signal) => fetchSections(signal));

  const students = useAsync(
    (signal) =>
      searchStudents(
        { query: debouncedQuery.trim() || undefined, classId, sectionId },
        signal,
      ),
    [debouncedQuery, classId, sectionId],
  );

  const classOptions = useMemo(
    () => (classes.data ?? []).map((c) => ({ value: c.Id, label: c.Name })),
    [classes.data],
  );

  /**
   * Sections are scoped to their class. Matching on `ClassId` rather than the
   * label avoids "Grade 1" swallowing "Grade 10".
   */
  const sectionOptionsFor = useCallback(
    (forClassId: number | null) =>
      (sections.data ?? [])
        .filter((s) => forClassId === null || s.ClassId === forClassId)
        .map((s) => ({ value: s.Id, label: `${s.ClassName} · ${s.Name}` })),
    [sections.data],
  );

  const sectionOptions = useMemo(() => sectionOptionsFor(classId), [sectionOptionsFor, classId]);

  const resetFilters = () => {
    setQuery('');
    setClassId(null);
    setSectionId(null);
  };

  const refresh = () => {
    void students.refetch();
    void classes.refetch();
    void sections.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  /** Wraps a mutation with busy state, feedback and a list refresh. */
  async function runAction(
    action: () => Promise<unknown>,
    successMessage: string,
    close?: () => void,
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: 'success', message: successMessage });
      close?.();
      void students.refetch();
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

  /* ------------------------------------------------------------ detail view */

  if (selected) {
    return (
      <StudentDetail
        student={selected}
        isAdmin={isAdmin}
        onBack={() => {
          setSelected(null);
          setFeedback(null);
        }}
        onEdit={() => setEditTarget(selected)}
        onAssign={() => setAssignTarget(selected)}
        onToggleStatus={() =>
          setPending(
            selected.IsActive
              ? { kind: 'deactivate', student: selected }
              : { kind: 'reactivate', student: selected },
          )
        }
        feedback={feedback}
      >
        {/* Modals are mounted here too so they work from the detail view. */}
        <StudentFormModals
          isAdmin={isAdmin}
          createOpen={false}
          closeCreate={() => undefined}
          editTarget={editTarget}
          closeEdit={() => setEditTarget(null)}
          assignTarget={assignTarget}
          closeAssign={() => setAssignTarget(null)}
          classOptions={classOptions}
          sectionOptionsFor={sectionOptionsFor}
          runAction={runAction}
          busy={busy}
        />

        <ConfirmStatusModal
          pending={pending}
          busy={busy}
          onClose={() => setPending(null)}
          onConfirm={async (action) => {
            const ok = await runAction(
              () =>
                action.kind === 'deactivate'
                  ? deactivateStudent(action.student.Id)
                  : reactivateStudent(action.student.Id),
              action.kind === 'deactivate'
                ? 'Student deactivated. They can no longer sign in.'
                : 'Student reactivated. Sign-in restored.',
              () => setPending(null),
            );
            // Keep the open detail view in step with the new status.
            if (ok) {
              setSelected((prev) =>
                prev
                  ? { ...prev, IsActive: action.kind === 'reactivate' }
                  : prev,
              );
            }
          }}
        />
      </StudentDetail>
    );
  }

  /* -------------------------------------------------------------- list view */

  return (
    <Screen onRefresh={refresh} refreshing={students.loading && !!students.data}>
      <PageHeader
        title="Student Info"
        subtitle="Roster of every enrolled student."
        action={
          isAdmin ? (
            <Button icon="plus" onPress={() => setCreateOpen(true)}>
              New Student
            </Button>
          ) : undefined
        }
      />

      {feedback ? <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} /> : null}

      <ListPanel
        title="Students"
        subtitle="Search by name, email or roll number and filter by class or section."
        action={<CountPill count={students.data?.length ?? 0} label="students" />}
        items={students.data ?? []}
        keyExtractor={(item) => String(item.Id)}
        loading={students.loading && !students.data}
        error={students.error}
        status={students.status}
        onRetry={refresh}
        onSignIn={onSignIn}
        emptyTitle={query || classId || sectionId ? 'No matching students' : undefined}
        emptyMessage={
          query || classId || sectionId
            ? 'Try a different search or clear the filters.'
            : 'No students have been added yet.'
        }
        emptyIcon="student"
        toolbar={
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Name, email or roll number"
            />

            <Select
              value={classId}
              options={classOptions}
              onChange={(value) => {
                setClassId(value);
                setSectionId(null);
              }}
              placeholder="All classes"
              clearLabel="All classes"
              title="Filter by class"
              searchable
              style={styles.filter}
            />

            <Select
              value={sectionId}
              options={sectionOptions}
              onChange={setSectionId}
              placeholder="All sections"
              clearLabel="All sections"
              title="Filter by section"
              searchable
              disabled={classId === null}
              style={styles.filter}
            />

            {query || classId || sectionId ? (
              <Button variant="ghost" icon="close" onPress={resetFilters}>
                Clear
              </Button>
            ) : null}
          </>
        }
        renderItem={(item) => (
          <ListRow
            leading={<Avatar text={initials(item.Username)} />}
            title={item.Username}
            meta={`Roll ${item.RollNumber}  ·  ${
              item.ClassName ? `${item.ClassName} ${item.SectionName ?? ''}`.trim() : 'Not assigned'
            }`}
            selected={false}
            trailing={
              <View style={styles.rowTrailing}>
                <Badge
                  label={item.IsActive ? 'Active' : 'Inactive'}
                  tone={item.IsActive ? 'mint' : 'rose'}
                />
                <Icon name="chevronRight" size={16} color={theme.colors.ink[400]} />
              </View>
            }
            onPress={() => {
              setSelected(item);
              setFeedback(null);
            }}
          />
        )}
      />

      <StudentFormModals
        isAdmin={isAdmin}
        createOpen={createOpen}
        closeCreate={() => setCreateOpen(false)}
        editTarget={editTarget}
        closeEdit={() => setEditTarget(null)}
        assignTarget={assignTarget}
        closeAssign={() => setAssignTarget(null)}
        classOptions={classOptions}
        sectionOptionsFor={sectionOptionsFor}
        runAction={runAction}
        busy={busy}
      />

      <ConfirmStatusModal
        pending={pending}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={(action) =>
          runAction(
            () =>
              action.kind === 'deactivate'
                ? deactivateStudent(action.student.Id)
                : reactivateStudent(action.student.Id),
            action.kind === 'deactivate'
              ? 'Student deactivated. They can no longer sign in.'
              : 'Student reactivated. Sign-in restored.',
            () => setPending(null),
          )
        }
      />
    </Screen>
  );
}

/* ------------------------------------------------------------ detail panel */

function StudentDetail({
  student,
  isAdmin,
  onBack,
  onEdit,
  onAssign,
  onToggleStatus,
  feedback,
  children,
}: {
  student: Student;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onToggleStatus: () => void;
  feedback: Feedback;
  children: React.ReactNode;
}) {
  return (
    <Screen>
      <PageHeader
        title={student.Username}
        subtitle={`Roll number ${student.RollNumber}`}
        action={
          <Button variant="ghost" icon="arrowLeft" onPress={onBack}>
            Back
          </Button>
        }
      />

      {feedback ? <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} /> : null}

      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Avatar text={initials(student.Username)} />
          <View style={styles.detailIdentity}>
            <Text style={styles.detailName}>{student.Username}</Text>
            <Text style={styles.detailEmail}>{student.Email}</Text>
          </View>
          <Badge label={student.IsActive ? 'Active' : 'Inactive'} tone={student.IsActive ? 'mint' : 'rose'} />
        </View>

        <FieldSection title="Enrolment">
          <FieldGrid>
            <Field label="Roll Number" value={student.RollNumber} />
            <Field label="Class" value={student.ClassName ?? 'Not assigned'} />
            <Field label="Section" value={student.SectionName ?? 'Not assigned'} />
            <Field label="Admission Date" value={formatDate(student.AdmissionDate)} />
            <Field label="User ID" value={student.UserId} />
            <Field label="Account" value={student.IsActive ? 'Active' : 'Inactive'} />
          </FieldGrid>
        </FieldSection>

        {isAdmin ? (
          <ActionBar>
            <Button variant="ghost" icon="edit" onPress={onEdit}>
              Edit Roll No.
            </Button>
            <Button variant="ghost" icon="layers" onPress={onAssign}>
              Assign Class
            </Button>
            <Button
              variant={student.IsActive ? 'danger' : 'mint'}
              icon={student.IsActive ? 'xCircle' : 'checkCircle'}
              onPress={onToggleStatus}
            >
              {student.IsActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </ActionBar>
        ) : (
          <Text style={styles.readOnlyNote}>
            Only an administrator can change enrolment or account status.
          </Text>
        )}
      </View>

      {children}
    </Screen>
  );
}

/* --------------------------------------------------------------- modals */

interface RunAction {
  (action: () => Promise<unknown>, successMessage: string, close?: () => void): Promise<boolean>;
}

function StudentFormModals({
  isAdmin,
  createOpen,
  closeCreate,
  editTarget,
  closeEdit,
  assignTarget,
  closeAssign,
  classOptions,
  sectionOptionsFor,
  runAction,
  busy,
}: {
  isAdmin: boolean;
  createOpen: boolean;
  closeCreate: () => void;
  editTarget: Student | null;
  closeEdit: () => void;
  assignTarget: Student | null;
  closeAssign: () => void;
  classOptions: { value: number; label: string }[];
  sectionOptionsFor: (classId: number | null) => { value: number; label: string }[];
  runAction: RunAction;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    Username: '',
    Email: '',
    Password: '',
    RollNumber: '',
    AdmissionDate: todayInput(),
    ClassId: null as number | null,
    SectionId: null as number | null,
  });
  const [rollNumber, setRollNumber] = useState('');
  const [assign, setAssign] = useState<{ ClassId: number | null; SectionId: number | null }>({
    ClassId: null,
    SectionId: null,
  });

  const resetCreate = () => {
    setForm({
      Username: '',
      Email: '',
      Password: '',
      RollNumber: '',
      AdmissionDate: todayInput(),
      ClassId: null,
      SectionId: null,
    });
  };

  if (!isAdmin) return null;

  return (
    <>
      <Modal
        visible={createOpen}
        onClose={closeCreate}
        title="New Student"
        subtitle="Creates the login, the Student role and the student record together."
        footer={
          <>
            <Button variant="ghost" onPress={closeCreate} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={
                busy ||
                !form.Username.trim() ||
                !form.Email.trim() ||
                !form.Password ||
                !form.RollNumber.trim()
              }
              onPress={() =>
                runAction(
                  () =>
                    createStudent({
                      Username: form.Username.trim(),
                      Email: form.Email.trim(),
                      Password: form.Password,
                      RollNumber: form.RollNumber.trim(),
                      AdmissionDate: form.AdmissionDate || null,
                      ClassId: form.ClassId,
                      SectionId: form.SectionId,
                    }),
                  'Student created successfully.',
                  () => {
                    resetCreate();
                    closeCreate();
                  },
                )
              }
            >
              Create Student
            </Button>
          </>
        }
      >
        <View style={styles.formStack}>
          <Input
            label="Username"
            value={form.Username}
            onChangeText={(v) => setForm((p) => ({ ...p, Username: v }))}
            autoCapitalize="none"
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
            hint="The student can change this after their first sign-in."
          />
          <Input
            label="Roll Number"
            value={form.RollNumber}
            onChangeText={(v) => setForm((p) => ({ ...p, RollNumber: v }))}
          />
          <Input
            label="Admission Date"
            value={form.AdmissionDate}
            onChangeText={(v) => setForm((p) => ({ ...p, AdmissionDate: v }))}
            placeholder="YYYY-MM-DD"
            hint="Defaults to today when left as-is."
          />
          <Select
            label="Class (optional)"
            value={form.ClassId}
            options={classOptions}
            onChange={(value) => setForm((p) => ({ ...p, ClassId: value, SectionId: null }))}
            placeholder="Assign later"
            clearLabel="Assign later"
            title="Select class"
            searchable
          />
          <Select
            label="Section (optional)"
            value={form.SectionId}
            options={sectionOptionsFor(form.ClassId)}
            onChange={(value) => setForm((p) => ({ ...p, SectionId: value }))}
            placeholder={form.ClassId ? 'Select section' : 'Pick a class first'}
            clearLabel="Assign later"
            title="Select section"
            searchable
            disabled={form.ClassId === null}
          />
        </View>
      </Modal>

      <Modal
        visible={editTarget !== null}
        onClose={() => {
          setRollNumber('');
          closeEdit();
        }}
        title="Edit Roll Number"
        subtitle={editTarget ? `${editTarget.Username} — currently ${editTarget.RollNumber}` : undefined}
        footer={
          <>
            <Button
              variant="ghost"
              onPress={() => {
                setRollNumber('');
                closeEdit();
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={busy || !rollNumber.trim()}
              onPress={() => {
                const target = editTarget;
                if (!target) return;
                return runAction(
                  () => updateStudent(target.Id, { RollNumber: rollNumber.trim() }),
                  'Roll number updated.',
                  () => {
                    setRollNumber('');
                    closeEdit();
                  },
                );
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Roll Number"
          value={rollNumber}
          onChangeText={setRollNumber}
          placeholder={editTarget?.RollNumber}
          hint="Roll number is the only editable field on a student record."
          autoFocus
        />
      </Modal>

      <Modal
        visible={assignTarget !== null}
        onClose={() => {
          setAssign({ ClassId: null, SectionId: null });
          closeAssign();
        }}
        title="Assign Class"
        subtitle={
          assignTarget
            ? `${assignTarget.Username}${
                assignTarget.ClassName
                  ? ` — currently ${assignTarget.ClassName} ${assignTarget.SectionName ?? ''}`.trim()
                  : ''
              }`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              onPress={() => {
                setAssign({ ClassId: null, SectionId: null });
                closeAssign();
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={busy || assign.ClassId === null || assign.SectionId === null}
              onPress={() => {
                const target = assignTarget;
                if (!target || assign.ClassId === null || assign.SectionId === null) return;
                return runAction(
                  () =>
                    assignStudentClass(target.Id, {
                      ClassId: assign.ClassId as number,
                      SectionId: assign.SectionId as number,
                    }),
                  'Student assigned to class.',
                  () => {
                    setAssign({ ClassId: null, SectionId: null });
                    closeAssign();
                  },
                );
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <View style={styles.formStack}>
          <Select
            label="Class"
            value={assign.ClassId}
            options={classOptions}
            onChange={(value) => setAssign({ ClassId: value, SectionId: null })}
            placeholder="Select class"
            title="Select class"
            searchable
          />
          <Select
            label="Section"
            value={assign.SectionId}
            options={sectionOptionsFor(assign.ClassId)}
            onChange={(value) => setAssign((p) => ({ ...p, SectionId: value }))}
            placeholder={assign.ClassId ? 'Select section' : 'Pick a class first'}
            title="Select section"
            searchable
            disabled={assign.ClassId === null}
          />
        </View>
      </Modal>
    </>
  );
}

function ConfirmStatusModal({
  pending,
  busy,
  onClose,
  onConfirm,
}: {
  pending: PendingAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: (action: NonNullable<PendingAction>) => void;
}) {
  const deactivating = pending?.kind === 'deactivate';

  return (
    <ConfirmModal
      visible={pending !== null}
      busy={busy}
      destructive={deactivating}
      confirmLabel={deactivating ? 'Deactivate' : 'Reactivate'}
      title={deactivating ? 'Deactivate student?' : 'Reactivate student?'}
      message={
        pending
          ? deactivating
            ? `${pending.student.Username} will no longer be able to sign in. Their record and history are kept, and this can be undone.`
            : `${pending.student.Username} will be able to sign in again.`
          : ''
      }
      onConfirm={() => {
        if (pending) onConfirm(pending);
      }}
      onClose={onClose}
    />
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
    gap: theme.spacing[2],
  },
  detailCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing[5],
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[4],
    marginBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  detailIdentity: {
    flex: 1,
  },
  detailName: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  detailEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  readOnlyNote: {
    marginTop: theme.spacing[5],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
  },
  formStack: {
    gap: theme.spacing[3.5],
  },
});
