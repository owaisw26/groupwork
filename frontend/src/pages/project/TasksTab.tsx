import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import AddIcon from '@mui/icons-material/Add'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useOutletContext, useParams } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import TaskCard from '../../components/TaskCard'
import TaskDetailModal from '../../components/TaskDetailModal'
import api from '../../services/api'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchProjectTasks,
  TASK_STATUSES,
  updateTaskStatus,
  type Task,
  type TaskStatus,
} from '../../store/tasksSlice'

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: SLATE[500],
  in_progress: APP_PRIMARY,
  review: '#D97706',
  done: '#16A34A',
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  time_logged: <ScheduleOutlinedIcon sx={{ fontSize: fs(16) }} />,
  meeting_note: <NoteAltOutlinedIcon sx={{ fontSize: fs(16) }} />,
  task_created: <AddIcon sx={{ fontSize: fs(16) }} />,
  task_updated: <HistoryOutlinedIcon sx={{ fontSize: fs(16) }} />,
}

interface ProjectMember {
  id: string
  full_name: string
}

interface TasksOutletContext {
  openCreateTask?: () => void
}

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  members,
  projectDueDate,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  members: ProjectMember[]
  projectDueDate?: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 520,
        bgcolor: isOver ? APP_PRIMARY_LIGHT : '#FFFFFF',
        border: `1px solid ${isOver ? APP_PRIMARY : '#E2E8F0'}`,
        borderRadius: '18px',
        boxShadow: '0 18px 48px rgba(15, 23, 42, 0.11)',
        transition: 'background-color 0.2s, border-color 0.2s',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.25,
          py: 2.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {status === 'done' && (
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 22, color: '#16A34A' }} />
          )}
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: SLATE[900] }}>
            {STATUS_LABELS[status]}
          </Typography>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              bgcolor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: STATUS_COLORS[status],
            }}
          >
            {tasks.length}
          </Box>
        </Box>
        <IconButton
          size="small"
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
          onClick={onAddTask}
          sx={{ color: SLATE[500] }}
        >
          <AddIcon sx={{ fontSize: 21 }} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, px: 2.25, pb: 1.5, overflowY: 'auto' }}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            projectDueDate={projectDueDate}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </Box>

      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Button
          fullWidth
          startIcon={<AddIcon />}
          onClick={onAddTask}
          sx={{
            justifyContent: 'flex-start',
            color: SLATE[500],
            fontWeight: 600,
            fontSize: fs(13),
            py: 1,
            '&:hover': { bgcolor: SLATE[50], color: APP_PRIMARY },
          }}
        >
          Add task
        </Button>
      </Box>
    </Paper>
  )
}

