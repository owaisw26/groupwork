import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import {
  Alert,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import api from '../../services/api'
import { useAppDispatch } from '../../store/hooks'
import { fetchProjectTasks } from '../../store/tasksSlice'
import type { Task } from '../../store/tasksSlice'

const PAGE_SIZE = 10

interface Member {
  id: string
  full_name: string
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
  filed_by: string
  reason: string
  status: string
  outcome: string | null
  created_at: string
  resolved_at: string | null
  votes: DisputeVote[]
  vote_summary: { uphold: number; reject: number; total_members: number }
  taskTitle: string
  taskStatus: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function DisputeRowMenu({
  canResolve,
  onResolve,
  onView,
}: { canResolve: boolean; onResolve: () => void; onView: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <IconButton
        size="small"
        aria-label="Dispute actions"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ color: SLATE[400] }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onView() }}>Go to task</MenuItem>
        {canResolve && (
          <MenuItem onClick={() => { setAnchor(null); onResolve() }} sx={{ color: '#16A34A' }}>
            Mark resolved
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default function DisputesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [taskDisputes, setTaskDisputes] = useState<TaskDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [meRes, tasksRes, membersRes] = await Promise.all([
      api.get('/users/me'),
      api.get<{ items: Task[] }>(`/projects/${projectId}/tasks`, { params: { limit: 100 } }),
      api.get<Member[]>(`/projects/${projectId}/members`),
    ])
    setCurrentUserId(meRes.data.id)
    setMembers(membersRes.data)

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
    setTaskDisputes(disputeResults.flat().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)))
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const timer = window.setTimeout(() => {
      loadData().catch(() => { setError('Unable to load disputes'); setLoading(false) })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData, projectId])

  const handleResolve = async (disputeId: string) => {
    if (!projectId) return
    setError(null)
    try {
      await api.post(`/disputes/${disputeId}/resolve`)
      dispatch(fetchProjectTasks(projectId))
      await loadData()
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      setError(message ?? 'Failed to resolve dispute')
    }
  }

  const getMemberName = (userId: string) =>
    members.find((m) => m.id === userId)?.full_name ?? 'Unknown'

  const filtered = useMemo(() => {
    let list = taskDisputes
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) =>
        d.taskTitle.toLowerCase().includes(q) || d.reason.toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'all') list = list.filter((d) => d.status === statusFilter)
    if (sortBy === 'oldest') list = [...list].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    return list
  }, [taskDisputes, search, statusFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const openCount = taskDisputes.filter((d) => d.status === 'open').length
  const resolvedCount = taskDisputes.filter((d) => d.status === 'resolved').length

  if (loading) return <LinearProgress />

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: fs(22), fontWeight: 800, color: SLATE[900] }}>Disputes</Typography>
          <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
            Review task disputes and resolve the ones you raised.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', bgcolor: '#FFF7ED', color: '#C2410C', fontSize: fs(13), fontWeight: 700 }}>
            {openCount} open
          </Box>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', bgcolor: '#F0FDF4', color: '#16A34A', fontSize: fs(13), fontWeight: 700 }}>
            {resolvedCount} resolved
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={SURFACE_CARD_SX}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search disputes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon sx={{ fontSize: 18, color: SLATE[400] }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            sx={{ minWidth: 130, borderRadius: '10px', fontSize: fs(13) }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </Select>
          <Select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 140, borderRadius: '10px', fontSize: fs(13) }}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </Select>
        </Box>

        {visible.length === 0 ? (
          <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic', py: 2 }}>
            No disputes found.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {visible.map((dispute) => {
              const canResolve = dispute.status === 'open' && dispute.filed_by === currentUserId
              const isResolved = dispute.status === 'resolved'
              return (
                <Box key={dispute.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2 }}>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '12px',
                      bgcolor: APP_PRIMARY_LIGHT, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 22, color: APP_PRIMARY }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      onClick={() => navigate(`/projects/${projectId}/tasks`)}
                      sx={{ fontSize: fs(15), fontWeight: 700, color: APP_PRIMARY, cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, mb: 0.35 }}
                    >
                      {dispute.taskTitle}
                    </Typography>
                    <Typography sx={{ fontSize: fs(13), color: SLATE[700], mb: 0.5 }}>
                      {dispute.reason}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                        Task status: {dispute.taskStatus.replace('_', ' ')}
                      </Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[300] }}>•</Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                        Raised by {getMemberName(dispute.filed_by)}
                      </Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[300] }}>•</Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                        {formatDateTime(dispute.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75, flexShrink: 0 }}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1.25, py: 0.35, borderRadius: '20px',
                        bgcolor: isResolved ? '#F0FDF4' : '#FFF7ED',
                        color: isResolved ? '#16A34A' : '#C2410C',
                        fontSize: fs(12), fontWeight: 700,
                      }}
                    >
                      {isResolved && <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 14 }} />}
                      {isResolved ? 'Resolved' : 'Open'}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        onClick={() => navigate(`/projects/${projectId}/tasks`)}
                        sx={{ fontSize: fs(13), fontWeight: 700, color: APP_PRIMARY, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      >
                        View details
                      </Typography>
                      <DisputeRowMenu
                        canResolve={canResolve}
                        onResolve={() => handleResolve(dispute.id)}
                        onView={() => navigate(`/projects/${projectId}/tasks`)}
                      />
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, pt: 2, borderTop: `1px solid ${APP_BORDER}` }}>
          <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
            Showing {filtered.length} dispute{filtered.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              sx={{ border: `1px solid ${SLATE[200]}`, borderRadius: '8px', width: 32, height: 32 }}
            >
              <Typography sx={{ fontSize: fs(14), fontWeight: 700 }}>‹</Typography>
            </IconButton>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Box
                key={p}
                onClick={() => setPage(p)}
                sx={{
                  width: 32, height: 32, borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: fs(13), fontWeight: 700,
                  border: `1px solid ${p === page ? APP_PRIMARY : SLATE[200]}`,
                  color: p === page ? APP_PRIMARY : SLATE[600],
                  bgcolor: p === page ? '#EFF6FF' : 'transparent',
                }}
              >
                {p}
              </Box>
            ))}
            <IconButton
              size="small"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              sx={{ border: `1px solid ${SLATE[200]}`, borderRadius: '8px', width: 32, height: 32 }}
            >
              <Typography sx={{ fontSize: fs(14), fontWeight: 700 }}>›</Typography>
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Stack>
  )
}
