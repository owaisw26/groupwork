import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
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

export default function TaskDetailModal({ taskId, projectOwnerId, onClose }: TaskDetailModalProps) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { currentTask, subtasks, comments, timeLogs, totalProjectHours, editRequests } =
    useAppSelector((state) => state.tasks)

  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('')
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
      setProposedTitle(currentTask.title)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentTask, taskId])

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

  return (
    <Dialog open={Boolean(taskId)} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editMode ? (
          <TextField
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            size="small"
          />
        ) : (
          currentTask?.title ?? 'Task'
        )}
      </DialogTitle>
      <DialogContent dividers>
        {currentTask && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={currentTask.status.replace('_', ' ')} size="small" />
              <Chip label={currentTask.priority} size="small" color="primary" variant="outlined" />
              {currentTask.due_date && <Chip label={`Due ${currentTask.due_date}`} size="small" variant="outlined" />}
              {currentTask.status === 'done' && (
                <Chip
                  label={`Verification: ${currentTask.verification_status}`}
                  size="small"
                  color={
                    currentTask.verification_status === 'verified'
                      ? 'success'
                      : currentTask.verification_status === 'disputed'
                        ? 'error'
                        : 'warning'
                  }
                />
              )}
            </Box>

            {currentTask.status === 'done' && (
              <>
                <Typography variant="subtitle2">Verification</Typography>
                {verifications.map((v) => (
                  <Typography key={v.id} variant="body2">
                    {v.user_name ?? 'Member'}: {v.status}
                  </Typography>
                ))}
                {canVerify && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="contained" color="success" onClick={handleVerify}>
                      Verify
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => setShowDisputeForm(true)}>
                      Dispute
                    </Button>
                  </Box>
                )}
                {showDisputeForm && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      size="small"
                      label="Dispute reason"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      multiline
                      rows={2}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" color="error" onClick={handleDispute}>
                        Submit Dispute
                      </Button>
                      <Button size="small" onClick={() => setShowDisputeForm(false)}>
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
                {disputes.length > 0 && (
                  <>
                    <Typography variant="subtitle2">Disputes</Typography>
                    {disputes.map((dispute) => {
                      const userVoted = dispute.votes.some((v) => v.user_id === user?.id)
                      const canVote = dispute.status === 'open' && !userVoted
                      return (
                        <Box
                          key={dispute.id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 1.5,
                          }}
                        >
                          <Typography variant="body2">{dispute.reason}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dispute.status === 'resolved'
                              ? `Resolved: ${dispute.outcome ?? 'unknown'}`
                              : `Votes: ${dispute.vote_summary.uphold} uphold / ${dispute.vote_summary.reject} reject`}
                          </Typography>
                          {dispute.votes.map((vote) => (
                            <Typography key={vote.id} variant="caption" sx={{ display: 'block' }}>
                              {vote.user_name ?? 'Member'}: {vote.vote}
                            </Typography>
                          ))}
                          {canVote && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleDisputeVote(dispute.id, 'uphold')}
                              >
                                Uphold
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleDisputeVote(dispute.id, 'reject')}
                              >
                                Reject
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </>
                )}
                <Divider />
              </>
            )}

            {editMode ? (
              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {currentTask.description || 'No description'}
              </Typography>
            )}

            <Divider />

            <Typography variant="subtitle2">Subtasks</Typography>
            <List dense disablePadding>
              {subtasks.map((subtask) => (
                <ListItem key={subtask.id} disablePadding>
                  <FormControlLabel
                    control={
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
                      />
                    }
                    label={subtask.title}
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Add subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                sx={{ flex: 1 }}
              />
              <Button size="small" onClick={handleAddSubtask}>
                Add
              </Button>
            </Box>

            <Divider />

            <Typography variant="subtitle2">Comments</Typography>
            <List dense>
              {comments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start" disablePadding sx={{ mb: 1 }}>
                  <ListItemText
                    primary={comment.author_name ?? 'User'}
                    secondary={comment.content}
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Add comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                sx={{ flex: 1 }}
              />
              <Button size="small" onClick={handleAddComment}>
                Post
              </Button>
            </Box>

            <Divider />

            <Typography variant="subtitle2">Evidence</Typography>
            {evidence.map((file) => (
              <Box key={file.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" component="a" href={file.download_url} target="_blank" rel="noopener noreferrer">
                  {file.original_filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {file.user_name ?? 'User'}
                </Typography>
              </Box>
            ))}
            <EvidenceUpload taskId={taskId} onUploaded={refreshEvidence} />

            <Divider />

            <Typography variant="subtitle2">Time Logs</Typography>
            <Typography variant="caption" color="text.secondary">
              Your total hours on this project: {totalProjectHours}h
            </Typography>
            {timeLogs.map((log) => (
              <Box key={log.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  {log.user_name ?? 'User'} · {log.date}
                </Typography>
                <Typography variant="body2">{log.hours}h</Typography>
              </Box>
            ))}
            {isAssignee && <TimeLogForm taskId={taskId} />}

            {isOwner && editRequests.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2">Pending Edit Requests</Typography>
                {editRequests.map((request) => (
                  <Box key={request.id}>
                    <EditRequestDiff
                      current={currentTask}
                      proposed={request.proposed_changes}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleReviewEditRequest(request.id, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleReviewEditRequest(request.id, false)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Box>
                ))}
              </>
            )}

            {!isOwner && requestEditOpen && currentTask && (
              <>
                <Divider />
                <Typography variant="subtitle2">Request Edit</Typography>
                <TextField
                  label="Proposed title"
                  size="small"
                  fullWidth
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                />
                <EditRequestDiff
                  current={currentTask}
                  proposed={
                    proposedTitle !== currentTask.title ? { title: proposedTitle } : {}
                  }
                />
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {!isOwner && !requestEditOpen && (
          <Button onClick={() => setRequestEditOpen(true)}>Request Edit</Button>
        )}
        {!isOwner && requestEditOpen && (
          <>
            <Button onClick={() => setRequestEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitEditRequest}>
              Submit Request
            </Button>
          </>
        )}
        {isOwner && !editMode && (
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        )}
        {isOwner && editMode && (
          <>
            <Button onClick={() => setEditMode(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </>
        )}
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