export default function TasksTab() {
  const { id: projectId } = useParams()
  const { openCreateTask } = useOutletContext<TasksOutletContext>()
  const dispatch = useAppDispatch()
  const { items, isLoading } = useAppSelector((state) => state.tasks)
  const { dashboard } = useAppSelector((state) => state.projects)
  const currentProject = useAppSelector((state) =>
    state.projects.items.find((p) => p.id === projectId) ?? state.projects.currentProject,
  )

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectTasks(projectId))
      api
        .get<ProjectMember[]>(`/projects/${projectId}/members`)
        .then((response) => setMembers(response.data))
        .catch(() => setMembers([]))
    }
  }, [dispatch, projectId])

  const reviewTasks = useMemo(
    () => items.filter((task) => task.status === 'review' || task.verification_status === 'pending'),
    [items],
  )

  const featuredReviewTask = reviewTasks[0] ?? null

  const projectActivity = useMemo(
    () =>
      (dashboard?.recent_activity ?? []).filter((item) => item.project_id === projectId).slice(0, 5),
    [dashboard?.recent_activity, projectId],
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = items.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id)
    const newStatus = String(over.id)
    if (!TASK_STATUSES.includes(newStatus as TaskStatus)) return

    const task = items.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      dispatch(updateTaskStatus({ taskId, status: newStatus }))
    }
  }

  const handleVerify = async (taskId: string) => {
    await api.post(`/tasks/${taskId}/verify`)
    if (projectId) {
      dispatch(fetchProjectTasks(projectId))
    }
  }

  const handleDispute = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  if (isLoading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, xl: 9 }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Grid container spacing={2}>
            {TASK_STATUSES.map((status) => (
              <Grid key={status} size={{ xs: 12, sm: 6, lg: 3 }}>
                <KanbanColumn
                  status={status}
                  tasks={items.filter((t) => t.status === status)}
                  members={members}
                  projectDueDate={currentProject?.due_date}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onAddTask={() => openCreateTask?.()}
                />
              </Grid>
            ))}
          </Grid>
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                members={members}
                projectDueDate={currentProject?.due_date}
                onClick={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Grid>

      <Grid size={{ xs: 12, xl: 3 }}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              ...SURFACE_CARD_SX,
              borderStyle: featuredReviewTask ? 'dashed' : 'solid',
              borderColor: featuredReviewTask ? '#F59E0B' : APP_BORDER,
              bgcolor: featuredReviewTask ? '#FFFBEB' : '#FFFFFF',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <VerifiedOutlinedIcon sx={{ color: '#D97706' }} />
              <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
                Peer Verification
              </Typography>
            </Box>

            {!featuredReviewTask ? (
              <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
                No tasks awaiting verification right now.
              </Typography>
            ) : (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '14px',
                  bgcolor: '#FFFFFF',
                  border: `1px solid ${APP_BORDER}`,
                }}
              >
                <Typography
                  sx={{
                    display: 'inline-block',
                    px: 1.25,
                    py: 0.5,
                    mb: 1.25,
                    borderRadius: '999px',
                    bgcolor: '#FEF3C7',
                    color: '#B45309',
                    fontSize: fs(11),
                    fontWeight: 700,
                  }}
                >
                  Waiting for verification
                </Typography>
                <Typography sx={{ fontSize: fs(15), fontWeight: 700, color: SLATE[900], mb: 0.5 }}>
                  {featuredReviewTask.title}
                </Typography>
                <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 2 }}>
                  Ready for team review
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VerifiedOutlinedIcon />}
                    onClick={() => handleVerify(featuredReviewTask.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<GavelOutlinedIcon />}
                    onClick={() => handleDispute(featuredReviewTask.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    Dispute
                  </Button>
                </Stack>
              </Box>
            )}

            {reviewTasks.length > 1 && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {reviewTasks.slice(1, 3).map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      p: 1.25,
                      borderRadius: '12px',
                      bgcolor: '#FFFFFF',
                      border: `1px solid ${APP_BORDER}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <Typography sx={{ fontSize: fs(13), fontWeight: 700 }}>{task.title}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={SURFACE_CARD_SX}>
            <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900], mb: 2 }}>
              Team Activity
            </Typography>
            {projectActivity.length === 0 ? (
              <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
                Activity for this project will appear here.
              </Typography>
            ) : (
              <Stack spacing={1.75}>
                {projectActivity.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        bgcolor: APP_PRIMARY_LIGHT,
                        color: APP_PRIMARY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {ACTIVITY_ICONS[item.action_type] ?? <HistoryOutlinedIcon sx={{ fontSize: fs(16) }} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[900] }}>
                        {item.user_name}
                      </Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[500], lineHeight: 1.45 }}>
                        {item.action_type.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
            <Link
              component={RouterLink}
              to="/notifications"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 2,
                fontSize: fs(13),
                fontWeight: 700,
                color: APP_PRIMARY,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              View full activity log
              <ArrowForwardOutlinedIcon sx={{ fontSize: fs(14) }} />
            </Link>
          </Box>
        </Stack>
      </Grid>

      <TaskDetailModal
        taskId={selectedTaskId}
        projectOwnerId={currentProject?.owner_id ?? ''}
        onClose={() => setSelectedTaskId(null)}
      />
    </Grid>
  )
}
