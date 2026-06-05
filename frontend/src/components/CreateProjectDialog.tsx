import {
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

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

export default function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxMembers, setMaxMembers] = useState('6')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }
    setIsSubmitting(true)
    try {
      await dispatch(
        createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          course: course.trim() || undefined,
          due_date: dueDate || undefined,
          max_members: Number(maxMembers) || 6,
        }),
      ).unwrap()
      onClose()
      setName('')
      setDescription('')
      setCourse('')
      setDueDate('')
      setMaxMembers('6')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
          margin="normal"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <TextField
          fullWidth
          label="Max members"
          margin="normal"
          type="number"
          inputProps={{ min: 2, max: 20 }}
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
