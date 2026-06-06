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
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TaskCard from '../../components/TaskCard'
import TaskDetailModal from '../../components/TaskDetailModal'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  createTask,
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

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 2,
        minHeight: 400,
        bgcolor: isOver ? 'action.hover' : 'background.paper',
        transition: 'background-color 0.2s',
      }}
    >
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        {STATUS_LABELS[status]} ({tasks.length})
      </Typography>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
      ))}
    </Paper>
  )
}

export default function TasksTab() {
  const { id: projectId } = useParams()
  const dispatch = useAppDispatch()
  const { items, isLoading } = useAppSelector((state) => state.tasks)
  const currentProject = useAppSelector((state) =>
    state.projects.items.find((p) => p.id === projectId) ?? state.projects.currentProject,
  )

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectTasks(projectId))
    }
  }, [dispatch, projectId])

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

  const handleCreate = async () => {
    if (!projectId || !newTitle.trim()) return
    await dispatch(createTask({ projectId, title: newTitle.trim() }))
    setNewTitle('')
    setCreateOpen(false)
  }

  if (isLoading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
          Add Task
        </Button>
      </Box>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {TASK_STATUSES.map((status) => (
            <Grid key={status} size={{ xs: 12, sm: 6, md: 3 }}>
              <KanbanColumn
                status={status}
                tasks={items.filter((t) => t.status === status)}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
              />
            </Grid>
          ))}
        </Grid>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        taskId={selectedTaskId}
        projectOwnerId={currentProject?.owner_id ?? ''}
        onClose={() => setSelectedTaskId(null)}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
