import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Snackbar,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Alert from '@mui/material/Alert'
import type { SxProps, Theme } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE } from '../appTheme'
import {
  AVATAR_COLORS,
  memberInitials,
  PRIORITY_OPTIONS,
  PRIORITY_SELECT_WIDTH,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  formatTaskDueDate,
  getEffectiveDueDate,
} from '../constants/taskFields'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  clearTaskDetail,
  createComment,
  createSubtask,
  fetchComments,
  fetchEditRequests,
  fetchSubtasks,
  fetchTask,
  fetchTimeLogs,
  reviewEditRequest,
  setActiveDetailTaskId,
  submitEditRequest,
  toggleSubtask,
  updateTask,
} from '../store/tasksSlice'
import api from '../services/api'
import EditRequestDiff from './EditRequestDiff'
import EvidenceUpload from './EvidenceUpload'
import TimeLogForm from './TimeLogForm'
import type { Task } from '../store/tasksSlice'

interface ProjectMember {
  id: string
  full_name: string
}

interface EvidenceItem {
  id: string
  original_filename: string
  file_size: number
  uploaded_at: string
  user_name?: string
  download_url?: string
}

interface VerificationItem {
  id: string
  user_id: string
  user_name?: string
  status: string
}

interface DisputeVoteItem {
  id: string
  user_id: string
  user_name?: string
  vote: string
}

interface DisputeItem {
  id: string
  reason: string
  status: string
  outcome: string | null
  votes: DisputeVoteItem[]
  vote_summary: {
    uphold: number
    reject: number
    total_members: number
  }
}

interface TaskDetailModalProps {
  taskId: string | null
  initialTask?: Task | null
  projectOwnerId: string
  onClose: () => void
  isReadOnly?: boolean
}

const FIELD_SX: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
  },
  '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': {
    height: 34,
  },
  '& .MuiInputBase-input': {
    py: 0.75,
    fontSize: fs(13),
    lineHeight: 1.25,
    '&::placeholder': {
      fontSize: fs(13),
      opacity: 0.75,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: fs(13),
  },
}

const SECTION_SX: SxProps<Theme> = {
  border: `1px solid ${APP_BORDER}`,
  borderRadius: '10px',
  bgcolor: '#FFFFFF',
  p: 1.25,
}

function MetaPill({
  label,
  bg,
  color,
  width,
}: {
  label: string
  bg: string
  color: string
  width?: number
}) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.35,
        borderRadius: 2,
        bgcolor: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...(width != null && {
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }),
      }}
    >
      {label}
    </Box>
  )
}

