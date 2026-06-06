import { Alert, Box, Button, TextField } from '@mui/material'
import { useState } from 'react'
import { useAppDispatch } from '../store/hooks'
import { createTimeLog, fetchTimeLogs } from '../store/tasksSlice'

interface TimeLogFormProps {
  taskId: string
}

export default function TimeLogForm({ taskId }: TimeLogFormProps) {
  const dispatch = useAppDispatch()
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsedHours = parseFloat(hours)
    if (!parsedHours || parsedHours <= 0) {
      setError('Enter a valid number of hours')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await dispatch(
      createTimeLog({ taskId, hours: parsedHours, date, description: description || undefined }),
    )
    setSubmitting(false)
    if (createTimeLog.fulfilled.match(result)) {
      setHours('')
      setDescription('')
      dispatch(fetchTimeLogs(taskId))
    } else {
      setError((result.payload as string) ?? 'Failed to log time')
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="Hours"
          type="number"
          size="small"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          slotProps={{ htmlInput: { min: 0.25, max: 24, step: 0.25 } }}
          sx={{ width: 100 }}
        />
        <TextField
          label="Date"
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
      </Box>
      <TextField
        label="Description"
        size="small"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        rows={2}
      />
      <Button type="submit" variant="contained" size="small" disabled={submitting}>
        Log Time
      </Button>
    </Box>
  )
}
