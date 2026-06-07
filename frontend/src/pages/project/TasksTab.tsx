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
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
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
import ActivityFeed from '../../components/ActivityFeed'

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

const BOARD_HEIGHT = 'calc(100vh - 360px)'
const KANBAN_TASK_PREVIEW = 4
const ACTIVITY_PREVIEW = 4
const REVIEW_PREVIEW = 3

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
  expanded,
  onViewAll,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  members: ProjectMember[]
  projectDueDate?: string | null
  expanded: boolean
  onViewAll: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const hasOverflow = tasks.length > KANBAN_TASK_PREVIEW
  const visibleTasks = expanded || !hasOverflow ? tasks : tasks.slice(0, KANBAN_TASK_PREVIEW)

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: { xs: 'auto', xl: '100%' },
        minHeight: { xs: 400, xl: 0 },
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

      <Box sx={{ flex: 1, minHeight: 0, px: 2.25, pb: 1, overflowY: expanded ? 'auto' : 'hidden' }}>
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            projectDueDate={projectDueDate}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </Box>

      {hasOverflow && !expanded && (
        <Box sx={{ px: 2.25, pb: 0.5 }}>
          <Button
            fullWidth
            onClick={onViewAll}
            sx={{
              justifyContent: 'flex-start',
              color: APP_PRIMARY,
              fontWeight: 700,
              fontSize: fs(13),
              py: 0.75,
              '&:hover': { bgcolor: APP_PRIMARY_LIGHT },
            }}
          >
            View all ({tasks.length} tasks)
          </Button>
        </Box>
      )}

      <Box sx={{ px: 1.5, pb: 1.5, mt: 'auto' }}>
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
  const [expandedColumns, setExpandedColumns] = useState<Partial<Record<TaskStatus, boolean>>>({})

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

  const allProjectActivity = useMemo(
    () => (dashboard?.recent_activity ?? []).filter((item) => item.project_id === projectId),
    [dashboard?.recent_activity, projectId],
  )
  const hasMoreActivity = allProjectActivity.length > ACTIVITY_PREVIEW

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
    <Grid
      container
      spacing={2.5}
      sx={{
        height: { xs: 'auto', xl: BOARD_HEIGHT },
        minHeight: { xl: 480 },
        alignItems: 'stretch',
      }}
    >
      <Grid
        size={{ xs: 12, xl: 9 }}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, height: '100%' }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, height: '100%', alignItems: 'stretch' }}>
            {TASK_STATUSES.map((status) => (
              <Grid
                key={status}
                size={{ xs: 12, sm: 6, lg: 3 }}
                sx={{ display: 'flex', minHeight: { xs: 400, xl: 0 } }}
              >
                <KanbanColumn
                  status={status}
                  tasks={items.filter((t) => t.status === status)}
                  members={members}
                  projectDueDate={currentProject?.due_date}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onAddTask={() => openCreateTask?.()}
                  expanded={!!expandedColumns[status]}
                  onViewAll={() =>
                    setExpandedColumns((prev) => ({ ...prev, [status]: true }))
                  }
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
        </Box>
      </Grid>

      <Grid
        size={{ xs: 12, xl: 3 }}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, height: '100%' }}>
          <Box
            sx={{
              ...SURFACE_CARD_SX,
              flexShrink: 0,
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

            {reviewTasks.length > REVIEW_PREVIEW && (
              <Link
                component={RouterLink}
                to={`/projects/${projectId}/peer-review`}
                sx={{
                  display: 'inline-block',
                  mt: 1.5,
                  fontSize: fs(13),
                  fontWeight: 700,
                  color: APP_PRIMARY,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View all ({reviewTasks.length} tasks)
              </Link>
            )}

            {reviewTasks.length > 1 && reviewTasks.length <= REVIEW_PREVIEW && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {reviewTasks.slice(1, REVIEW_PREVIEW).map((task) => (
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

          <Box
            sx={{
              ...SURFACE_CARD_SX,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900], mb: 2 }}>
              Team Activity
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <ActivityFeed
                items={allProjectActivity}
                limit={ACTIVITY_PREVIEW}
                emptyMessage="Activity for this project will appear here."
              />
            </Box>
            {hasMoreActivity && (
              <Link
                component={RouterLink}
                to={`/projects/${projectId}/activity`}
                sx={{
                  display: 'inline-block',
                  mt: 1.5,
                  fontSize: fs(13),
                  fontWeight: 700,
                  color: APP_PRIMARY,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View all ({allProjectActivity.length} events)
              </Link>
            )}
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
