import { useDraggable } from '@dnd-kit/core'
import { Box, Chip, Paper, Typography } from '@mui/material'
import type { Task } from '../store/tasksSlice'

const PRIORITY_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
}

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      sx={{
        p: 1.5,
        mb: 1,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': { boxShadow: 2 },
      }}
    >
      <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
        {task.title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Chip label={task.priority} size="small" color={PRIORITY_COLORS[task.priority] ?? 'default'} />
        {task.due_date && (
          <Chip label={task.due_date} size="small" variant="outlined" />
        )}
      </Box>
    </Paper>
  )
}
