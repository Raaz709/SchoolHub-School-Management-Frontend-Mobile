import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError } from '../../api/client';
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchSubmissions,
  formatDue,
  gradeSubmission,
  isOverdue,
  submitAssignment,
  updateAssignment,
  type Assignment,
  type Submission,
} from '../../api/assignments';
import { fetchSubjects, type Subject } from '../../api/academic';
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
import { Icon } from '../../components/Icon';
import { initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

export function AssignmentsScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isStudent = role === 'Student';

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | 'new' | null>(null);
  const [selectedSubmissionsAssignment, setSelectedSubmissionsAssignment] = useState<Assignment | null>(null);

  const assignmentsQuery = useAsync((signal) => fetchAssignments(signal), []);
  const subjectsQuery = useAsync(
    (signal) => (!isStudent ? fetchSubjects(signal) : Promise.resolve([])),
    [isStudent],
  );

  const rows = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);

  const refresh = () => {
    void assignmentsQuery.refetch();
    if (!isStudent) void subjectsQuery.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  const handleDeleteAssignment = (item: Assignment) => {
    Alert.alert(
      'Delete Assignment',
      `Are you sure you want to delete "${item.Title}"? This will also remove any student submissions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setFeedback(null);
            try {
              const res = await deleteAssignment(item.Id);
              setFeedback({ tone: 'success', message: res.Message });
              void assignmentsQuery.refetch();
            } catch (err) {
              setFeedback({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not delete assignment.',
              });
            }
          },
        },
      ],
    );
  };

  /* ------------------------------------------------ Student View */
  if (isStudent) {
    return (
      <Screen onRefresh={refresh} refreshing={assignmentsQuery.loading && !!assignmentsQuery.data}>
        <PageHeader
          title="Assignments"
          subtitle="Work set by your teachers. Submit a link to your file before the deadline."
        />

        {feedback ? (
          <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
        ) : null}

        <ListPanel
          title="Class Assignments"
          subtitle="Assignments for your enrolled subjects."
          action={<CountPill count={rows.length} label="items" />}
          items={rows}
          keyExtractor={(item) => String(item.Id)}
          loading={assignmentsQuery.loading && !assignmentsQuery.data}
          error={assignmentsQuery.error}
          status={assignmentsQuery.status}
          onRetry={refresh}
          onSignIn={onSignIn}
          emptyMessage="No assignments have been set for your class."
          emptyIcon="fileText"
          renderItem={(assignment) => (
            <StudentAssignmentCard
              assignment={assignment}
              onSubmitted={(msg) => {
                setFeedback({ tone: 'success', message: msg });
                void assignmentsQuery.refetch();
              }}
              onError={(msg) => setFeedback({ tone: 'error', message: msg })}
            />
          )}
        />
      </Screen>
    );
  }

  /* ------------------------------------------------ Staff View (Admin / Teacher) */
  return (
    <Screen onRefresh={refresh} refreshing={assignmentsQuery.loading && !!assignmentsQuery.data}>
      <PageHeader
        title="Assignments"
        subtitle="Set coursework, track submissions and return scores to your classes."
        action={
          <Button icon="plus" onPress={() => setEditingAssignment('new')}>
            New Assignment
          </Button>
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ListPanel
        title="All Assignments"
        subtitle="Tap to view student submissions and record grades."
        action={<CountPill count={rows.length} label="assignments" />}
        items={rows}
        keyExtractor={(item) => String(item.Id)}
        loading={assignmentsQuery.loading && !assignmentsQuery.data}
        error={assignmentsQuery.error}
        status={assignmentsQuery.status}
        onRetry={refresh}
        onSignIn={onSignIn}
        emptyMessage="No assignments have been set yet. Create one with the button above."
        emptyIcon="fileText"
        renderItem={(item) => {
          const overdue = isOverdue(item.DueDate);
          return (
            <View style={styles.staffCard}>
              <View style={styles.staffCardHeader}>
                <View style={styles.staffCardInfo}>
                  <Text style={styles.assignmentTitle}>{item.Title}</Text>
                  <Text style={styles.metaRow}>
                    {item.SubjectName}
                    {item.TeacherName ? `  ·  ${item.TeacherName}` : ''}
                    {item.MaxScore !== null ? `  ·  Max ${item.MaxScore}` : ''}
                  </Text>
                  <View style={styles.dueRow}>
                    <Icon
                      name="calendar"
                      size={13}
                      color={overdue ? theme.colors.rose[600] : theme.colors.ink[500]}
                    />
                    <Text style={[styles.dueText, overdue && styles.overdueText]}>
                      Due {formatDue(item.DueDate)}
                      {overdue ? ' (Overdue)' : ''}
                    </Text>
                  </View>
                  {item.Description ? (
                    <Text style={styles.descText} numberOfLines={3}>
                      {item.Description}
                    </Text>
                  ) : null}
                  {item.AttachmentUrl ? (
                    <TouchableOpacity
                      style={styles.attachmentLink}
                      onPress={() => {
                        if (item.AttachmentUrl) void Linking.openURL(item.AttachmentUrl);
                      }}
                    >
                      <Icon name="externalLink" size={13} color={theme.colors.mint[600]} />
                      <Text style={styles.attachmentLinkText}>View Resource Attachment</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.staffActions}>
                  <IconButton
                    icon="edit"
                    label="Edit"
                    size={32}
                    iconSize={15}
                    onPress={() => setEditingAssignment(item)}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete"
                    size={32}
                    iconSize={15}
                    variant="danger"
                    onPress={() => handleDeleteAssignment(item)}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submissionsToggle}
                onPress={() => setSelectedSubmissionsAssignment(item)}
              >
                <Icon name="users" size={14} color={theme.colors.mint[600]} />
                <Text style={styles.submissionsToggleText}>
                  {item.SubmissionCount} submission{item.SubmissionCount === 1 ? '' : 's'} · Review & Grade
                </Text>
                <Icon name="chevronRight" size={14} color={theme.colors.mint[600]} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Assignment Create / Edit Modal */}
      {editingAssignment !== null ? (
        <AssignmentFormModal
          assignment={editingAssignment === 'new' ? null : editingAssignment}
          subjects={subjects}
          onClose={() => setEditingAssignment(null)}
          onSaved={(msg) => {
            setEditingAssignment(null);
            setFeedback({ tone: 'success', message: msg });
            void assignmentsQuery.refetch();
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}

      {/* Submissions & Grading Modal */}
      {selectedSubmissionsAssignment !== null ? (
        <SubmissionsModal
          assignment={selectedSubmissionsAssignment}
          onClose={() => setSelectedSubmissionsAssignment(null)}
          onGraded={() => {
            void assignmentsQuery.refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------ Student Card Component */
function StudentAssignmentCard({
  assignment,
  onSubmitted,
  onError,
}: {
  assignment: Assignment;
  onSubmitted: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [filePath, setFilePath] = useState(assignment.MyFilePath ?? '');
  const [busy, setBusy] = useState(false);
  const submitted = assignment.MySubmissionId !== null;
  const graded = assignment.MyScore !== null;
  const overdue = isOverdue(assignment.DueDate);

  const handleSubmit = async () => {
    if (!filePath.trim()) {
      onError('Please provide a URL link to your completed assignment.');
      return;
    }
    setBusy(true);
    try {
      const res = await submitAssignment(assignment.Id, filePath.trim());
      onSubmitted(res.Message);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not submit assignment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.studentCard}>
      <View style={styles.studentCardHeader}>
        <View style={styles.studentCardLeft}>
          <Text style={styles.assignmentTitle}>{assignment.Title}</Text>
          <Text style={styles.metaRow}>
            {assignment.SubjectName}
            {assignment.TeacherName ? `  ·  ${assignment.TeacherName}` : ''}
            {assignment.MaxScore !== null ? `  ·  Max ${assignment.MaxScore}` : ''}
          </Text>
          <View style={styles.dueRow}>
            <Icon
              name="calendar"
              size={13}
              color={overdue ? theme.colors.rose[600] : theme.colors.ink[500]}
            />
            <Text style={[styles.dueText, overdue && styles.overdueText]}>
              Due {formatDue(assignment.DueDate)}
              {overdue ? ' (Overdue)' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.statusCol}>
          <Badge
            label={submitted ? 'Submitted' : 'Not submitted'}
            tone={submitted ? 'mint' : 'neutral'}
          />
          {graded ? (
            <Text style={styles.scoreText}>
              Score: {assignment.MyScore}
              {assignment.MaxScore !== null ? ` / ${assignment.MaxScore}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {assignment.Description ? (
        <Text style={styles.descText}>{assignment.Description}</Text>
      ) : null}

      {assignment.AttachmentUrl ? (
        <TouchableOpacity
          style={styles.attachmentLink}
          onPress={() => {
            if (assignment.AttachmentUrl) void Linking.openURL(assignment.AttachmentUrl);
          }}
        >
          <Icon name="externalLink" size={13} color={theme.colors.mint[600]} />
          <Text style={styles.attachmentLinkText}>Teacher Resource Attachment</Text>
        </TouchableOpacity>
      ) : null}

      {submitted && assignment.MySubmittedAt ? (
        <Text style={styles.submissionMeta}>
          Last submitted: {formatDue(assignment.MySubmittedAt)}
        </Text>
      ) : null}

      {graded && assignment.MyFeedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
          <Text style={styles.feedbackContent}>{assignment.MyFeedback}</Text>
        </View>
      ) : null}

      <View style={styles.submitSection}>
        <Input
          value={filePath}
          onChangeText={setFilePath}
          placeholder="https://... link to your work"
          containerStyle={styles.submitInput}
        />
        <Button
          icon="upload"
          onPress={() => void handleSubmit()}
          loading={busy}
          disabled={busy || !filePath.trim()}
          style={styles.submitBtn}
        >
          {submitted ? 'Update' : 'Submit'}
        </Button>
      </View>
    </View>
  );
}

