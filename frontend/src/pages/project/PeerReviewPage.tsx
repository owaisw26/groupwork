import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'

interface Member {
  id: string
  email: string
  full_name: string
}

interface ReviewStatus {
  submitted_count: number
  total_members: number
  submitted_by: string[]
  pending_members: Member[]
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    Promise.all([
      api.get(`/projects/${projectId}/members`),
      api.get(`/projects/${projectId}/peer-review/status`),
      api.get('/users/me'),
    ])
      .then(([membersRes, statusRes, meRes]) => {
        setMembers(membersRes.data)
        setStatus(statusRes.data)
        setCurrentUserId(meRes.data.id)
      })
      .catch(() => setError('Unable to load peer review data'))
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    const [membersRes, statusRes, meRes] = await Promise.all([
      api.get(`/projects/${projectId}/members`),
      api.get(`/projects/${projectId}/peer-review/status`),
      api.get('/users/me'),
    ])
    setMembers(membersRes.data)
    setStatus(statusRes.data)
    setCurrentUserId(meRes.data.id)
  }

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
    } catch {
      setError('Failed to submit review')
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
      {status.deadline_passed && (
        <Alert severity="warning">Peer review deadline has passed.</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {reviewTargets.map((member) => {
        const form = forms[member.id] ?? defaultForm()
        const isPending = status.pending_members.some((m) => m.id === member.id)
        return (
          <Card key={member.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">{member.full_name}</Typography>
              {!isPending && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Review submitted
                </Typography>
              )}
              {isPending && !status.deadline_passed && (
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
