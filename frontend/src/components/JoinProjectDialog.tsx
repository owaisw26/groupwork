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

interface JoinProjectDialogProps {
  open: boolean
  onClose: () => void
}

export default function JoinProjectDialog({ open, onClose }: JoinProjectDialogProps) {
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = () => {
    setMessage('Join by code will be available in the group formation module.')
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
          inputProps={{ maxLength: 6 }}
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
