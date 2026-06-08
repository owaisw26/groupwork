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
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
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
import { useEffect, useMemo, useRef, useState } from 'react'
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
  type Subtask,
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

const KANBAN_TASK_PREVIEW = 4
const ACTIVITY_PREVIEW = 6
const REVIEW_PREVIEW = 3

interface ProjectMember {
  id: string
  full_name: string
}

interface TasksOutletContext {
  openCreateTask?: () => void
}

function getMemberName(members: ProjectMember[], userId: string | undefined): string {
  if (!userId) return 'Team member'
  return members.find((member) => member.id === userId)?.full_name ?? 'Team member'
}

function formatCompletedAt(isoDate: string): string {
  const date = new Date(isoDate)
  const dateLabel = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel} at ${timeLabel}`
}

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  members,
  subtaskCounts,
  expanded,
  onViewAll,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  members: ProjectMember[]
  subtaskCounts: Record<string, { completed: number; total: number }>
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
        height: 'auto',
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
          <Typography sx={{ fontSize: fs(20), fontWeight: 800, color: SLATE[900] }}>
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

      <Box sx={{ flex: 1, minHeight: 0, px: 2.25, pb: 1, overflowY: 'hidden' }}>
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            completedSubtasks={subtaskCounts[task.id]?.completed}
            totalSubtasks={subtaskCounts[task.id]?.total}
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
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [expandedColumns, setExpandedColumns] = useState<Partial<Record<TaskStatus, boolean>>>({})
  const [activityExpanded, setActivityExpanded] = useState(false)
  const suppressTaskClickRef = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const taskIdsKey = useMemo(() => items.map((task) => task.id).sort().join(','), [items])

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectTasks(projectId))
      api
        .get<ProjectMember[]>(`/projects/${projectId}/members`)
        .then((response) => setMembers(response.data))
        .catch(() => setMembers([]))
    }
  }, [dispatch, projectId])

  useEffect(() => {
    let cancelled = false

    const loadSubtaskCounts = async () => {
      if (!taskIdsKey) {
        if (!cancelled) setSubtaskCounts({})
        return
      }

      const taskIds = taskIdsKey.split(',')
      const entries = await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const response = await api.get<Subtask[]>(`/tasks/${taskId}/subtasks`)
            const subtasks = response.data
            return [
              taskId,
              {
                completed: subtasks.filter((subtask) => subtask.is_completed).length,
                total: subtasks.length,
              },
            ] as const
          } catch {
            return [taskId, { completed: 0, total: 0 }] as const
          }
        }),
      )

      if (!cancelled) {
        setSubtaskCounts(Object.fromEntries(entries))
      }
    }

    void loadSubtaskCounts()

    return () => {
      cancelled = true
    }
  }, [taskIdsKey])

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
      suppressTaskClickRef.current = true
      window.setTimeout(() => {
        suppressTaskClickRef.current = false
      }, 0)
      dispatch(updateTaskStatus({ taskId, status: newStatus }))
    }
  }

  const handleTaskClick = (task: Task) => {
    if (suppressTaskClickRef.current) return
    setSelectedTaskId(task.id)
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
        minHeight: { xl: 480 },
        alignItems: 'stretch',
      }}
    >
      <Grid
        size={{ xs: 12, xl: 9 }}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
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
                  subtaskCounts={subtaskCounts}
                  onTaskClick={handleTaskClick}
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
                completedSubtasks={subtaskCounts[activeTask.id]?.completed}
                totalSubtasks={subtaskCounts[activeTask.id]?.total}
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
        <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
          <Box
            sx={{
              ...SURFACE_CARD_SX,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <VerifiedOutlinedIcon sx={{ fontSize: fs(22), color: APP_PRIMARY }} />
              <Typography sx={{ fontSize: fs(16), fontWeight: 800, color: SLATE[900] }}>
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
                  bgcolor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AccessTimeOutlinedIcon sx={{ fontSize: fs(18), color: '#D97706' }} />
                  <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: '#D97706' }}>
                    Waiting for verification
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: fs(15), fontWeight: 700, color: SLATE[900], mb: 0.5 }}>
                  {featuredReviewTask.title}
                </Typography>
                <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                  Completed by{' '}
                  {getMemberName(
                    members,
                    featuredReviewTask.assignee_ids[0] ?? featuredReviewTask.created_by,
                  )}
                </Typography>
                <Typography sx={{ fontSize: fs(12), color: SLATE[500], mb: 2.5 }}>
                  {formatCompletedAt(featuredReviewTask.updated_at)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleVerify(featuredReviewTask.id)}
                    startIcon={<CheckCircleOutlineOutlinedIcon sx={{ fontSize: fs(18) }} />}
                    sx={{
                      py: 1.25,
                      borderRadius: 2.5,
                      borderWidth: 2,
                      borderColor: APP_PRIMARY,
                      color: APP_PRIMARY,
                      fontSize: fs(14),
                      fontWeight: 700,
                      '&:hover': { borderWidth: 2, bgcolor: APP_PRIMARY_LIGHT },
                    }}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleDispute(featuredReviewTask.id)}
                    startIcon={<ReportProblemOutlinedIcon sx={{ fontSize: fs(18) }} />}
                    sx={{
                      py: 1.25,
                      borderRadius: 2.5,
                      borderWidth: 2,
                      borderColor: '#FCA5A5',
                      color: '#DC2626',
                      fontSize: fs(14),
                      fontWeight: 700,
                      '&:hover': { borderWidth: 2, bgcolor: '#FEF2F2' },
                    }}
                  >
                    Dispute
                  </Button>
                </Box>
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
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900], mb: 2 }}>
              Team Activity
            </Typography>
            <Box sx={{ overflow: activityExpanded ? 'visible' : 'hidden', display: 'flex' }}>
              <ActivityFeed
                items={allProjectActivity}
                limit={activityExpanded ? undefined : ACTIVITY_PREVIEW}
                variant="comfortable"
                fillHeight={!activityExpanded}
                emptyMessage="Activity for this project will appear here."
              />
            </Box>
            {hasMoreActivity && (
              <Button
                onClick={() => setActivityExpanded((prev) => !prev)}
                sx={{
                  justifyContent: 'flex-start',
                  mt: 1.5,
                  px: 0,
                  fontSize: fs(13),
                  fontWeight: 700,
                  color: APP_PRIMARY,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                {activityExpanded
                  ? 'Show less'
                  : `View all (${allProjectActivity.length} events)`}
              </Button>
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
