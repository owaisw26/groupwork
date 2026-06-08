import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import api from '../../services/api'
import type { Task } from '../../store/tasksSlice'

interface Member {
  id: string
  email: string
  full_name: string
}

interface ReviewStatus {
  project_status: string
  is_open: boolean
  submitted_count: number
  total_members: number
  submitted_by: string[]
  pending_members: Member[]
  reviewed_reviewee_ids: string[]
  non_submitters: string[]
  peer_review_ends_at: string | null
  deadline_passed: boolean
}

interface ReviewForm {
  contribution_quality: number
  communication: number
  reliability: number
  overall: number
  comment: string
}

interface DisputeVote {
  id: string
  user_id: string
  user_name?: string
  vote: string
}

interface TaskDispute {
  id: string
  task_id: string
  reason: string
  status: string
  outcome: string | null
  created_at: string
  votes: DisputeVote[]
  vote_summary: {
    uphold: number
    reject: number
    total_members: number
  }
  taskTitle: string
  taskStatus: string
}

const defaultForm = (): ReviewForm => ({
  contribution_quality: 3,
  communication: 3,
  reliability: 3,
  overall: 3,
  comment: '',
})

export default function PeerReviewPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<ReviewStatus | null>(null)
  const [forms, setForms] = useState<Record<string, ReviewForm>>({})
  const [taskDisputes, setTaskDisputes] = useState<TaskDispute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    const [membersRes, statusRes, meRes, tasksRes] = await Promise.all([
      api.get(`/projects/${projectId}/members`),
      api.get(`/projects/${projectId}/peer-review/status`),
      api.get('/users/me'),
      api.get<{ items: Task[] }>(`/projects/${projectId}/tasks`, { params: { limit: 100 } }),
    ])
    setMembers(membersRes.data)
    setStatus(statusRes.data)
    setCurrentUserId(meRes.data.id)

    const tasks = tasksRes.data.items ?? []
    const disputeResults = await Promise.all(
      tasks.map(async (task) => {
        try {
          const response = await api.get<{ items: Omit<TaskDispute, 'taskTitle' | 'taskStatus'>[] }>(
            `/tasks/${task.id}/disputes`,
          )
          return response.data.items.map((dispute) => ({
            ...dispute,
            taskTitle: task.title,
            taskStatus: task.status,
          }))
        } catch {
          return []
        }
      }),
    )
    setTaskDisputes(
      disputeResults
        .flat()
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    )
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const timer = window.setTimeout(() => {
      loadData().catch(() => setError('Unable to load peer review data'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData, projectId])

  const reviewTargets = members.filter((m) => m.id !== currentUserId)

  const handleSubmit = async (revieweeId: string) => {
    if (!projectId) return
    const form = forms[revieweeId] ?? defaultForm()
    setError(null)
    setSuccess(null)
    try {
      await api.post(`/projects/${projectId}/peer-review`, {
        reviewee_id: revieweeId,
        ...form,
        comment: form.comment || null,
      })
      setSuccess('Review submitted')
      await loadData()
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      setError(message ?? 'Failed to submit review')
    }
  }

  const updateForm = (revieweeId: string, field: keyof ReviewForm, value: number | string) => {
    setForms((prev) => ({
      ...prev,
      [revieweeId]: { ...(prev[revieweeId] ?? defaultForm()), [field]: value },
    }))
  }

  if (!status) {
    return <LinearProgress />
  }

  const progress = status.total_members > 0
    ? (status.submitted_count / status.total_members) * 100
    : 0

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Peer Review</Typography>
      <Typography variant="body2" color="text.secondary">
        Rate each teammate anonymously. Reviews are only shown as aggregate scores in the final report.
      </Typography>
      <Box>
        <Typography variant="caption">
          {status.submitted_count} of {status.total_members} members submitted
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5 }} />
      </Box>
      {status.is_open === false && (
        <Alert severity="info">
          Peer reviews open after the project owner marks the project complete and moves it into
          the peer review phase. Right now this project is {status.project_status ?? 'active'}.
        </Alert>
      )}
      {status.deadline_passed && (
        <Alert severity="warning">Peer review deadline has passed.</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="h6">Task Disputes</Typography>
              <Chip
                size="small"
                label={`${taskDisputes.filter((item) => item.status === 'open').length} open`}
                color={taskDisputes.some((item) => item.status === 'open') ? 'error' : 'default'}
              />
            </Box>
            {taskDisputes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No task disputes have been filed.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {taskDisputes.map((dispute) => (
                  <Box
                    key={dispute.id}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: '#FFFFFF',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography
                        component={RouterLink}
                        to={`/projects/${projectId}/tasks`}
                        sx={{
                          fontWeight: 700,
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {dispute.taskTitle}
                      </Typography>
                      <Chip
                        size="small"
                        label={dispute.status === 'resolved' ? `resolved: ${dispute.outcome}` : 'open'}
                        color={dispute.status === 'open' ? 'error' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {dispute.reason}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      Task status: {dispute.taskStatus.replace('_', ' ')} · Votes:{' '}
                      {dispute.vote_summary.uphold} uphold / {dispute.vote_summary.reject} reject
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
      {reviewTargets.map((member) => {
        const form = forms[member.id] ?? defaultForm()
        const alreadyReviewed = (status.reviewed_reviewee_ids ?? []).includes(member.id)
        const canSubmit = status.is_open === true && !status.deadline_passed && !alreadyReviewed
        return (
          <Card key={member.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">{member.full_name}</Typography>
              {alreadyReviewed && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Review submitted
                </Typography>
              )}
              {canSubmit && (
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {(['contribution_quality', 'communication', 'reliability', 'overall'] as const).map(
                    (field) => (
                      <Box key={field}>
                        <Typography variant="caption">
                          {field.replace('_', ' ')}
                        </Typography>
                        <Rating
                          value={form[field]}
                          onChange={(_, v) => updateForm(member.id, field, v ?? 3)}
                        />
                      </Box>
                    ),
                  )}
                  <TextField
                    label="Comment (optional)"
                    multiline
                    rows={2}
                    size="small"
                    value={form.comment}
                    onChange={(e) => updateForm(member.id, 'comment', e.target.value)}
                  />
                  <Button variant="contained" onClick={() => handleSubmit(member.id)}>
                    Submit Review
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}
