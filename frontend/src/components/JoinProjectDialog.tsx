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
import api from '../services/api'
import { useAppDispatch } from '../store/hooks'
import { fetchProjects } from '../store/projectsSlice'

interface JoinProjectDialogProps {
  open: boolean
  onClose: () => void
}

export default function JoinProjectDialog({ open, onClose }: JoinProjectDialogProps) {
  const dispatch = useAppDispatch()
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async () => {
    setMessage(null)
    try {
      await api.post('/projects/join', { join_code: joinCode })
      await dispatch(fetchProjects())
      onClose()
      setJoinCode('')
    } catch {
      setMessage('Invalid or expired join code')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Join Project</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Join code"
          margin="normal"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          slotProps={{ htmlInput: { maxLength: 6 } }}
        />
        {message && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={joinCode.length !== 6}>
          Join
        </Button>
      </DialogActions>
    </Dialog>
  )
}
