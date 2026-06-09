import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAppDispatch } from '../../store/hooks'
import { fetchProjectTasks } from '../../store/tasksSlice'
import type { Task } from '../../store/tasksSlice'

interface DisputeVote {
  id: string
  user_id: string
  user_name?: string
  vote: string
}

interface TaskDispute {
  id: string
  task_id: string
  filed_by: string
  reason: string
  status: string
  outcome: string | null
  created_at: string
  resolved_at: string | null
  votes: DisputeVote[]
  vote_summary: {
    uphold: number
    reject: number
    total_members: number
  }
  taskTitle: string
  taskStatus: string
}

export default function DisputesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [taskDisputes, setTaskDisputes] = useState<TaskDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [meRes, tasksRes] = await Promise.all([
      api.get('/users/me'),
      api.get<{ items: Task[] }>(`/projects/${projectId}/tasks`, { params: { limit: 100 } }),
    ])
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
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const timer = window.setTimeout(() => {
      loadData().catch(() => {
        setError('Unable to load task disputes')
        setLoading(false)
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData, projectId])

  const handleResolveDispute = async (disputeId: string) => {
    if (!projectId) return
    setError(null)
    setSuccess(null)
    try {
      await api.post(`/disputes/${disputeId}/resolve`)
      setSuccess('Dispute resolved')
      dispatch(fetchProjectTasks(projectId))
      await loadData()
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      setError(message ?? 'Failed to resolve dispute')
    }
  }

  if (loading) {
    return <LinearProgress />
  }

  const openCount = taskDisputes.filter((item) => item.status === 'open').length

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="h5">Disputes</Typography>
          <Typography variant="body2" color="text.secondary">
            Review task disputes and resolve the ones you raised.
          </Typography>
        </Box>
        <Chip
          size="small"
          label={`${openCount} open`}
          color={openCount > 0 ? 'error' : 'default'}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card variant="outlined">
        <CardContent>
          {taskDisputes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No task disputes have been filed.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {taskDisputes.map((dispute) => {
                const canResolve = dispute.status === 'open' && dispute.filed_by === currentUserId
                return (
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
                        label={dispute.status === 'resolved' ? 'resolved' : 'open'}
                        color={dispute.status === 'open' ? 'error' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {dispute.reason}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      Task status: {dispute.taskStatus.replace('_', ' ')}
                    </Typography>
                    {canResolve && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        sx={{ mt: 1.25 }}
                        onClick={() => handleResolveDispute(dispute.id)}
                      >
                        Dispute resolved
                      </Button>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
