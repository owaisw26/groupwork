import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined'
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PRIMARY, fs, SLATE, SURFACE_CARD_SX } from '../appTheme'
import TaskDetailModal from '../components/TaskDetailModal'
import PageHeader from '../components/layout/PageHeader'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchProjects } from '../store/projectsSlice'
import { fetchMyTasks, type Task } from '../store/tasksSlice'

const PAGE_SIZE = 8

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  todo: {
    label: 'To Do',
    bg: '#F1F5F9',
    color: '#64748B',
    icon: <RadioButtonUncheckedOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  in_progress: {
    label: 'In Progress',
    bg: '#EFF6FF',
    color: '#2563EB',
    icon: <PlayCircleOutlineOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  review: {
    label: 'Review',
    bg: '#FFFBEB',
    color: '#D97706',
    icon: <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  done: {
    label: 'Done',
    bg: '#DCFCE7',
    color: '#16A34A',
    icon: <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />,
  },
}

const PRIORITY_DOT: Record<string, string> = {
  low: '#22C55E',
  medium: '#F97316',
  high: '#EF4444',
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.25,
        py: 0.4,
        borderRadius: '20px',
        bgcolor: cfg.bg,
        color: cfg.color,
        fontSize: fs(12),
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </Box>
  )
}

function RowMenu({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        sx={{ color: SLATE[400] }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => { setAnchor(null); onOpen() }}>Open task</MenuItem>
        <MenuItem onClick={() => { setAnchor(null); navigate(`/projects/${task.project_id}/tasks`) }}>
          Go to project
        </MenuItem>
      </Menu>
    </>
  )
}

export default function MyTasksPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { myTasks, myTasksLoading } = useAppSelector((state) => state.tasks)
  const projects = useAppSelector((state) => state.projects.items)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchProjects())
    dispatch(fetchMyTasks())
  }, [dispatch])

  const getProjectOwnerId = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.owner_id ?? ''

  const filtered = useMemo(() => {
    let list = [...myTasks]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.project_name ?? '').toLowerCase().includes(q),
      )
    }
    if (sortBy === 'oldest') list.reverse()
    if (sortBy === 'due_date') list.sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)
    return list
  }, [myTasks, search, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const visibleTasks = filtered.slice(start, start + PAGE_SIZE)
  const selectedTask = useMemo(
    () => myTasks.find((task) => task.id === selectedTaskId) ?? null,
    [myTasks, selectedTaskId],
  )

  if (myTasksLoading && myTasks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="My Tasks"
        subtitle="All tasks assigned to you across every project."
      />

      <Box sx={SURFACE_CARD_SX}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search tasks..."
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
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
            sx={{ minWidth: 160, borderRadius: '10px', fontSize: fs(13) }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="due_date">Due date</MenuItem>
          </Select>
        </Box>

        {myTasks.length === 0 ? (
          <Typography color="text.secondary">No tasks assigned to you yet.</Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic', py: 2 }}>
            No tasks match your search.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: SLATE[700], fontSize: fs(13) }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: SLATE[700], fontSize: fs(13) }}>Project</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: SLATE[700], fontSize: fs(13) }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: SLATE[700], fontSize: fs(13) }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: SLATE[700], fontSize: fs(13) }}>Due Date</TableCell>
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      hover
                      sx={{ cursor: 'pointer', '& td': { py: 1.75 } }}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <TableCell sx={{ fontWeight: 700, fontSize: fs(14), color: SLATE[900] }}>
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{ fontSize: fs(14), color: APP_PRIMARY, fontWeight: 600, cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${task.project_id}/tasks`) }}
                        >
                          {task.project_name ?? task.project_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            sx={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              bgcolor: PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.medium,
                            }}
                          />
                          <Typography sx={{ fontSize: fs(14), color: SLATE[700], textTransform: 'capitalize' }}>
                            {task.priority}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: SLATE[400] }} />
                            <Typography sx={{ fontSize: fs(14), color: SLATE[700] }}>{task.due_date}</Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: SLATE[400] }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: '0 !important' }}>
                        <RowMenu task={task} onOpen={() => setSelectedTaskId(task.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, px: 0.5 }}>
              <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                Showing {start + 1} to {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} task{filtered.length !== 1 ? 's' : ''}
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
          </>
        )}
      </Box>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          initialTask={selectedTask}
          projectOwnerId={getProjectOwnerId(selectedTask?.project_id ?? '')}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </Box>
  )
}
