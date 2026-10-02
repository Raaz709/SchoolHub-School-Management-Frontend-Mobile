import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  createClass,
  createSection,
  createSubject,
  deleteClass,
  deleteSection,
  deleteSubject,
  fetchClassSubjects,
  fetchClasses,
  fetchSections,
  fetchSubjects,
  setClassSubjects,
  updateClass,
  updateSection,
  updateSubject,
  type ClassItem,
  type SectionItem,
  type Subject,
} from '../../api/academic';
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
import { CheckboxList } from '../../components/common/Checkbox';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { initials } from '../../lib/format';
import { theme } from '../../theme';

type Tab = 'classes' | 'sections' | 'subjects';

/** What a pending delete will remove, so one dialog can serve all three tabs. */
type PendingDelete =
  | { kind: 'class'; item: ClassItem }
  | { kind: 'section'; item: SectionItem }
  | { kind: 'subject'; item: Subject }
  | null;

type Feedback = { tone: 'success' | 'error'; message: string } | null;

export function AcademicsScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = normalizeRole(user?.role) === 'Admin';

  const [tab, setTab] = useState<Tab>('classes');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [classForm, setClassForm] = useState<{ open: boolean; target: ClassItem | null }>({
    open: false,
    target: null,
  });
  const [sectionForm, setSectionForm] = useState<{ open: boolean; target: SectionItem | null }>({
    open: false,
    target: null,
  });
  const [subjectForm, setSubjectForm] = useState<{ open: boolean; target: Subject | null }>({
    open: false,
    target: null,
  });
  const [allocating, setAllocating] = useState<ClassItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const classes = useAsync((signal) => fetchClasses(signal));
  const sections = useAsync((signal) => fetchSections(signal));
  const subjects = useAsync((signal) => fetchSubjects(signal));

  const classOptions = useMemo(
    () => (classes.data ?? []).map((c) => ({ value: c.Id, label: c.Name })),
    [classes.data],
  );

  const refresh = () => {
    void classes.refetch();
    void sections.refetch();
    void subjects.refetch();
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
      // The API returns a specific 409 message (still enrolled, still in use),
      // so surface it instead of a generic failure.
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Something went wrong.',
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const tabItems: { value: Tab; label: string }[] = [
    { value: 'classes', label: 'Classes' },
    { value: 'sections', label: 'Sections' },
    { value: 'subjects', label: 'Subjects' },
  ];

  const newLabel =
    tab === 'classes' ? 'New Class' : tab === 'sections' ? 'New Section' : 'New Subject';

  return (
    <Screen onRefresh={refresh} refreshing={classes.loading && !!classes.data}>
      <PageHeader
        title="Academics"
        subtitle="Classes, sections and subjects offered by the school."
        action={
          isAdmin ? (
            <Button
              icon="plus"
              onPress={() => {
                if (tab === 'classes') setClassForm({ open: true, target: null });
                else if (tab === 'sections') setSectionForm({ open: true, target: null });
                else setSubjectForm({ open: true, target: null });
              }}
            >
              {newLabel}
            </Button>
          ) : undefined
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ChipGroup options={tabItems} value={tab} onChange={setTab} style={styles.tabs} />

      {tab === 'classes' ? (
        <ListPanel
          title="Classes"
          subtitle="Each class can offer several sections and subjects."
          action={<CountPill count={classes.data?.length ?? 0} label="classes" />}
          items={classes.data ?? []}
          keyExtractor={(item) => String(item.Id)}
          loading={classes.loading && !classes.data}
          error={classes.error}
          status={classes.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyMessage="No classes have been created yet."
          emptyIcon="library"
          renderItem={(item) => (
            <ListRow
              leading={<Avatar text={initials(item.Name)} tone="violet" />}
              title={item.Name}
              meta={`${item.SectionCount} section${item.SectionCount === 1 ? '' : 's'}`}
              trailing={
                isAdmin ? (
                  <View style={styles.actions}>
                    <Button
                      variant="ghost"
                      icon="layers"
                      onPress={() => setAllocating(item)}
                    >
                      Subjects
                    </Button>
                    <IconButton
                      icon="edit"
                      label={`Edit ${item.Name}`}
                      size={30}
                      iconSize={14}
                      onPress={() => setClassForm({ open: true, target: item })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${item.Name}`}
                      size={30}
                      iconSize={14}
                      variant="danger"
                      color={theme.colors.rose[600]}
                      onPress={() => setPendingDelete({ kind: 'class', item })}
                    />
                  </View>
                ) : undefined
              }
            />
          )}
        />
      ) : null}

      {tab === 'sections' ? (
        <ListPanel
          title="Sections"
          subtitle="Sections belong to a class and hold the enrolled students."
          action={<CountPill count={sections.data?.length ?? 0} label="sections" />}
          items={sections.data ?? []}
          keyExtractor={(item) => String(item.Id)}
          loading={sections.loading && !sections.data}
          error={sections.error}
          status={sections.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyMessage="No sections have been created yet."
          emptyIcon="layers"
          renderItem={(item) => (
            <ListRow
              leading={<Avatar text={initials(item.Name)} tone="blue" />}
              title={`${item.ClassName} · ${item.Name}`}
              meta={`Section ID ${item.Id}`}
              trailing={
                isAdmin ? (
                  <View style={styles.actions}>
                    <IconButton
                      icon="edit"
                      label={`Edit ${item.Name}`}
                      size={30}
                      iconSize={14}
                      onPress={() => setSectionForm({ open: true, target: item })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${item.Name}`}
                      size={30}
                      iconSize={14}
                      variant="danger"
                      color={theme.colors.rose[600]}
                      onPress={() => setPendingDelete({ kind: 'section', item })}
                    />
                  </View>
                ) : undefined
              }
            />
          )}
        />
      ) : null}

      {tab === 'subjects' ? (
        <ListPanel
          title="Subjects"
          subtitle="A subject becomes that teacher's subject once allocated."
          action={<CountPill count={subjects.data?.length ?? 0} label="subjects" />}
          items={subjects.data ?? []}
          keyExtractor={(item) => String(item.Id)}
          loading={subjects.loading && !subjects.data}
          error={subjects.error}
          status={subjects.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyMessage="No subjects have been created yet."
          emptyIcon="library"
          renderItem={(item) => (
            <ListRow
              leading={<Avatar text={initials(item.Code)} tone="mint" />}
              title={item.Name}
              meta={`${item.Code}  ·  ${item.TeacherName ?? 'Unassigned'}`}
              trailing={
                isAdmin ? (
                  <View style={styles.actions}>
                    <IconButton
                      icon="edit"
                      label={`Edit ${item.Name}`}
                      size={30}
                      iconSize={14}
                      onPress={() => setSubjectForm({ open: true, target: item })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${item.Name}`}
                      size={30}
                      iconSize={14}
                      variant="danger"
                      color={theme.colors.rose[600]}
                      onPress={() => setPendingDelete({ kind: 'subject', item })}
                    />
                  </View>
                ) : undefined
              }
            />
          )}
        />
      ) : null}

      {/* ------------------------------------------------------------ modals */}

      <ClassFormModal
        open={classForm.open}
        target={classForm.target}
        busy={busy}
        onClose={() => setClassForm({ open: false, target: null })}
        onSave={(name) => {
          const target = classForm.target;
          return run(
            () => (target ? updateClass(target.Id, name) : createClass(name)),
            target ? `Class renamed to ${name}.` : `Class ${name} created.`,
            () => setClassForm({ open: false, target: null }),
          );
        }}
      />

      <SectionFormModal
        open={sectionForm.open}
        target={sectionForm.target}
        classOptions={classOptions}
        busy={busy}
        onClose={() => setSectionForm({ open: false, target: null })}
        onSave={(name, classId) => {
          const target = sectionForm.target;
          return run(
            () => (target ? updateSection(target.Id, name, classId) : createSection(name, classId)),
            target ? `Section updated.` : `Section ${name} created.`,
            () => setSectionForm({ open: false, target: null }),
          );
        }}
      />

      <SubjectFormModal
        open={subjectForm.open}
        target={subjectForm.target}
        busy={busy}
        onClose={() => setSubjectForm({ open: false, target: null })}
        onSave={(name, code) => {
          const target = subjectForm.target;
          return run(
            () => (target ? updateSubject(target.Id, name, code) : createSubject(name, code)),
            target ? `Subject updated.` : `Subject ${name} created.`,
            () => setSubjectForm({ open: false, target: null }),
          );
        }}
      />

      <AllocateSubjectsModal
        classItem={allocating}
        allSubjects={subjects.data ?? []}
        busy={busy}
        onClose={() => setAllocating(null)}
        onSave={(ids) => {
          const target = allocating;
          if (!target) return Promise.resolve(false);
          return run(
            () => setClassSubjects(target.Id, ids),
            `${ids.length} subject(s) assigned to ${target.Name}.`,
            () => setAllocating(null),
          );
        }}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        busy={busy}
        confirmLabel="Delete"
        title="Delete this record?"
        message={deleteMessage(pendingDelete)}
        onConfirm={() => {
          const action = pendingDelete;
          if (!action) return;
          void run(
            () =>
              action.kind === 'class'
                ? deleteClass(action.item.Id)
                : action.kind === 'section'
                  ? deleteSection(action.item.Id)
                  : deleteSubject(action.item.Id),
            deleteSuccessMessage(action),
            () => setPendingDelete(null),
          );
        }}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

function deleteMessage(action: PendingDelete): string {
  if (!action) return '';
  switch (action.kind) {
    case 'class':
      return `Delete "${action.item.Name}"? The API refuses this while students are still enrolled, and it also removes the class's subject links.`;
    case 'section':
      return `Delete section "${action.item.Name}" of ${action.item.ClassName}? The API refuses this while students are still enrolled.`;
    default:
      return `Delete subject "${action.item.Name}" (${action.item.Code})? The API refuses this while it is used by classes, exams, assignments or attendance.`;
  }
}

function deleteSuccessMessage(action: NonNullable<PendingDelete>): string {
  switch (action.kind) {
    case 'class':
      return `Class "${action.item.Name}" deleted.`;
    case 'section':
      return `Section "${action.item.Name}" deleted.`;
    default:
      return `Subject "${action.item.Code}" deleted.`;
  }
}

/* ------------------------------------------------------------------- modals */

function ClassFormModal({
  open,
  target,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  target: ClassItem | null;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(target?.Name ?? '');
  }, [open, target]);

  return (
    <Modal
      visible={open}
      onClose={onClose}
      title={target ? 'Rename Class' : 'New Class'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || !name.trim()}
            onPress={() => onSave(name.trim())}
          >
            {target ? 'Save' : 'Create Class'}
          </Button>
        </>
      }
    >
      <Input
        label="Class Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Grade 10"
        hint="Names must be unique, ignoring case."
        autoFocus
      />
    </Modal>
  );
}

function SectionFormModal({
  open,
  target,
  classOptions,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  target: SectionItem | null;
  classOptions: { value: number; label: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, classId: number) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setName(target?.Name ?? '');
      setClassId(target?.ClassId ?? null);
    }
  }, [open, target]);

  return (
    <Modal
      visible={open}
      onClose={onClose}
      title={target ? 'Edit Section' : 'New Section'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || !name.trim() || classId === null}
            onPress={() => onSave(name.trim(), classId as number)}
          >
            {target ? 'Save' : 'Create Section'}
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Select
          label="Class"
          value={classId}
          options={classOptions}
          onChange={setClassId}
          placeholder="Select class"
          title="Select class"
          searchable
        />
        <Input
          label="Section Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. A"
          hint="Must be unique within the class."
        />
      </View>
    </Modal>
  );
}

function SubjectFormModal({
  open,
  target,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  target: Subject | null;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, code: string) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (open) {
      setName(target?.Name ?? '');
      setCode(target?.Code ?? '');
    }
  }, [open, target]);

  return (
    <Modal
      visible={open}
      onClose={onClose}
      title={target ? 'Edit Subject' : 'New Subject'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || !name.trim() || !code.trim()}
            onPress={() => onSave(name.trim(), code.trim().toUpperCase())}
          >
            {target ? 'Save' : 'Create Subject'}
          </Button>
        </>
      }
    >
      <View style={styles.formStack}>
        <Input
          label="Subject Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mathematics"
          autoFocus
        />
        <Input
          label="Subject Code"
          value={code}
          onChangeText={setCode}
          placeholder="e.g. MATH10"
          autoCapitalize="characters"
          hint="Codes must be unique, ignoring case."
        />
      </View>
    </Modal>
  );
}

/**
 * Class → subject allocation. The current link set is fetched when the modal
 * opens so the checkboxes reflect what the API actually has, and saving replaces
 * the whole list (the endpoint is idempotent).
 */
function AllocateSubjectsModal({
  classItem,
  allSubjects,
  busy,
  onClose,
  onSave,
}: {
  classItem: ClassItem | null;
  allSubjects: Subject[];
  busy: boolean;
  onClose: () => void;
  onSave: (ids: number[]) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classItem) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    fetchClassSubjects(classItem.Id)
      .then((rows) => {
        if (!cancelled) setPicked(rows.map((row) => row.Id));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Could not load current subjects.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classItem]);

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal
      visible={classItem !== null}
      onClose={onClose}
      title="Class Subjects"
      subtitle={classItem ? `Subjects offered by ${classItem.Name}` : undefined}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={busy || loading || loadError !== null}
            onPress={() => onSave(picked)}
          >
            Save Allocation
          </Button>
        </>
      }
    >
      {loadError ? (
        <Banner tone="error" message={loadError} />
      ) : loading ? (
        <Text style={styles.loadingText}>Loading current subjects…</Text>
      ) : (
        <>
          <CheckboxList
            items={allSubjects}
            selectedIds={picked}
            onToggle={toggle}
            keyExtractor={(item) => item.Id}
            labelExtractor={(item) => item.Name}
            hintExtractor={(item) => item.Code}
            emptyMessage="Create some subjects first, then allocate them here."
            maxHeight={300}
          />
          <Text style={styles.hintText}>
            {picked.length} of {allSubjects.length} subject(s) selected. Saving replaces the
            class&apos;s current allocation.
          </Text>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  tabs: {
    marginBottom: theme.spacing[5],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  formStack: {
    gap: theme.spacing[3.5],
  },
  hintText: {
    marginTop: theme.spacing[2],
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    paddingVertical: theme.spacing[4],
    textAlign: 'center',
  },
});
