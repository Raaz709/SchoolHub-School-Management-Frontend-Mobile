import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  addExamSubject,
  createExam,
  deleteExam,
  deleteExamSubject,
  fetchAcademicYears,
  fetchExam,
  fetchExams,
  fetchMarksRoster,
  fetchMyResults,
  fetchStudentResults,
  saveMarks,
  updateExam,
  type AcademicYear,
  type Exam,
  type ExamDetail,
  type ExamSubject,
  type MarkItem,
  type MarksRoster,
  type RosterStudent,
  type TranscriptRow,
} from '../../api/exams';
import { fetchClasses, fetchSubjects, type ClassItem, type Subject } from '../../api/academic';
import { fetchParentChildren, type Child } from '../../api/portals';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge } from '../../components/common/Badge';
import { Button, IconButton } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { Field, FieldGrid, FieldSection } from '../../components/common/Field';
import { Icon } from '../../components/Icon';
import { formatDate, initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

function dayString(val: string | null | undefined): string {
  return val ? val.slice(0, 10) : '—';
}

export function ExamsScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isStaff = role === 'Admin' || role === 'Teacher';
  const isAdmin = role === 'Admin';
  const isParent = role === 'Parent';

  // Staff states
  const [editingExam, setEditingExam] = useState<Exam | 'new' | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [markingPaperId, setMarkingPaperId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // Parent state
  const [childId, setChildId] = useState<number | null>(null);

  // Queries
  const exams = useAsync(
    (signal) => (isStaff ? fetchExams(signal) : Promise.resolve([])),
    [isStaff],
  );

  const years = useAsync(
    (signal) => (isStaff ? fetchAcademicYears(signal) : Promise.resolve([])),
    [isStaff],
  );

  const classes = useAsync(
    (signal) => (isStaff ? fetchClasses(signal) : Promise.resolve([])),
    [isStaff],
  );

  const subjects = useAsync(
    (signal) => (isStaff ? fetchSubjects(signal) : Promise.resolve([])),
    [isStaff],
  );

  const children = useAsync(
    (signal) => (isParent ? fetchParentChildren(signal) : Promise.resolve([])),
    [isParent],
  );

  // Initial parent child selection
  React.useEffect(() => {
    if (!isParent) return;
    if (childId === null && children.data && children.data.length > 0) {
      setChildId(children.data[0].StudentId);
    }
  }, [isParent, children.data, childId]);

  const mineKey = isParent ? `child:${childId ?? ''}` : 'mine';
  const mine = useAsync(
    (signal) => {
      if (isStaff) return Promise.resolve([] as TranscriptRow[]);
      if (isParent) {
        if (childId === null) return Promise.resolve([] as TranscriptRow[]);
        return fetchStudentResults(childId, signal);
      }
      return fetchMyResults(signal);
    },
    [isStaff, isParent, mineKey],
  );

  const refresh = () => {
    if (isStaff) {
      void exams.refetch();
      void years.refetch();
      void classes.refetch();
      void subjects.refetch();
    } else {
      void mine.refetch();
      if (isParent) void children.refetch();
    }
  };

  const onSignIn = () => {
    void signOut();
  };

  const handleDeleteExam = (exam: Exam) => {
    Alert.alert(
      'Delete Exam',
      `Are you sure you want to delete "${exam.Title}"? This will fail if papers are still attached.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setFeedback(null);
            try {
              const res = await deleteExam(exam.Id);
              setFeedback({ tone: 'success', message: res.Message });
              if (selectedExamId === exam.Id) setSelectedExamId(null);
              void exams.refetch();
            } catch (err) {
              setFeedback({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not delete exam.',
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  /* ------------------------------------------------ Student / Parent UI */
  if (!isStaff) {
    const rows = mine.data ?? [];
    return (
      <Screen onRefresh={refresh} refreshing={mine.loading && !!mine.data}>
        <PageHeader
          title="Examinations"
          subtitle={isParent ? 'Your child’s examination results and grades.' : 'Your examination results and grades.'}
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

        <ListPanel
          title="Results"
          subtitle="Newest first. Pass mark is specific to each exam."
          action={<CountPill count={rows.length} label="exams" />}
          items={rows}
          keyExtractor={(item) => String(item.ExamId)}
          loading={mine.loading && !mine.data}
          error={mine.error}
          status={mine.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyTitle={isParent && childId === null ? 'No child selected' : undefined}
          emptyMessage={
            isParent && childId === null
              ? 'Select a child to view their exam results.'
              : 'No examination results have been published yet.'
          }
          emptyIcon="scrollText"
          renderItem={(item) => (
            <ListRow
              leading={<Avatar text={initials(item.ExamTitle ?? 'EX')} tone={item.Passed ? 'mint' : 'violet'} />}
              title={item.ExamTitle ?? 'Untitled Exam'}
              meta={`${item.PassedCount}/${item.SubjectCount} subjects passed  ·  Score ${item.TotalObtained}/${item.TotalMax} (${item.OverallPercentage}%)`}
              trailing={
                <View style={styles.resultBadgeContainer}>
                  <Badge
                    label={item.Passed ? 'Pass' : 'Fail'}
                    tone={item.Passed ? 'mint' : 'rose'}
                  />
                  <Text style={styles.passThresholdText}>at {item.PassingPercentage}%</Text>
                </View>
              }
            />
          )}
        />
      </Screen>
    );
  }

  /* ------------------------------------------------ Staff (Admin / Teacher) UI */
  const examRows = exams.data ?? [];

  return (
    <Screen onRefresh={refresh} refreshing={exams.loading && !!exams.data}>
      <PageHeader
        title="Examinations"
        subtitle="Set up exams, attach class papers, and record student marks in one save."
        action={
          <Button icon="plus" onPress={() => setEditingExam('new')}>
            New Exam
          </Button>
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ListPanel
        title="Exams"
        subtitle="Tap an exam to manage papers and marks."
        action={<CountPill count={examRows.length} label="exams" />}
        items={examRows}
        keyExtractor={(item) => String(item.Id)}
        loading={exams.loading && !exams.data}
        error={exams.error}
        status={exams.status}
        onRetry={refresh}
        onSignIn={onSignIn}
        emptyMessage="No exams created yet. Tap 'New Exam' above to create one."
        emptyIcon="scrollText"
        renderItem={(exam) => (
          <ListRow
            leading={
              <View style={styles.examBadge}>
                <Icon name="scrollText" size={18} color={theme.colors.mint[600]} />
              </View>
            }
            title={exam.Title}
            meta={[
              exam.AcademicYearName ?? 'No year',
              `${dayString(exam.StartDate)} → ${dayString(exam.EndDate)}`,
              `Pass ${exam.PassingMarks ?? 40}%`,
              `${exam.SubjectCount} paper${exam.SubjectCount === 1 ? '' : 's'}`,
              exam.ClassCount > 1 ? `${exam.ClassCount} classes` : null,
              `${exam.MarkCount} marks`,
            ]
              .filter(Boolean)
              .join('  ·  ')}
            trailing={
              <View style={styles.actions}>
                <IconButton
                  icon="edit"
                  label="Edit exam"
                  size={32}
                  iconSize={15}
                  onPress={() => setEditingExam(exam)}
                />
                {isAdmin ? (
                  <IconButton
                    icon="trash"
                    label="Delete exam"
                    size={32}
                    iconSize={15}
                    variant="danger"
                    onPress={() => handleDeleteExam(exam)}
                  />
                ) : null}
              </View>
            }
            onPress={() => setSelectedExamId(exam.Id)}
          />
        )}
      />

      {/* Exam Edit / Create Modal */}
      {editingExam !== null ? (
        <ExamFormModal
          exam={editingExam === 'new' ? null : editingExam}
          years={years.data ?? []}
          onClose={() => setEditingExam(null)}
          onSaved={(msg) => {
            setEditingExam(null);
            setFeedback({ tone: 'success', message: msg });
            void exams.refetch();
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}

      {/* Exam Detail & Papers Modal */}
      {selectedExamId !== null ? (
        <ExamDetailModal
          examId={selectedExamId}
          classes={classes.data ?? []}
          subjects={subjects.data ?? []}
          onClose={() => setSelectedExamId(null)}
          onMarkPaper={(paperId) => setMarkingPaperId(paperId)}
          onExamChanged={() => {
            void exams.refetch();
          }}
        />
      ) : null}

      {/* Marks Grading Roster Sheet */}
      {markingPaperId !== null ? (
        <MarkSheetModal
          examSubjectId={markingPaperId}
          onClose={() => setMarkingPaperId(null)}
          onSaved={(msg) => {
            setMarkingPaperId(null);
            setFeedback({ tone: 'success', message: msg });
            void exams.refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------ Exam Form Modal */
function ExamFormModal({
  exam,
  years,
  onClose,
  onSaved,
  onError,
}: {
  exam: Exam | null;
  years: AcademicYear[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isEdit = exam !== null;
  const [title, setTitle] = useState(exam?.Title ?? '');
  const [yearId, setYearId] = useState<number | null>(
    exam?.AcademicYearId ?? years.find((y) => y.IsCurrent)?.Id ?? years[0]?.Id ?? null,
  );
  const [startDate, setStartDate] = useState(exam?.StartDate ? exam.StartDate.slice(0, 10) : todayInput());
  const [endDate, setEndDate] = useState(exam?.EndDate ? exam.EndDate.slice(0, 10) : todayInput());
  const [passingMarks, setPassingMarks] = useState(
    exam?.PassingMarks !== null && exam?.PassingMarks !== undefined ? String(exam.PassingMarks) : '40',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError('Exam title is required.');
      return;
    }
    if (yearId === null) {
      setError('Please select an academic year.');
      return;
    }

    setBusy(true);
    setError(null);
    const payload = {
      Title: title.trim(),
      AcademicYearId: yearId,
      StartDate: startDate || null,
      EndDate: endDate || null,
      PassingMarks: passingMarks.trim() ? Number(passingMarks) : null,
    };

    try {
      const res = isEdit ? await updateExam(exam.Id, payload) : await createExam(payload);
      onSaved(res.Message);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save exam.';
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onClose={onClose}
      title={isEdit ? 'Edit Exam' : 'Create Exam'}
      subtitle={isEdit ? exam.Title : 'Configure title, dates, and pass mark'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            {isEdit ? 'Save Changes' : 'Create Exam'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Mid-Term Examination 2026"
        autoFocus
      />

      <Select
        label="Academic Year"
        value={yearId}
        options={years.map((y) => ({
          value: y.Id,
          label: `${y.Name}${y.IsCurrent ? ' (Current)' : ''}`,
        }))}
        onChange={setYearId}
        placeholder="Select academic year"
        title="Select academic year"
        style={styles.modalInputSpacing}
      />

      <View style={styles.formRow}>
        <Input
          label="Start Date"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          containerStyle={styles.halfInput}
        />
        <Input
          label="End Date"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          containerStyle={styles.halfInput}
        />
      </View>

      <Input
        label="Passing Mark (%)"
        value={passingMarks}
        onChangeText={setPassingMarks}
        keyboardType="numeric"
        placeholder="e.g. 40"
        hint="Pass threshold for papers in this exam."
        containerStyle={styles.modalInputSpacing}
      />
    </Modal>
  );
}

/* ------------------------------------------------ Exam Detail & Papers Modal */
function ExamDetailModal({
  examId,
  classes,
  subjects,
  onClose,
  onMarkPaper,
  onExamChanged,
}: {
  examId: number;
  classes: ClassItem[];
  subjects: Subject[];
  onClose: () => void;
  onMarkPaper: (paperId: number) => void;
  onExamChanged: () => void;
}) {
  const detail = useAsync((signal) => fetchExam(examId, signal), [examId]);
  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [maxMarks, setMaxMarks] = useState('100');
  const [examDate, setExamDate] = useState(todayInput());
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Feedback>(null);

  const addPaper = async () => {
    if (classId === null || subjectId === null) {
      setBanner({ tone: 'error', message: 'Please select class and subject.' });
      return;
    }
    const marksNum = Number(maxMarks);
    if (!marksNum || marksNum <= 0) {
      setBanner({ tone: 'error', message: 'Max marks must be greater than 0.' });
      return;
    }

    setBusy(true);
    setBanner(null);
    try {
      const res = await addExamSubject(examId, {
        ClassId: classId,
        SubjectId: subjectId,
        MaxMarks: marksNum,
        ExamDate: examDate || null,
      });
      setBanner({ tone: 'success', message: res.Message });
      setClassId(null);
      setSubjectId(null);
      void detail.refetch();
      onExamChanged();
    } catch (err) {
      setBanner({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not add paper.',
      });
    } finally {
      setBusy(false);
    }
  };

  const removePaper = (paper: ExamSubject) => {
    Alert.alert(
      'Remove Paper',
      `Remove ${paper.SubjectName ?? 'paper'} from this exam? (Refused if marks are recorded)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setBanner(null);
            try {
              const res = await deleteExamSubject(examId, paper.Id);
              setBanner({ tone: 'success', message: res.Message });
              void detail.refetch();
              onExamChanged();
            } catch (err) {
              setBanner({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not remove paper.',
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const exam = detail.data?.Exam;
  const papers = detail.data?.Subjects ?? [];

  return (
    <Modal
      visible
      onClose={onClose}
      title={exam ? exam.Title : 'Exam Details'}
      subtitle={exam ? `${exam.AcademicYearName ?? 'Year'} · Pass mark ${exam.PassingMarks ?? 40}%` : 'Loading...'}
      footer={
        <Button variant="ghost" onPress={onClose}>
          Close
        </Button>
      }
    >
      {banner ? <Banner tone={banner.tone} message={banner.message} style={styles.modalBanner} /> : null}

      <FieldSection title="Add Paper to Exam">
        <Select
          label="Class"
          value={classId}
          options={classes.map((c) => ({ value: c.Id, label: c.Name }))}
          onChange={setClassId}
          placeholder="Select class"
          title="Select class"
          searchable
          style={styles.modalInputSpacing}
        />
        <Select
          label="Subject"
          value={subjectId}
          options={subjects.map((s) => ({ value: s.Id, label: `${s.Name} (${s.Code})` }))}
          onChange={setSubjectId}
          placeholder="Select subject"
          title="Select subject"
          searchable
          style={styles.modalInputSpacing}
        />
        <View style={styles.formRow}>
          <Input
            label="Max Marks"
            value={maxMarks}
            onChangeText={setMaxMarks}
            keyboardType="numeric"
            placeholder="100"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Paper Date"
            value={examDate}
            onChangeText={setExamDate}
            placeholder="YYYY-MM-DD"
            containerStyle={styles.halfInput}
          />
        </View>
        <Button icon="plus" onPress={() => void addPaper()} loading={busy} disabled={busy} style={styles.addPaperBtn}>
          Add Paper
        </Button>
      </FieldSection>

      <FieldSection title={`Papers (${papers.length})`}>
        {detail.loading && !detail.data ? (
          <Text style={styles.loadingText}>Loading papers...</Text>
        ) : papers.length === 0 ? (
          <Text style={styles.emptyText}>No papers added to this exam yet.</Text>
        ) : (
          papers.map((p) => (
            <View key={p.Id} style={styles.paperRow}>
              <View style={styles.paperInfo}>
                <Text style={styles.paperTitle}>{p.SubjectName ?? 'Paper'}</Text>
                <Text style={styles.paperMeta}>
                  {p.ClassName}  ·  Max: {p.MaxMarks}  ·  {p.MarkCount} marked
                  {p.ExamDate ? `  ·  ${dayString(p.ExamDate)}` : ''}
                </Text>
              </View>
              <View style={styles.paperActions}>
                <Button
                  variant={p.MarkCount > 0 ? 'ghost' : 'primary'}
                  onPress={() => {
                    onClose();
                    onMarkPaper(p.Id);
                  }}
                >
                  {p.MarkCount > 0 ? 'Re-mark' : 'Mark'}
                </Button>
                <IconButton
                  icon="trash"
                  label="Remove paper"
                  size={30}
                  iconSize={14}
                  variant="danger"
                  onPress={() => removePaper(p)}
                />
              </View>
            </View>
          ))
        )}
      </FieldSection>
    </Modal>
  );
}

/* ------------------------------------------------ Mark Sheet Modal */
function MarkSheetModal({
  examSubjectId,
  onClose,
  onSaved,
}: {
  examSubjectId: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const rosterQuery = useAsync((signal) => fetchMarksRoster(examSubjectId, signal), [examSubjectId]);
  const meta = rosterQuery.data;
  const rows = useMemo(() => meta?.Students ?? [], [meta]);

  const [marks, setMarks] = useState<Record<number, { marksObtained: string; remarks: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync draft from roster
  React.useEffect(() => {
    if (!meta) return;
    const initial: Record<number, { marksObtained: string; remarks: string }> = {};
    for (const s of meta.Students) {
      initial[s.StudentId] = {
        marksObtained: s.MarksObtained !== null ? String(s.MarksObtained) : '',
        remarks: s.Remarks ?? '',
      };
    }
    setMarks(initial);
  }, [meta]);

  const handleScoreChange = (studentId: number, val: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        marksObtained: val,
        remarks: prev[studentId]?.remarks ?? '',
      },
    }));
  };

  const handleRemarksChange = (studentId: number, val: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        marksObtained: prev[studentId]?.marksObtained ?? '',
        remarks: val,
      },
    }));
  };

  const enteredCount = useMemo(() => {
    return Object.values(marks).filter((m) => m.marksObtained.trim() !== '').length;
  }, [marks]);

  const save = async () => {
    const items: MarkItem[] = [];
    const max = meta?.MaxMarks ?? 100;

    for (const [sId, item] of Object.entries(marks)) {
      if (!item.marksObtained.trim()) continue;
      const num = Number(item.marksObtained);
      if (isNaN(num) || num < 0 || num > max) {
        setError(`Marks must be between 0 and ${max}.`);
        return;
      }
      items.push({
        StudentId: Number(sId),
        MarksObtained: num,
        Remarks: item.remarks,
      });
    }

    if (items.length === 0) {
      setError('Please enter marks for at least one student.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await saveMarks(examSubjectId, items);
      onSaved(`${res.Message} (${res.Saved} saved)`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save marks.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onClose={onClose}
      title={meta ? `Marking: ${meta.SubjectName ?? 'Paper'}` : 'Mark Sheet'}
      subtitle={meta ? `${meta.ClassName}  ·  Max: ${meta.MaxMarks}  ·  Pass: ${meta.PassingPercentage}%` : ''}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy || enteredCount === 0}>
            {`Save Marks (${enteredCount})`}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      {rosterQuery.loading && !meta ? (
        <Text style={styles.loadingText}>Loading roster...</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.emptyText}>No students enrolled in this class.</Text>
      ) : (
        rows.map((student) => {
          const entry = marks[student.StudentId];
          return (
            <View key={student.StudentId} style={styles.studentMarkCard}>
              <View style={styles.studentHeader}>
                <Avatar text={initials(student.Username)} />
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.Username}</Text>
                  <Text style={styles.studentRoll}>Roll #{student.RollNumber}</Text>
                </View>
                {student.Grade ? (
                  <Badge label={`Grade ${student.Grade}`} tone="neutral" />
                ) : null}
              </View>

              <View style={styles.formRow}>
                <Input
                  label={`Marks (0–${meta?.MaxMarks ?? 100})`}
                  value={entry?.marksObtained ?? ''}
                  onChangeText={(val) => handleScoreChange(student.StudentId, val)}
                  keyboardType="numeric"
                  placeholder="Score"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Remarks (optional)"
                  value={entry?.remarks ?? ''}
                  onChangeText={(val) => handleRemarksChange(student.StudentId, val)}
                  placeholder="e.g. Excellent"
                  containerStyle={styles.halfInput}
                />
              </View>
            </View>
          );
        })
      )}
    </Modal>
  );
}

/* ------------------------------------------------ Styles */
const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  childPicker: {
    marginBottom: theme.spacing[4],
  },
  modalBanner: {
    marginBottom: theme.spacing[3],
  },
  examBadge: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  resultBadgeContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  passThresholdText: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
  },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  halfInput: {
    flex: 1,
  },
  modalInputSpacing: {
    marginTop: theme.spacing[2],
  },
  addPaperBtn: {
    marginTop: theme.spacing[3],
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    paddingVertical: theme.spacing[4],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    paddingVertical: theme.spacing[4],
    textAlign: 'center',
  },
  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  paperInfo: {
    flex: 1,
  },
  paperTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  paperMeta: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  paperActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  studentMarkCard: {
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  studentRoll: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
  },
});