function SectionBlock({
  title,
  children,
  sx,
}: {
  title: string
  children: React.ReactNode
  sx?: SxProps<Theme>
}) {
  return (
    <Box sx={[SECTION_SX, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <Typography sx={{ fontSize: fs(13), fontWeight: 800, color: SLATE[900], mb: 0.75 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

export default function TaskDetailModal({
  taskId,
  initialTask = null,
  projectOwnerId,
  onClose,
  isReadOnly = false,
}: TaskDetailModalProps) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { currentTask, subtasks, comments, timeLogs, totalProjectHours, editRequests } =
    useAppSelector((state) => state.tasks)
  const displayedTask =
    currentTask?.id === taskId ? currentTask : initialTask?.id === taskId ? initialTask : null
  const project = useAppSelector((state) => {
    const projectId = displayedTask?.project_id
    if (!projectId) return state.projects.currentProject
    return (
      state.projects.items.find((item) => item.id === projectId)
      ?? (state.projects.currentProject?.id === projectId ? state.projects.currentProject : null)
    )
  })
  const projectDueDate = project?.due_date ?? null

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editDueDate, setEditDueDate] = useState('')
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([])
  const [requestEditOpen, setRequestEditOpen] = useState(false)
  const [proposedTitle, setProposedTitle] = useState('')
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [verifications, setVerifications] = useState<VerificationItem[]>([])
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)

  const isOwner = user?.id === projectOwnerId
  const isAssignee = displayedTask?.assignee_ids.includes(user?.id ?? '') ?? false
  const canVerify =
    displayedTask?.status === 'review'
    && !isAssignee
    && !verifications.some((v) => v.user_id === user?.id)
  const showVerification = displayedTask?.status === 'review' || displayedTask?.status === 'done'

  const assignees = useMemo(
    () =>
      (displayedTask?.assignee_ids ?? [])
        .map((id) => members.find((member) => member.id === id))
        .filter((member): member is ProjectMember => Boolean(member)),
    [displayedTask?.assignee_ids, members],
  )

  const completedSubtasks = subtasks.filter((item) => item.is_completed).length
  const subtaskProgress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0
  const effectiveDueDate = getEffectiveDueDate(displayedTask?.due_date, projectDueDate)

  useEffect(() => {
    if (!taskId) return
    dispatch(setActiveDetailTaskId(taskId))
    dispatch(fetchTask(taskId))
    dispatch(fetchSubtasks(taskId))
    dispatch(fetchComments(taskId))
    dispatch(fetchTimeLogs(taskId))
    api.get(`/tasks/${taskId}/evidence`).then((res) => {
      setEvidence(res.data.items ?? [])
    }).catch(() => setEvidence([]))
    api.get(`/tasks/${taskId}/verifications`).then((res) => {
      setVerifications(res.data.items ?? [])
    }).catch(() => setVerifications([]))
    api.get(`/tasks/${taskId}/disputes`).then((res) => {
      setDisputes(res.data.items ?? [])
    }).catch(() => setDisputes([]))
  }, [dispatch, taskId])

  useEffect(() => {
    if (!displayedTask?.project_id) return
    api
      .get<ProjectMember[]>(`/projects/${displayedTask.project_id}/members`)
      .then((response) => setMembers(response.data))
      .catch(() => setMembers([]))
  }, [displayedTask?.project_id])

  const refreshTaskAndVerifications = async () => {
    if (!taskId) return
    await dispatch(fetchTask(taskId))
    const [verificationsRes, disputesRes] = await Promise.all([
      api.get(`/tasks/${taskId}/verifications`),
      api.get(`/tasks/${taskId}/disputes`),
    ])
    setVerifications(verificationsRes.data.items ?? [])
    setDisputes(disputesRes.data.items ?? [])
  }

  const handleVerify = async () => {
    if (!taskId) return
    await api.post(`/tasks/${taskId}/verify`)
    setVerifySuccess(displayedTask ? `"${displayedTask.title}" was verified` : 'Task was verified')
    await refreshTaskAndVerifications()
  }

  const refreshEvidence = () => {
    if (!taskId) return
    api.get(`/tasks/${taskId}/evidence`).then((res) => {
      setEvidence(res.data.items ?? [])
    }).catch(() => setEvidence([]))
  }

  useEffect(() => {
    if (!taskId || !isOwner) return
    dispatch(fetchEditRequests(taskId))
  }, [dispatch, taskId, isOwner])

  useEffect(() => {
    if (!displayedTask || displayedTask.id !== taskId) return
    const timer = window.setTimeout(() => {
      setEditTitle(displayedTask.title)
      setEditDescription(displayedTask.description ?? '')
      setEditPriority(displayedTask.priority)
      setEditDueDate(displayedTask.due_date ?? '')
      setEditAssigneeIds(displayedTask.assignee_ids)
      setProposedTitle(displayedTask.title)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [displayedTask, taskId])

  const handleClose = () => {
    dispatch(clearTaskDetail())
    setEditMode(false)
    setRequestEditOpen(false)
    setVerifySuccess(null)
    onClose()
  }

  const resetEditFields = () => {
    if (!displayedTask) return
    setEditTitle(displayedTask.title)
    setEditDescription(displayedTask.description ?? '')
    setEditPriority(displayedTask.priority)
    setEditDueDate(displayedTask.due_date ?? '')
    setEditAssigneeIds(displayedTask.assignee_ids)
  }

  const handleSave = async () => {
    if (!taskId) return
    const assigneeIds = editAssigneeIds.length > 0 ? editAssigneeIds : user?.id ? [user.id] : []
    setSaveError(null)
    try {
      await dispatch(
        updateTask({
          taskId,
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          due_date: editDueDate || undefined,
          assignee_ids: isOwner ? assigneeIds : undefined,
        }),
      ).unwrap()
      setEditMode(false)
    } catch (error) {
      setSaveError(typeof error === 'string' ? error : 'Failed to save task')
    }
  }

  const handleAddSubtask = async () => {
    if (!taskId || !newSubtask.trim()) return
    await dispatch(createSubtask({ taskId, title: newSubtask.trim() }))
    setNewSubtask('')
  }

  const handleAddComment = async () => {
    if (!taskId || !newComment.trim()) return
    await dispatch(createComment({ taskId, content: newComment.trim() }))
    setNewComment('')
  }

  const handleSubmitEditRequest = async () => {
    if (!taskId || !displayedTask) return
    const changes: Record<string, unknown> = {}
    if (proposedTitle !== displayedTask.title) changes.title = proposedTitle
    if (Object.keys(changes).length === 0) return
    await dispatch(submitEditRequest({ taskId, proposed_changes: changes }))
    setRequestEditOpen(false)
  }

  const handleReviewEditRequest = async (requestId: string, approved: boolean) => {
    if (!taskId) return
    await dispatch(reviewEditRequest({ taskId, requestId, approved }))
    await dispatch(fetchTask(taskId))
    if (approved) {
      dispatch(fetchEditRequests(taskId))
    }
  }

  if (!taskId) return null

  const statusStyle = STATUS_STYLES[displayedTask?.status ?? 'todo'] ?? STATUS_STYLES.todo
  const priorityStyle = PRIORITY_STYLES[displayedTask?.priority ?? 'medium'] ?? PRIORITY_STYLES.medium

  return (
    <>
    <Dialog
      open={Boolean(taskId)}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '18px',
            border: `1px solid ${APP_BORDER}`,
            boxShadow: '0 18px 48px rgba(15, 23, 42, 0.11)',
            overflow: 'hidden',
            bgcolor: SLATE[50],
            maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 48px)' },
          },
        },
      }}
    >
      <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pt: { xs: 1.5, sm: 1.75 }, pb: 1.25, bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {editMode ? (
              <TextField
                fullWidth
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                sx={{ ...FIELD_SX, mb: 1.5 }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: fs(18),
                  fontWeight: 800,
                  color: SLATE[900],
                  lineHeight: 1.25,
                  mb: 0.75,
                }}
              >
                {displayedTask?.title ?? 'Task'}
              </Typography>
            )}

            {displayedTask && (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.6, mb: 0.75 }}>
                  {!editMode && (
                    <MetaPill
                      label={STATUS_LABELS[displayedTask.status] ?? displayedTask.status}
                      bg={statusStyle.bg}
                      color={statusStyle.color}
                    />
                  )}

                  {editMode ? (
                    <Typography sx={{ fontSize: 12, color: SLATE[400], fontWeight: 600 }}>
                      {STATUS_LABELS[displayedTask.status]} · move on board to change status
                    </Typography>
                  ) : (
                    <>
                      <MetaPill
                        label={priorityStyle.label}
                        bg={priorityStyle.bg}
                        color={priorityStyle.color}
                        width={PRIORITY_SELECT_WIDTH}
                      />
                      {effectiveDueDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: SLATE[500] }}>
                          <CalendarTodayOutlinedIcon sx={{ fontSize: 15 }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {formatTaskDueDate(effectiveDueDate)}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}

                  {showVerification && (
                    <MetaPill
                      label={`Verification: ${displayedTask.verification_status}`}
                      bg={
                        displayedTask.verification_status === 'verified'
                          ? '#DCFCE7'
                          : displayedTask.verification_status === 'disputed'
                            ? '#FEE2E2'
                            : '#FEF3C7'
                      }
                      color={
                        displayedTask.verification_status === 'verified'
                          ? '#166534'
                          : displayedTask.verification_status === 'disputed'
                            ? '#B91C1C'
                            : '#B45309'
                      }
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {assignees.length > 0 ? (
                      <>
                        <Box sx={{ display: 'flex' }}>
                          {assignees.slice(0, 4).map((assignee, index) => (
                            <Avatar
                              key={assignee.id}
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: 11,
                                fontWeight: 700,
                                bgcolor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                                border: '2px solid #FFFFFF',
                                ml: index > 0 ? '-7px' : 0,
                                color: SLATE[800],
                              }}
                            >
                              {memberInitials(assignee.full_name)}
                            </Avatar>
                          ))}
                        </Box>
                        <Typography sx={{ fontSize: fs(12), color: SLATE[500], fontWeight: 600 }}>
                          {assignees.map((member) => member.full_name).join(', ')}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: fs(12), color: SLATE[400], fontStyle: 'italic' }}>
                        No assignees yet
                      </Typography>
                    )}
                  </Box>

                  {subtasks.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[500], fontWeight: 700 }}>
                        {completedSubtasks}/{subtasks.length}
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 6,
                          bgcolor: '#E2E8F0',
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${subtaskProgress}%`,
                            height: '100%',
                            bgcolor: '#22C55E',
                            borderRadius: 999,
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>

          <IconButton
            aria-label="Close task details"
            onClick={handleClose}
            sx={{
              border: `1px solid ${APP_BORDER}`,
              borderRadius: '12px',
              width: 34,
              height: 34,
              flexShrink: 0,
            }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {editMode && displayedTask && (
        <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pt: 1.25, pb: 0.5, display: 'flex', gap: 1.5 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id="edit-task-priority-label" shrink>Priority</InputLabel>
            <Select
              labelId="edit-task-priority-label"
              label="Priority"
              notched
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              sx={{ borderRadius: '10px', fontSize: fs(13), fontWeight: 600 }}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option} value={option} sx={{ fontSize: 13, fontWeight: 600 }}>
                  {PRIORITY_STYLES[option].label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Due Date"
            type="date"
            size="small"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: fs(13) } }}
          />
          {isOwner && (
            <FormControl size="small" sx={{ flex: 2 }}>
              <InputLabel id="edit-task-assignees-label" shrink>Assignees</InputLabel>
              <Select<string[]>
                labelId="edit-task-assignees-label"
                label="Assignees"
                multiple
                notched
                value={editAssigneeIds}
                onChange={(event: SelectChangeEvent<string[]>) => {
                  const value = event.target.value
                  setEditAssigneeIds(typeof value === 'string' ? value.split(',') : value)
                }}
                input={<OutlinedInput label="Assignees" notched />}
                renderValue={(selected) =>
                  selected
                    .map((memberId: string) =>
                      members.find((member) => member.id === memberId)?.full_name ?? memberId,
                    )
                    .join(', ')
                }
                sx={{ borderRadius: '10px', fontSize: fs(13) }}
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id} sx={{ fontSize: 13, fontWeight: 600 }}>
                    {member.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      <Box sx={{ px: { xs: 1.75, sm: 2.25 }, py: 1.25 }}>
        {displayedTask && (
          <Stack spacing={1}>
            <Box sx={SECTION_SX}>
              {editMode ? (
                <TextField
                  label="Description"
                  multiline
                  rows={2}
                  fullWidth
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  sx={FIELD_SX}
                />
              ) : (
                <Typography sx={{ fontSize: fs(13), color: SLATE[500], lineHeight: 1.35 }}>
                  {displayedTask.description || 'No description provided.'}
                </Typography>
              )}
            </Box>

            {!editMode && showVerification && (
              <Box
                sx={{
                  ...SECTION_SX,
                  bgcolor: APP_PRIMARY_LIGHT,
                  borderColor: 'rgba(37, 99, 235, 0.12)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <VerifiedOutlinedIcon sx={{ color: APP_PRIMARY, fontSize: 18 }} />
                  <Typography sx={{ fontSize: fs(13), fontWeight: 800, color: SLATE[900] }}>
                    Peer Verification
                  </Typography>
                </Box>

                {verifications.length === 0 ? (
                  <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: canVerify ? 1 : 0 }}>
                    No verification votes yet.
                  </Typography>
                ) : (
                  <Stack spacing={0.5} sx={{ mb: canVerify ? 1 : 0 }}>
                    {verifications.map((v) => (
                      <Typography key={v.id} sx={{ fontSize: fs(13), color: SLATE[700] }}>
                        {v.user_name ?? 'Member'} · {v.status}
                      </Typography>
                    ))}
                  </Stack>
                )}

                {canVerify && !isReadOnly && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircleOutlineOutlinedIcon />}
                      onClick={handleVerify}
                      sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                    >
                      Verify
                    </Button>
                  </Box>
                )}

                {disputes.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 1.25 }}>
                    {disputes.map((dispute) => (
                      <Box
                        key={dispute.id}
                        sx={{
                          p: 1,
                          borderRadius: '10px',
                          bgcolor: '#FFFFFF',
                          border: `1px solid ${APP_BORDER}`,
                        }}
                      >
                        <Typography sx={{ fontSize: fs(13), color: SLATE[800], mb: 0.25 }}>
                          {dispute.reason}
                        </Typography>
                        <Typography sx={{ fontSize: fs(12), color: SLATE[500] }}>
                          {dispute.status === 'resolved' ? 'Resolved' : 'Open dispute'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {!editMode && <SectionBlock title="Subtasks">
              <Stack spacing={0.5}>
                {subtasks.map((subtask) => (
                  <Box
                    key={subtask.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1,
                      py: 0.4,
                      borderRadius: '8px',
                      bgcolor: SLATE[50],
                    }}
                  >
                    <Checkbox
                      checked={subtask.is_completed}
                      onChange={() =>
                        !isReadOnly &&
                        dispatch(
                          toggleSubtask({
                            taskId: taskId,
                            subtaskId: subtask.id,
                            is_completed: !subtask.is_completed,
                          }),
                        )
                      }
                      disabled={isReadOnly}
                      size="small"
                      sx={{
                        p: 0.25,
                        color: SLATE[300],
                        '&.Mui-checked': { color: APP_PRIMARY },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: fs(13),
                        color: subtask.is_completed ? SLATE[400] : SLATE[800],
                        textDecoration: subtask.is_completed ? 'line-through' : 'none',
                      }}
                    >
                      {subtask.title}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              {!isReadOnly && (
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                  <TextField
                    size="small"
                    placeholder="Add subtask"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    sx={{ flex: 1, ...FIELD_SX }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddSubtask}
                    sx={{ fontWeight: 700, borderRadius: '10px', px: 1.75, textTransform: 'none' }}
                  >
                    Add
                  </Button>
                </Box>
              )}
            </SectionBlock>}

            {!editMode && <SectionBlock title="Comments">
              <Stack spacing={0.75}>
                {comments.length === 0 ? (
                  <Typography sx={{ fontSize: fs(13), color: SLATE[400], fontStyle: 'italic' }}>
                    No comments yet.
                  </Typography>
                ) : (
                  comments.map((comment) => (
                    <Box
                      key={comment.id}
                      sx={{
                        p: 1.25,
                        borderRadius: '10px',
                        bgcolor: SLATE[50],
                        border: `1px solid ${APP_BORDER}`,
                      }}
                    >
                      <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[900], mb: 0.25 }}>
                        {comment.author_name ?? 'User'}
                      </Typography>
                      <Typography sx={{ fontSize: fs(13), color: SLATE[500], lineHeight: 1.35 }}>
                        {comment.content}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
              {!isReadOnly && (
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                  <TextField
                    size="small"
                    placeholder="Add comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    sx={{ flex: 1, ...FIELD_SX }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddComment}
                    sx={{ fontWeight: 700, borderRadius: '10px', px: 1.75, textTransform: 'none' }}
                  >
                    Post
                  </Button>
                </Box>
              )}
            </SectionBlock>}

            {!editMode && <SectionBlock title="Evidence">
              {evidence.length === 0 ? (
                <Typography sx={{ fontSize: fs(13), color: SLATE[400], fontStyle: 'italic', mb: 0.75 }}>
                  No files uploaded yet.
                </Typography>
              ) : (
                <Stack spacing={0.5} sx={{ mb: 0.75 }}>
                  {evidence.map((file) => (
                    <Box
                      key={file.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        px: 1,
                        py: 0.75,
                        borderRadius: '8px',
                        bgcolor: SLATE[50],
                      }}
                    >
                      <Typography
                        component="a"
                        href={file.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: fs(13),
                          fontWeight: 600,
                          color: APP_PRIMARY,
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {file.original_filename}
                      </Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[500] }}>
                        {file.user_name ?? 'User'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              {!isReadOnly && <EvidenceUpload taskId={taskId} onUploaded={refreshEvidence} />}
            </SectionBlock>}

            {!editMode && <SectionBlock title="Time Logs">
              <Typography sx={{ fontSize: fs(12), color: SLATE[500], mb: 0.75 }}>
                Your total hours on this project: {totalProjectHours}h
              </Typography>
              {timeLogs.length === 0 ? (
                <Typography sx={{ fontSize: fs(13), color: SLATE[400], fontStyle: 'italic', mb: 0.75 }}>
                  No time logged yet.
                </Typography>
              ) : (
                <Stack spacing={0.5} sx={{ mb: 0.75 }}>
                  {timeLogs.map((log) => (
                    <Box
                      key={log.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 0.75,
                        borderRadius: '8px',
                        bgcolor: SLATE[50],
                      }}
                    >
                      <Typography sx={{ fontSize: fs(13), color: SLATE[700] }}>
                        {log.user_name ?? 'User'} · {log.date}
                      </Typography>
                      <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[900] }}>
                        {log.hours}h
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              {isAssignee && !isReadOnly && <TimeLogForm taskId={taskId} />}
            </SectionBlock>}

            {isOwner && displayedTask && editRequests.length > 0 && (
              <SectionBlock title="Pending Edit Requests">
                {editRequests.map((request) => (
                  <Box key={request.id} sx={{ mb: editRequests.length > 1 ? 2 : 0 }}>
                    <EditRequestDiff current={displayedTask} proposed={request.proposed_changes} />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleReviewEditRequest(request.id, true)}
                        sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleReviewEditRequest(request.id, false)}
                        sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Box>
                ))}
              </SectionBlock>
            )}

            {!editMode && !isOwner && !isAssignee && requestEditOpen && displayedTask && (
              <SectionBlock title="Request Edit">
                <TextField
                  label="Proposed title"
                  size="small"
                  fullWidth
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                  sx={{ ...FIELD_SX, mb: 1.5 }}
                />
                <EditRequestDiff
                  current={displayedTask}
                  proposed={proposedTitle !== displayedTask.title ? { title: proposedTitle } : {}}
                />
              </SectionBlock>
            )}
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 1,
          px: { xs: 1.75, sm: 2.25 },
          py: 1.25,
          bgcolor: '#FFFFFF',
          borderTop: `1px solid ${APP_BORDER}`,
        }}
      >
        {!isReadOnly && !isOwner && !isAssignee && !requestEditOpen && (
          <Button
            onClick={() => setRequestEditOpen(true)}
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Request Edit
          </Button>
        )}
        {!isReadOnly && !isOwner && !isAssignee && requestEditOpen && (
          <>
            <Button
              onClick={() => setRequestEditOpen(false)}
              sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitEditRequest}
              sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
            >
              Submit Request
            </Button>
          </>
        )}
        {!isReadOnly && (isOwner || isAssignee) && !editMode && (
          <Button
            variant="outlined"
            onClick={() => setEditMode(true)}
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Edit Task
          </Button>
        )}
        {!isReadOnly && (isOwner || isAssignee) && editMode && (
          <>
            {saveError && (
              <Typography sx={{ fontSize: 13, color: '#DC2626', fontWeight: 600, mr: 'auto' }}>
                {saveError}
              </Typography>
            )}
            <Button
              onClick={() => {
                resetEditFields()
                setSaveError(null)
                setEditMode(false)
              }}
              sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
            >
              Save Changes
            </Button>
          </>
        )}
      </Box>
    </Dialog>
    <Snackbar
      open={Boolean(verifySuccess)}
      autoHideDuration={3500}
      onClose={() => setVerifySuccess(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="success" variant="filled" onClose={() => setVerifySuccess(null)}>
        {verifySuccess}
      </Alert>
    </Snackbar>
    </>
  )
}
