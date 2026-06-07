import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import { useDraggable } from '@dnd-kit/core'
import { Avatar, Box, Paper, Typography } from '@mui/material'
import { SLATE } from '../appTheme'
import {
  AVATAR_COLORS,
  formatTaskDueDate,
  getEffectiveDueDate,
  memberInitials,
  PRIORITY_STYLES,
} from '../constants/taskFields'
import type { Task } from '../store/tasksSlice'

const TASK_CARD_BORDER = '#E7ECF3'

const STATUS_CHECKLIST: Record<string, { done: number; total: number }> = {
  todo: { done: 0, total: 4 },
  in_progress: { done: 2, total: 4 },
  review: { done: 3, total: 4 },
  done: { done: 4, total: 4 },
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  members?: { id: string; full_name: string }[]
  projectDueDate?: string | null
}

export default function TaskCard({ task, onClick, members = [], projectDueDate = null }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium
  const checklist = STATUS_CHECKLIST[task.status] ?? STATUS_CHECKLIST.todo
  const progress = Math.round((checklist.done / checklist.total) * 100)
  const assigneeCount = Math.max(task.assignee_ids.length, 1)
  const assignees = task.assignee_ids
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is { id: string; full_name: string } => Boolean(member))
  const displayAssignees =
    assignees.length > 0
      ? assignees.slice(0, 3)
      : Array.from({ length: Math.min(assigneeCount, 3) }).map((_, index) => ({
          id: `placeholder-${index}`,
          full_name: String.fromCharCode(65 + index),
        }))
  const effectiveDueDate = getEffectiveDueDate(task.due_date, projectDueDate)

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      elevation={0}
      sx={{
        p: 2,
        mb: 1.5,
        cursor: 'grab',
        opacity: isDragging ? 0.55 : 1,
        bgcolor: '#FFFFFF',
        border: `1px solid ${TASK_CARD_BORDER}`,
        borderRadius: '14px',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': {
          borderColor: SLATE[300],
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: `2px solid ${SLATE[300]}`,
            flexShrink: 0,
            mt: 0.25,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: SLATE[900], mb: 0.5, lineHeight: 1.35 }}>
            {task.title}
          </Typography>
          {task.description && (
            <Typography
              sx={{
                fontSize: 14,
                color: SLATE[500],
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.45,
              }}
            >
              {task.description}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex' }}>
          {displayAssignees.map((assignee, index) => (
            <Avatar
              key={assignee.id}
              sx={{
                width: 32,
                height: 32,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                border: '2.5px solid #FFFFFF',
                ml: index > 0 ? '-10px' : 0,
                color: SLATE[800],
              }}
            >
              {memberInitials(assignee.full_name)}
            </Avatar>
          ))}
        </Box>
        {effectiveDueDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: SLATE[500] }}>
            <CalendarTodayOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography sx={{ fontSize: 13 }}>{formatTaskDueDate(effectiveDueDate)}</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 13, color: SLATE[500], fontWeight: 600, flexShrink: 0 }}>
          {checklist.done} / {checklist.total}
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 8,
            bgcolor: '#E2E8F0',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              bgcolor: task.status === 'done' ? '#16A34A' : '#22C55E',
              borderRadius: 4,
              transition: 'width 200ms ease',
            }}
          />
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            bgcolor: priority.bg,
            color: priority.color,
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            lineHeight: 1.2,
          }}
        >
          {priority.label}
        </Box>
      </Box>
    </Paper>
  )
}
