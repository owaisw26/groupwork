import { Box, Typography } from '@mui/material'
import type { Task } from '../store/tasksSlice'

interface EditRequestDiffProps {
  current: Task
  proposed: Record<string, unknown>
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export default function EditRequestDiff({ current, proposed }: EditRequestDiffProps) {
  const fields = Object.keys(proposed)

  if (fields.length === 0) {
    return <Typography color="text.secondary">No changes proposed.</Typography>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {fields.map((field) => {
        const oldValue = formatValue(current[field as keyof Task])
        const newValue = formatValue(proposed[field])
        return (
          <Box key={field} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {field.replace('_', ' ')}
            </Typography>
            <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
              {oldValue}
            </Typography>
            <Typography variant="body2" color="primary.main">
              {newValue}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
