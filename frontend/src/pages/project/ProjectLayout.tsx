import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  OutlinedInput,
  Select,
  type SelectChangeEvent,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { APP_PRIMARY, APP_PRIMARY_LIGHT, fs, PAGE_CARD_SX, SLATE } from '../../appTheme'
import { PRIORITY_OPTIONS, PRIORITY_STYLES } from '../../constants/taskFields'
import { useHeaderBridge } from '../../contexts/HeaderBridgeContext'
import PageHeader from '../../components/layout/PageHeader'
import StatCard from '../../components/layout/StatCard'
import api from '../../services/api'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createTask } from '../../store/tasksSlice'
import { fetchDashboard, fetchProject } from '../../store/projectsSlice'

interface ProjectMember {
  id: string
  full_name: string
}

const TABS = [
  { label: 'Task Board', path: 'tasks' },
  { label: 'Meetings', path: 'meetings' },
  { label: 'Members', path: 'members' },
  { label: 'Evidence', path: 'evidence' },
  { label: 'Peer Review', path: 'peer-review' },
  { label: 'Settings', path: 'settings' },
  { label: 'Report', path: 'report' },
]

function formatDueDateSubtitle(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined
  const due = new Date(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  return `${diff} days remaining`
}

export default function ProjectLayout() {
  const { id } = useParams()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { currentProject, isLoading } = useAppSelector((state) => state.projects)
  const user = useAppSelector((state) => state.auth.user)
  const tasks = useAppSelector((state) => state.tasks.items)
  const { setCreateTaskHandler } = useHeaderBridge()
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])

  useEffect(() => {
    if (id) {
      dispatch(fetchProject(id))
      dispatch(fetchDashboard())
      api
        .get<ProjectMember[]>(`/projects/${id}/members`)
        .then((response) => setMembers(response.data))
        .catch(() => setMembers([]))
    }
  }, [dispatch, id])

  const resetCreateForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewDueDate('')
    setNewPriority('medium')
    setNewAssigneeIds(user?.id ? [user.id] : [])
  }

  const openCreateDialog = useCallback(() => {
    setNewTitle('')
    setNewDescription('')
    setNewDueDate('')
    setNewPriority('medium')
    setNewAssigneeIds(user?.id ? [user.id] : [])
    setCreateOpen(true)
  }, [user])

  const projectTasks = useMemo(
    () => (id ? tasks.filter((task) => task.project_id === id) : []),
    [id, tasks],
  )

  const verifiedCount = projectTasks.filter((task) => task.verification_status === 'verified').length
  const disputeCount = projectTasks.filter((task) => task.verification_status === 'disputed').length
  const totalTasks = projectTasks.length
  const verifiedRatio = totalTasks > 0 ? Math.round((verifiedCount / totalTasks) * 100) : 0

  const handleCreate = async () => {
    if (!id || !newTitle.trim()) return
    const assigneeIds = newAssigneeIds.length > 0 ? newAssigneeIds : user?.id ? [user.id] : []
    await dispatch(
      createTask({
        projectId: id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        due_date: newDueDate || undefined,
        assignee_ids: assigneeIds,
      }),
    )
    resetCreateForm()
    setCreateOpen(false)
  }

  const handleCloseCreate = () => {
    resetCreateForm()
    setCreateOpen(false)
  }

  const handleAssigneeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setNewAssigneeIds(typeof value === 'string' ? value.split(',') : value)
  }

  const activeTab =
    TABS.find((tab) => location.pathname.endsWith(`/${tab.path}`))?.path ?? 'tasks'
  const isTaskBoard = activeTab === 'tasks'

  useEffect(() => {
    if (isTaskBoard) {
      setCreateTaskHandler(() => openCreateDialog)
    } else {
      setCreateTaskHandler(null)
    }
    return () => setCreateTaskHandler(null)
  }, [isTaskBoard, setCreateTaskHandler, openCreateDialog])

  if (isLoading || !currentProject || currentProject.id !== id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={currentProject.name}
        subtitle={currentProject.description ?? undefined}
        actions={
          !isTaskBoard ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={currentProject.status}
                sx={{
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  bgcolor: APP_PRIMARY_LIGHT,
                  color: APP_PRIMARY,
                }}
              />
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 34, height: 34, fontSize: fs(14) } }}>
                {Array.from({ length: currentProject.member_count ?? 1 }).map((_, index) => (
                  <Avatar key={index} sx={{ bgcolor: SLATE[300], color: SLATE[700] }} />
                ))}
              </AvatarGroup>
            </Box>
          ) : undefined
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          icon={<PeopleOutlinedIcon fontSize="small" />}
          label="Members"
          value={String(currentProject.member_count ?? 1)}
          actionLabel="View members"
          actionTo={`/projects/${id}/members`}
          footer={
            <AvatarGroup
              max={5}
              sx={{
                mt: 1,
                '& .MuiAvatar-root': {
                  width: 28,
                  height: 28,
                  fontSize: fs(12),
                  bgcolor: SLATE[300],
                  color: SLATE[700],
                },
              }}
            >
              {Array.from({ length: currentProject.member_count ?? 1 }).map((_, index) => (
                <Avatar key={index}>{String.fromCharCode(65 + index)}</Avatar>
              ))}
            </AvatarGroup>
          }
        />
        <StatCard
          icon={<CalendarTodayOutlinedIcon fontSize="small" />}
          label="Due Date"
          value={currentProject.due_date ?? 'Not set'}
          subtitle={formatDueDateSubtitle(currentProject.due_date)}
          actionLabel="Project settings"
          actionTo={`/projects/${id}/settings`}
          accent="#D97706"
        />
        <StatCard
          icon={<TaskAltOutlinedIcon fontSize="small" />}
          label="Verified Tasks"
          value={`${verifiedCount} / ${totalTasks || '—'}`}
          actionLabel="Open task board"
          actionTo={`/projects/${id}/tasks`}
          accent="#16A34A"
          footer={
            <LinearProgress
              variant="determinate"
              value={verifiedRatio}
              color="success"
              sx={{ mt: 1 }}
            />
          }
        />
        <StatCard
          icon={<GavelOutlinedIcon fontSize="small" />}
          label="Active Disputes"
          value={String(disputeCount)}
          actionLabel="View disputes"
          actionTo={`/projects/${id}/peer-review`}
          accent="#DC2626"
        />
      </Box>

      {!isTaskBoard && (
        <Box sx={{ ...PAGE_CARD_SX, px: { xs: 1, md: 2 }, mb: 3 }}>
          <Tabs value={activeTab} variant="scrollable" scrollButtons="auto">
            {TABS.map((tab) => (
              <Tab
                key={tab.path}
                label={tab.label}
                value={tab.path}
                component={Link}
                to={`/projects/${id}/${tab.path}`}
              />
            ))}
          </Tabs>
        </Box>
      )}

      <Outlet context={{ openCreateTask: openCreateDialog }} />

      <Dialog open={createOpen} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl fullWidth>
              <InputLabel id="create-task-priority-label">Priority</InputLabel>
              <Select
                labelId="create-task-priority-label"
                label="Priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {PRIORITY_STYLES[option].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="create-task-assignees-label">Assignees</InputLabel>
              <Select
                labelId="create-task-assignees-label"
                label="Assignees"
                multiple
                value={newAssigneeIds}
                onChange={handleAssigneeChange}
                input={<OutlinedInput label="Assignees" />}
                renderValue={(selected) =>
                  selected
                    .map((memberId) => members.find((member) => member.id === memberId)?.full_name ?? memberId)
                    .join(', ')
                }
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseCreate}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
