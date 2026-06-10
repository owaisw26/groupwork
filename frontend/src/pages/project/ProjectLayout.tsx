import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
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
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, PAGE_CARD_SX, SLATE } from '../../appTheme'
import { PRIORITY_OPTIONS, PRIORITY_STYLES } from '../../constants/taskFields'
import { useHeaderBridge } from '../../contexts/HeaderBridgeContext'
import PageHeader from '../../components/layout/PageHeader'
import StatCard from '../../components/layout/StatCard'
import api from '../../services/api'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createTask } from '../../store/tasksSlice'
import { completeProject, fetchDashboard, fetchProject } from '../../store/projectsSlice'
import { getTodayDateInputValue } from '../../utils/dateInput'

interface ProjectMember {
  id: string
  full_name: string
}

const createDialogPaperSx = {
  borderRadius: '18px',
  border: `1px solid ${APP_BORDER}`,
  boxShadow: '0 28px 70px rgba(15, 23, 42, 0.22)',
}

const createFieldSx = {
  '& .MuiInputLabel-root': {
    color: SLATE[700],
    fontWeight: 800,
    fontSize: fs(12),
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
    '& fieldset': { borderColor: APP_BORDER },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: APP_PRIMARY, borderWidth: 1.5 },
  },
  '& .MuiFormHelperText-root': {
    ml: 0,
    mt: 0.75,
    color: SLATE[500],
    fontSize: fs(10),
  },
}

const TABS = [
  { label: 'Task Board', path: 'tasks' },
  { label: 'Meetings', path: 'meetings' },
  { label: 'Members', path: 'members' },
  { label: 'Evidence', path: 'evidence' },
  { label: 'Disputes', path: 'disputes' },
  { label: 'Peer Review', path: 'peer-review' },
  { label: 'Settings', path: 'settings' },
  { label: 'Report', path: 'report' },
]

