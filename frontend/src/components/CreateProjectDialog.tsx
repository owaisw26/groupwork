import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import { useAppDispatch } from '../store/hooks'
import { createProject } from '../store/projectsSlice'
import { getTodayDateInputValue } from '../utils/dateInput'

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

export default function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState(getTodayDateInputValue)
  const [maxMembers, setMaxMembers] = useState('6')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setDescription('')
    setCourse('')
    setDueDate(getTodayDateInputValue())
    setMaxMembers('6')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await dispatch(
        createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          course: course.trim() || undefined,
          due_date: dueDate || undefined,
          max_members: Number(maxMembers),
        }),
      )
      if (createProject.rejected.match(result)) {
        setError((result.payload as string) ?? 'Unable to create project')
        return
      }
      handleClose()
    } catch {
      setError('Unable to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Project</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Project name"
          margin="normal"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Description"
          margin="normal"
          multiline
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          fullWidth
          label="Course"
          margin="normal"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <TextField
          fullWidth
          label="Due date"
          type="date"
          margin="normal"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          fullWidth
          label="Max members"
          type="number"
          margin="normal"
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value)}
          slotProps={{ htmlInput: { min: 2, max: 20 } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
