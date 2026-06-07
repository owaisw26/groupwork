import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
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
  projectOwnerId: string
  onClose: () => void
}

const FIELD_SX: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#FFFFFF',
  },
}

const SECTION_SX: SxProps<Theme> = {
  border: `1px solid ${APP_BORDER}`,
  borderRadius: '14px',
  bgcolor: '#FFFFFF',
  p: 2,
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
        py: 0.5,
        borderRadius: 2,
        bgcolor: bg,
        color,
        fontSize: 12,
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

const COMPACT_SELECT_SX: SxProps<Theme> = {
  height: 28,
  borderRadius: 2,
  bgcolor: '#FFFFFF',
  fontSize: 12,
  fontWeight: 700,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: APP_BORDER,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: SLATE[300],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: APP_PRIMARY,
  },
  '& .MuiSelect-select': {
    py: 0.5,
    pl: 1.5,
    pr: '22px !important',
    display: 'flex',
    alignItems: 'center',
    minHeight: 'unset',
  },
  '& .MuiSelect-icon': {
    right: 6,
    color: 'inherit',
  },
}

function SectionBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Box sx={SECTION_SX}>
      <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900], mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

export default function TaskDetailModal({ taskId, projectOwnerId, onClose }: TaskDetailModalProps) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { currentTask, subtasks, comments, timeLogs, totalProjectHours, editRequests } =
    useAppSelector((state) => state.tasks)
  const project = useAppSelector((state) => {
    const projectId = state.tasks.currentTask?.project_id
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
  const [requestEditOpen, setRequestEditOpen] = useState(false)
  const [proposedTitle, setProposedTitle] = useState('')
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [verifications, setVerifications] = useState<VerificationItem[]>([])
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)

  const isOwner = user?.id === projectOwnerId
  const isAssignee = currentTask?.assignee_ids.includes(user?.id ?? '') ?? false
  const canVerify =
    currentTask?.status === 'done'
    && !isAssignee
    && !verifications.some((v) => v.user_id === user?.id)

  const assignees = useMemo(
    () =>
      (currentTask?.assignee_ids ?? [])
        .map((id) => members.find((member) => member.id === id))
        .filter((member): member is ProjectMember => Boolean(member)),
    [currentTask?.assignee_ids, members],
  )

  const completedSubtasks = subtasks.filter((item) => item.is_completed).length
  const subtaskProgress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0
  const effectiveDueDate = getEffectiveDueDate(currentTask?.due_date, projectDueDate)

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
    if (!currentTask?.project_id) return
    api
      .get<ProjectMember[]>(`/projects/${currentTask.project_id}/members`)
      .then((response) => setMembers(response.data))
      .catch(() => setMembers([]))
  }, [currentTask?.project_id])

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
    await refreshTaskAndVerifications()
  }

  const handleDispute = async () => {
    if (!taskId || !disputeReason.trim()) return
    await api.post(`/tasks/${taskId}/dispute`, { reason: disputeReason.trim() })
    setDisputeReason('')
    setShowDisputeForm(false)
    await refreshTaskAndVerifications()
  }

  const handleDisputeVote = async (disputeId: string, vote: 'uphold' | 'reject') => {
    await api.post(`/disputes/${disputeId}/vote`, { vote })
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
    if (!currentTask || currentTask.id !== taskId) return
    const timer = window.setTimeout(() => {
      setEditTitle(currentTask.title)
      setEditDescription(currentTask.description ?? '')
      setEditPriority(currentTask.priority)
      setEditDueDate(currentTask.due_date ?? projectDueDate ?? '')
      setProposedTitle(currentTask.title)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentTask, taskId, projectDueDate])

  const handleClose = () => {
    dispatch(clearTaskDetail())
    setEditMode(false)
    setRequestEditOpen(false)
    onClose()
  }

  const handleSave = async () => {
    if (!taskId) return
    await dispatch(
      updateTask({
        taskId,
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        due_date: editDueDate || undefined,
      }),
    )
    setEditMode(false)
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
    if (!taskId || !currentTask) return
    const changes: Record<string, unknown> = {}
    if (proposedTitle !== currentTask.title) changes.title = proposedTitle
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

  const statusStyle = STATUS_STYLES[currentTask?.status ?? 'todo'] ?? STATUS_STYLES.todo
  const priorityStyle = PRIORITY_STYLES[currentTask?.priority ?? 'medium'] ?? PRIORITY_STYLES.medium

  return (
    <Dialog
      open={Boolean(taskId)}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '18px',
          border: `1px solid ${APP_BORDER}`,
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.11)',
          overflow: 'hidden',
          bgcolor: SLATE[50],
        },
      }}
    >
      <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 2, bgcolor: '#FFFFFF' }}>
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
                  fontSize: fs(22),
                  fontWeight: 800,
                  color: SLATE[900],
                  lineHeight: 1.25,
                  mb: 1.5,
                }}
              >
                {currentTask?.title ?? 'Task'}
              </Typography>
            )}

            {currentTask && (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                  {!editMode && (
                    <MetaPill
                      label={STATUS_LABELS[currentTask.status] ?? currentTask.status}
                      bg={statusStyle.bg}
                      color={statusStyle.color}
                    />
                  )}

                  {editMode ? (
                    <>
                      <Select
                        size="small"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        sx={{
                          ...COMPACT_SELECT_SX,
                          width: PRIORITY_SELECT_WIDTH,
                          flexShrink: 0,
                          bgcolor: (PRIORITY_STYLES[editPriority] ?? PRIORITY_STYLES.medium).bg,
                          color: (PRIORITY_STYLES[editPriority] ?? PRIORITY_STYLES.medium).color,
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        }}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option} sx={{ fontSize: 13, fontWeight: 600 }}>
                            {PRIORITY_STYLES[option].label}
                          </MenuItem>
                        ))}
                      </Select>
                      <TextField
                        type="date"
                        size="small"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{
                          ...FIELD_SX,
                          width: 148,
                          '& .MuiOutlinedInput-root': {
                            height: 28,
                            borderRadius: 2,
                            fontSize: 12,
                            fontWeight: 600,
                          },
                          '& .MuiOutlinedInput-input': {
                            py: 0.5,
                            px: 1.25,
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: 12, color: SLATE[400], fontWeight: 600 }}>
                        {STATUS_LABELS[currentTask.status]} · move on board to change status
                      </Typography>
                    </>
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

                  {currentTask.status === 'done' && (
                    <MetaPill
                      label={`Verification: ${currentTask.verification_status}`}
                      bg={
                        currentTask.verification_status === 'verified'
                          ? '#DCFCE7'
                          : currentTask.verification_status === 'disputed'
                            ? '#FEE2E2'
                            : '#FEF3C7'
                      }
                      color={
                        currentTask.verification_status === 'verified'
                          ? '#166534'
                          : currentTask.verification_status === 'disputed'
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
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    {assignees.length > 0 ? (
                      <>
                        <Box sx={{ display: 'flex' }}>
                          {assignees.slice(0, 4).map((assignee, index) => (
                            <Avatar
                              key={assignee.id}
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 12,
                                fontWeight: 700,
                                bgcolor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                                border: '2.5px solid #FFFFFF',
                                ml: index > 0 ? '-10px' : 0,
                                color: SLATE[800],
                              }}
                            >
                              {memberInitials(assignee.full_name)}
                            </Avatar>
                          ))}
                        </Box>
                        <Typography sx={{ fontSize: fs(13), color: SLATE[500], fontWeight: 600 }}>
                          {assignees.map((member) => member.full_name).join(', ')}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: fs(13), color: SLATE[400], fontStyle: 'italic' }}>
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
              width: 40,
              height: 40,
              flexShrink: 0,
            }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
        {currentTask && (
          <Stack spacing={2}>
            <Box sx={SECTION_SX}>
              {editMode ? (
                <TextField
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  sx={FIELD_SX}
                />
              ) : (
                <Typography sx={{ fontSize: fs(15), color: SLATE[500], lineHeight: 1.6 }}>
                  {currentTask.description || 'No description provided.'}
                </Typography>
              )}
            </Box>

            {currentTask.status === 'done' && (
              <Box
                sx={{
                  ...SECTION_SX,
                  bgcolor: APP_PRIMARY_LIGHT,
                  borderColor: 'rgba(37, 99, 235, 0.12)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <VerifiedOutlinedIcon sx={{ color: APP_PRIMARY, fontSize: 20 }} />
                  <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
                    Peer Verification
                  </Typography>
                </Box>

                {verifications.length === 0 ? (
                  <Typography sx={{ fontSize: fs(14), color: SLATE[500], mb: canVerify ? 1.5 : 0 }}>
                    No verification votes yet.
                  </Typography>
                ) : (
                  <Stack spacing={0.75} sx={{ mb: canVerify ? 1.5 : 0 }}>
                    {verifications.map((v) => (
                      <Typography key={v.id} sx={{ fontSize: fs(13), color: SLATE[700] }}>
                        {v.user_name ?? 'Member'} · {v.status}
                      </Typography>
                    ))}
                  </Stack>
                )}

                {canVerify && (
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
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<GavelOutlinedIcon />}
                      onClick={() => setShowDisputeForm(true)}
                      sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                    >
                      Dispute
                    </Button>
                  </Box>
                )}

                {showDisputeForm && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1.5 }}>
                    <TextField
                      size="small"
                      label="Dispute reason"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      multiline
                      rows={2}
                      sx={FIELD_SX}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={handleDispute}
                        sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                      >
                        Submit Dispute
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setShowDisputeForm(false)}
                        sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}

                {disputes.length > 0 && (
                  <Stack spacing={1.25} sx={{ mt: 2 }}>
                    {disputes.map((dispute) => {
                      const userVoted = dispute.votes.some((v) => v.user_id === user?.id)
                      const canVote = dispute.status === 'open' && !userVoted
                      return (
                        <Box
                          key={dispute.id}
                          sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: '#FFFFFF',
                            border: `1px solid ${APP_BORDER}`,
                          }}
                        >
                          <Typography sx={{ fontSize: fs(14), color: SLATE[800], mb: 0.5 }}>
                            {dispute.reason}
                          </Typography>
                          <Typography sx={{ fontSize: fs(12), color: SLATE[500], mb: 1 }}>
                            {dispute.status === 'resolved'
                              ? `Resolved: ${dispute.outcome ?? 'unknown'}`
                              : `Votes: ${dispute.vote_summary.uphold} uphold / ${dispute.vote_summary.reject} reject`}
                          </Typography>
                          {canVote && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleDisputeVote(dispute.id, 'uphold')}
                                sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                              >
                                Uphold
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleDisputeVote(dispute.id, 'reject')}
                                sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                              >
                                Reject
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            )}

            <SectionBlock title="Subtasks">
              <Stack spacing={0.75}>
                {subtasks.map((subtask) => (
                  <Box
                    key={subtask.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1,
                      py: 0.75,
                      borderRadius: '10px',
                      bgcolor: SLATE[50],
                    }}
                  >
                    <Checkbox
                      checked={subtask.is_completed}
                      onChange={() =>
                        dispatch(
                          toggleSubtask({
                            taskId: taskId,
                            subtaskId: subtask.id,
                            is_completed: !subtask.is_completed,
                          }),
                        )
                      }
                      size="small"
                      sx={{
                        p: 0.25,
                        color: SLATE[300],
                        '&.Mui-checked': { color: APP_PRIMARY },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: fs(14),
                        color: subtask.is_completed ? SLATE[400] : SLATE[800],
                        textDecoration: subtask.is_completed ? 'line-through' : 'none',
                      }}
                    >
                      {subtask.title}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
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
                  sx={{ fontWeight: 700, borderRadius: '10px', px: 2, textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
            </SectionBlock>

            <SectionBlock title="Comments">
              <Stack spacing={1.25}>
                {comments.length === 0 ? (
                  <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic' }}>
                    No comments yet.
                  </Typography>
                ) : (
                  comments.map((comment) => (
                    <Box
                      key={comment.id}
                      sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: SLATE[50],
                        border: `1px solid ${APP_BORDER}`,
                      }}
                    >
                      <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[900], mb: 0.25 }}>
                        {comment.author_name ?? 'User'}
                      </Typography>
                      <Typography sx={{ fontSize: fs(14), color: SLATE[600], lineHeight: 1.5 }}>
                        {comment.content}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
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
                  sx={{ fontWeight: 700, borderRadius: '10px', px: 2, textTransform: 'none' }}
                >
                  Post
                </Button>
              </Box>
            </SectionBlock>

            <SectionBlock title="Evidence">
              {evidence.length === 0 ? (
                <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic', mb: 1.5 }}>
                  No files uploaded yet.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ mb: 1.5 }}>
                  {evidence.map((file) => (
                    <Box
                      key={file.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.25,
                        borderRadius: '10px',
                        bgcolor: SLATE[50],
                      }}
                    >
                      <Typography
                        component="a"
                        href={file.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: fs(14),
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
              <EvidenceUpload taskId={taskId} onUploaded={refreshEvidence} />
            </SectionBlock>

            <SectionBlock title="Time Logs">
              <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 1.5 }}>
                Your total hours on this project: {totalProjectHours}h
              </Typography>
              {timeLogs.length === 0 ? (
                <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic', mb: 1.5 }}>
                  No time logged yet.
                </Typography>
              ) : (
                <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                  {timeLogs.map((log) => (
                    <Box
                      key={log.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        p: 1.25,
                        borderRadius: '10px',
                        bgcolor: SLATE[50],
                      }}
                    >
                      <Typography sx={{ fontSize: fs(14), color: SLATE[700] }}>
                        {log.user_name ?? 'User'} · {log.date}
                      </Typography>
                      <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900] }}>
                        {log.hours}h
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              {isAssignee && <TimeLogForm taskId={taskId} />}
            </SectionBlock>

            {isOwner && editRequests.length > 0 && (
              <SectionBlock title="Pending Edit Requests">
                {editRequests.map((request) => (
                  <Box key={request.id} sx={{ mb: editRequests.length > 1 ? 2 : 0 }}>
                    <EditRequestDiff current={currentTask} proposed={request.proposed_changes} />
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

            {!isOwner && requestEditOpen && currentTask && (
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
                  current={currentTask}
                  proposed={proposedTitle !== currentTask.title ? { title: proposedTitle } : {}}
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
          px: { xs: 2.5, sm: 3 },
          py: 2,
          bgcolor: '#FFFFFF',
          borderTop: `1px solid ${APP_BORDER}`,
        }}
      >
        {!isOwner && !requestEditOpen && (
          <Button
            onClick={() => setRequestEditOpen(true)}
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Request Edit
          </Button>
        )}
        {!isOwner && requestEditOpen && (
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
        {isOwner && !editMode && (
          <Button
            variant="outlined"
            onClick={() => setEditMode(true)}
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Edit Task
          </Button>
        )}
        {isOwner && editMode && (
          <>
            <Button
              onClick={() => setEditMode(false)}
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
  )
}