function formatDueDateSubtitle(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined
  const due = new Date(`${dueDate}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  return `${diff} days remaining`
}

function formatProjectStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

export default function ProjectLayout() {
  const { id } = useParams()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { currentProject, dashboard, items: projects, isLoading } = useAppSelector((state) => state.projects)
  const user = useAppSelector((state) => state.auth.user)
  const tasks = useAppSelector((state) => state.tasks.items)
  const { setCreateTaskHandler } = useHeaderBridge()
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState(getTodayDateInputValue)
  const [newPriority, setNewPriority] = useState('medium')
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [finishSubmitting, setFinishSubmitting] = useState(false)
  const project = useMemo(
    () => {
      if (!id) return null
      return currentProject?.id === id
        ? currentProject
        : projects.find((item) => item.id === id) ?? null
    },
    [currentProject, id, projects],
  )

  useEffect(() => {
    if (id) {
      dispatch(fetchProject(id))
      api
        .get<ProjectMember[]>(`/projects/${id}/members`)
        .then((response) => setMembers(response.data))
        .catch(() => setMembers([]))
    }
  }, [dispatch, id])

  useEffect(() => {
    if (!dashboard) {
      dispatch(fetchDashboard())
    }
  }, [dashboard, dispatch])

  useEffect(() => {
    const prefetchTabs = () => {
      void import('./ActivityTab')
      void import('./MeetingsTab')
      void import('./MembersTab')
      void import('./EvidenceTab')
      void import('./DisputesPage')
      void import('./PeerReviewPage')
      void import('./ProjectSettingsPage')
      void import('./ReportPreviewPage')
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchTabs)
      return () => window.cancelIdleCallback(id)
    }

    const timeoutId = globalThis.setTimeout(prefetchTabs, 500)
    return () => globalThis.clearTimeout(timeoutId)
  }, [])

  const resetCreateForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewDueDate(getTodayDateInputValue())
    setNewPriority('medium')
    setNewAssigneeIds(user?.id ? [user.id] : [])
  }

  const openCreateDialog = useCallback(() => {
    setNewTitle('')
    setNewDescription('')
    setNewDueDate(getTodayDateInputValue())
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
  const isProjectOwner = Boolean(user && project?.owner_id === user.id)
  const canFinishProject = isProjectOwner && project?.status === 'active'

  const handleCreate = async () => {
    if (!id || !newTitle.trim()) return
    const assigneeIds = newAssigneeIds.length > 0 ? newAssigneeIds : user?.id ? [user.id] : []
    setCreateError(null)
    try {
      await dispatch(
        createTask({
          projectId: id,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          priority: newPriority,
          due_date: newDueDate || undefined,
          assignee_ids: assigneeIds,
        }),
      ).unwrap()
      resetCreateForm()
      setCreateOpen(false)
    } catch (error) {
      setCreateError(typeof error === 'string' ? error : 'Failed to create task')
    }
  }

  const handleCloseCreate = () => {
    resetCreateForm()
    setCreateError(null)
    setCreateOpen(false)
  }

  const handleAssigneeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setNewAssigneeIds(typeof value === 'string' ? value.split(',') : value)
  }

  const handleFinishProject = async () => {
    if (!id || finishSubmitting) return
    setFinishSubmitting(true)
    setFinishError(null)
    try {
      await dispatch(completeProject(id)).unwrap()
      setFinishOpen(false)
      dispatch(fetchDashboard())
    } catch (error) {
      setFinishError(typeof error === 'string' ? error : 'Failed to mark project as finished')
    } finally {
      setFinishSubmitting(false)
    }
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

  if (!project && isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!project) {
    return <Alert severity="info">Project is unavailable.</Alert>
  }

  return (
    <Box>
      <PageHeader
        title={project.name}
        subtitle={project.description ?? undefined}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {canFinishProject && (
              <Button
                variant="contained"
                startIcon={<CheckCircleOutlineOutlinedIcon />}
                onClick={() => {
                  setFinishError(null)
                  setFinishOpen(true)
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Mark Finished
              </Button>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={formatProjectStatus(project.status)}
                sx={{
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  bgcolor: APP_PRIMARY_LIGHT,
                  color: APP_PRIMARY,
                }}
              />
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 34, height: 34, fontSize: fs(14) } }}>
                {Array.from({ length: project.member_count ?? 1 }).map((_, index) => (
                  <Avatar key={index} sx={{ bgcolor: SLATE[300], color: SLATE[700] }} />
                ))}
              </AvatarGroup>
            </Box>
          </Box>
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
          value={String(project.member_count ?? 1)}
          actionLabel="View members"
          actionTo={`/projects/${id}/members`}
          footer={
            <AvatarGroup
              max={5}
              sx={{
                mt: 0.5,
                '& .MuiAvatar-root': {
                  width: 24,
                  height: 24,
                  fontSize: fs(11),
                  bgcolor: SLATE[300],
                  color: SLATE[700],
                },
              }}
            >
              {Array.from({ length: project.member_count ?? 1 }).map((_, index) => (
                <Avatar key={index}>{String.fromCharCode(65 + index)}</Avatar>
              ))}
            </AvatarGroup>
          }
        />
        <StatCard
          icon={<CalendarTodayOutlinedIcon fontSize="small" />}
          label="Due Date"
          value={project.due_date ?? 'Not set'}
          subtitle={formatDueDateSubtitle(project.due_date)}
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
              sx={{ mt: 0.5, height: 5, borderRadius: 999 }}
            />
          }
        />
        <StatCard
          icon={<GavelOutlinedIcon fontSize="small" />}
          label="Active Disputes"
          value={String(disputeCount)}
          actionLabel="View disputes"
          actionTo={`/projects/${id}/disputes`}
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

      <Dialog
        open={createOpen}
        onClose={handleCloseCreate}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: createDialogPaperSx } }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.75, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: APP_PRIMARY_LIGHT,
                color: APP_PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AssignmentOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography component="h2" sx={{ fontSize: fs(22), fontWeight: 900, color: SLATE[900], lineHeight: 1.15 }}>
                Create Task
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: fs(11), color: SLATE[500], fontWeight: 600 }}>
                Add work to the board with owners, importance, and deadline.
              </Typography>
            </Box>
          </Box>
          <IconButton
            aria-label="Close"
            onClick={handleCloseCreate}
            sx={{ color: SLATE[500], borderRadius: '10px' }}
          >
            <CloseOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 0 }}>
          <Stack spacing={2.1} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              helperText="Use a clear action name for the task."
              sx={createFieldSx}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              helperText="Add context, deliverables, or evidence expectations."
              sx={createFieldSx}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl size="small" sx={createFieldSx}>
                <InputLabel id="create-task-priority-label" shrink>Priority</InputLabel>
                <Select
                  labelId="create-task-priority-label"
                  label="Priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  notched
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {PRIORITY_STYLES[option].label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Choose how urgent this work is.</FormHelperText>
              </FormControl>
              <TextField
                label="Due Date"
                type="date"
                size="small"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                helperText="Set when this task should be completed."
                slotProps={{ inputLabel: { shrink: true } }}
                sx={createFieldSx}
              />
            </Box>
            <FormControl size="small" sx={createFieldSx}>
              <InputLabel id="create-task-assignees-label" shrink>Assignees</InputLabel>
              <Select
                labelId="create-task-assignees-label"
                label="Assignees"
                multiple
                value={newAssigneeIds}
                onChange={handleAssigneeChange}
                input={<OutlinedInput label="Assignees" notched />}
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
              <FormHelperText>Assign the teammate responsible for this task.</FormHelperText>
            </FormControl>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: '10px',
                border: `1px solid #BFDBFE`,
                bgcolor: APP_PRIMARY_LIGHT,
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  color: APP_PRIMARY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TaskAltOutlinedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: fs(12), fontWeight: 900, color: SLATE[800] }}>
                  Task visibility
                </Typography>
                <Typography sx={{ fontSize: fs(10), color: SLATE[500], fontWeight: 600 }}>
                  This task will appear on the shared project board.
                </Typography>
              </Box>
            </Box>
            {createError && (
              <Typography sx={{ fontSize: fs(11), color: '#DC2626', fontWeight: 700 }}>
                {createError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, mt: 2, borderTop: `1px solid ${APP_BORDER}` }}>
          <Button
            onClick={handleCloseCreate}
            sx={{
              borderRadius: '10px',
              px: 2.25,
              color: SLATE[700],
              border: `1px solid ${APP_BORDER}`,
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newTitle.trim()}
            sx={{ borderRadius: '10px', px: 2.5, fontWeight: 900, textTransform: 'none' }}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={finishOpen} onClose={() => !finishSubmitting && setFinishOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Mark Project Finished?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              This will close active task work for "{project.name}" and move the project into peer review.
            </DialogContentText>
            {finishError && <Alert severity="error">{finishError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={finishSubmitting} onClick={() => setFinishOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={finishSubmitting} onClick={handleFinishProject}>
            {finishSubmitting ? 'Finishing...' : 'Mark Finished'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