/* ------------------------------------------------ Assignment Form Modal */
function AssignmentFormModal({
  assignment,
  subjects,
  onClose,
  onSaved,
  onError,
}: {
  assignment: Assignment | null;
  subjects: Subject[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isEdit = assignment !== null;
  const [title, setTitle] = useState(assignment?.Title ?? '');
  const [subjectId, setSubjectId] = useState<number | null>(
    assignment?.SubjectId ?? subjects[0]?.Id ?? null,
  );
  const [due, setDue] = useState(
    assignment?.DueDate ? assignment.DueDate.slice(0, 16) : `${todayInput()}T23:59`,
  );
  const [maxScore, setMaxScore] = useState(
    assignment?.MaxScore !== null && assignment?.MaxScore !== undefined
      ? String(assignment.MaxScore)
      : '100',
  );
  const [attachmentUrl, setAttachmentUrl] = useState(assignment?.AttachmentUrl ?? '');
  const [description, setDescription] = useState(assignment?.Description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (subjectId === null) {
      setError('Please select a subject.');
      return;
    }
    const maxScoreNum = Number(maxScore);
    if (!maxScoreNum || maxScoreNum <= 0) {
      setError('Max score must be greater than 0.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        SubjectId: subjectId,
        Title: title.trim(),
        Description: description.trim() || null,
        DueDate: new Date(due).toISOString(),
        MaxScore: maxScoreNum,
        AttachmentUrl: attachmentUrl.trim() || null,
      };

      const res = isEdit
        ? await updateAssignment(assignment.Id, payload)
        : await createAssignment(payload);

      onSaved(res.Message);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save assignment.';
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
      title={isEdit ? 'Edit Assignment' : 'Create Assignment'}
      subtitle={isEdit ? assignment.Title : 'Assign coursework and deadlines to your class'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Quadratic Equations — Worksheet 3"
        autoFocus
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
          label="Due Date & Time"
          value={due}
          onChangeText={setDue}
          placeholder="YYYY-MM-DDTHH:mm"
          hint="e.g. 2026-10-15T18:00"
          containerStyle={styles.halfInput}
        />
        <Input
          label="Max Score"
          value={maxScore}
          onChangeText={setMaxScore}
          keyboardType="numeric"
          placeholder="100"
          containerStyle={styles.halfInput}
        />
      </View>

      <Input
        label="Attachment URL (optional)"
        value={attachmentUrl}
        onChangeText={setAttachmentUrl}
        placeholder="https://... worksheet or resource link"
        containerStyle={styles.modalInputSpacing}
      />

      <Input
        label="Instructions / Description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Instructions for students..."
        containerStyle={styles.modalInputSpacing}
      />
    </Modal>
  );
}

/* ------------------------------------------------ Submissions & Grading Modal */
function SubmissionsModal({
  assignment,
  onClose,
  onGraded,
}: {
  assignment: Assignment;
  onClose: () => void;
  onGraded: () => void;
}) {
  const submissionsQuery = useAsync(
    (signal) => fetchSubmissions(assignment.Id, signal),
    [assignment.Id],
  );
  const rows = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data]);

  return (
    <Modal
      visible
      onClose={onClose}
      title="Student Submissions"
      subtitle={`${assignment.Title} · ${assignment.SubjectName} · Max ${assignment.MaxScore ?? 100}`}
      footer={
        <Button variant="ghost" onPress={onClose}>
          Done
        </Button>
      }
    >
      {submissionsQuery.loading && !submissionsQuery.data ? (
        <Text style={styles.loadingText}>Loading submissions...</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.emptyText}>No submissions received for this assignment yet.</Text>
      ) : (
        rows.map((submission) => (
          <SubmissionGradeRow
            key={submission.Id}
            submission={submission}
            maxScore={assignment.MaxScore}
            onGraded={() => {
              void submissionsQuery.refetch();
              onGraded();
            }}
          />
        ))
      )}
    </Modal>
  );
}

function SubmissionGradeRow({
  submission,
  maxScore,
  onGraded,
}: {
  submission: Submission;
  maxScore: number | null;
  onGraded: () => void;
}) {
  const [score, setScore] = useState(
    submission.Score !== null && submission.Score !== undefined ? String(submission.Score) : '',
  );
  const [feedback, setFeedback] = useState(submission.Feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  const saveGrade = async () => {
    const val = score.trim() === '' ? null : Number(score);
    if (val !== null && (isNaN(val) || val < 0 || (maxScore !== null && val > maxScore))) {
      setRowMsg(`Score must be between 0 and ${maxScore ?? 100}`);
      return;
    }

    setBusy(true);
    setRowMsg(null);
    try {
      const res = await gradeSubmission(submission.Id, val, feedback.trim() || null);
      setRowMsg(res.Message);
      onGraded();
    } catch (err) {
      setRowMsg(err instanceof ApiError ? err.message : 'Could not save grade.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.submissionRow}>
      <View style={styles.submissionHead}>
        <Avatar text={initials(submission.StudentName)} tone="mint" />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{submission.StudentName}</Text>
          <Text style={styles.submissionDate}>
            Roll #{submission.RollNumber ?? '—'}  ·  Submitted {formatDue(submission.SubmittedAt)}
          </Text>
        </View>
        {submission.FilePath ? (
          <TouchableOpacity
            style={styles.openWorkBtn}
            onPress={() => {
              if (submission.FilePath) void Linking.openURL(submission.FilePath);
            }}
          >
            <Icon name="fileText" size={13} color={theme.colors.mint[600]} />
            <Text style={styles.openWorkBtnText}>Open Work</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.gradingRow}>
        <Input
          label={`Score (0–${maxScore ?? 100})`}
          value={score}
          onChangeText={setScore}
          keyboardType="numeric"
          placeholder="Score"
          containerStyle={styles.scoreInput}
        />
        <Input
          label="Feedback"
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Optional remarks"
          containerStyle={styles.feedbackInput}
        />
        <Button
          variant="mint"
          onPress={() => void saveGrade()}
          loading={busy}
          disabled={busy}
          style={styles.gradeSaveBtn}
        >
          Save
        </Button>
      </View>
      {rowMsg ? <Text style={styles.rowNotice}>{rowMsg}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------ Styles */
const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  modalBanner: {
    marginBottom: theme.spacing[3],
  },
  modalInputSpacing: {
    marginTop: theme.spacing[2],
  },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  halfInput: {
    flex: 1,
  },
  staffCard: {
    paddingVertical: theme.spacing[3.5],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
  },
  staffCardInfo: {
    flex: 1,
  },
  staffActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  assignmentTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  metaRow: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueText: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[600],
  },
  overdueText: {
    color: theme.colors.rose[600],
    fontWeight: theme.fontWeight.semibold,
  },
  descText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[700],
    marginTop: 6,
    lineHeight: 18,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  attachmentLinkText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.mint[600],
  },
  submissionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing[2.5],
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.lineSoft,
  },
  submissionsToggleText: {
    flex: 1,
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.mint[600],
  },
  studentCard: {
    paddingVertical: theme.spacing[3.5],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
  },
  studentCardLeft: {
    flex: 1,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  submissionMeta: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[500],
    marginTop: 4,
  },
  feedbackBox: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[2.5],
    backgroundColor: theme.colors.lineSoft,
    borderRadius: theme.borderRadius.lg,
  },
  feedbackLabel: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[700],
  },
  feedbackContent: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[900],
    marginTop: 2,
  },
  submitSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[2.5],
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  submitInput: {
    flex: 1,
  },
  submitBtn: {
    marginBottom: 0,
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
  submissionRow: {
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  submissionHead: {
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
  submissionDate: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  openWorkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.mint[50],
  },
  openWorkBtnText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.mint[600],
  },
  gradingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  scoreInput: {
    width: 90,
  },
  feedbackInput: {
    flex: 1,
  },
  gradeSaveBtn: {
    marginBottom: 0,
  },
  rowNotice: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mint[600],
    marginTop: 4,
  },
});
