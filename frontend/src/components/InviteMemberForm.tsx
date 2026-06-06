import { Alert, Box, Button, TextField } from '@mui/material'
import { useState } from 'react'
import api from '../services/api'

interface InviteMemberFormProps {
  projectId: string
  onInvited?: () => void
}

export default function InviteMemberForm({ projectId, onInvited }: InviteMemberFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await api.post(`/projects/${projectId}/invite`, { email })
      setEmail('')
      setSuccess(true)
      onInvited?.()
    } catch {
      setError('Unable to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        margin="normal"
        required
      />
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 1 }}>Invitation sent</Alert>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
        Send Invite
      </Button>
    </Box>
  )
}
