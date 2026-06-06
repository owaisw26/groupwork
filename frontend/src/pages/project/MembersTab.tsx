import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAppSelector } from '../../store/hooks'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  joined_at: string
}

export default function MembersTab() {
  const { id } = useParams()
  const project = useAppSelector((state) =>
    state.projects.items.find((item) => item.id === id),
  )
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }
    api.get<Member[]>(`/projects/${id}/members`).then((response) => {
      setMembers(response.data)
    })
  }, [id])

  const handleInvite = async () => {
    if (!id || !inviteEmail.trim()) {
      return
    }
    setMessage(null)
    setError(null)
    try {
      await api.post(`/projects/${id}/invite`, { email: inviteEmail.trim() })
      setMessage('Invitation sent')
      setInviteEmail('')
    } catch {
      setError('Unable to send invitation')
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Members
      </Typography>

      <Grid container spacing={3}>
        {members.map((member) => (
          <Grid key={member.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">{member.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {member.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {member.role}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Invite Member
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, maxWidth: 480 }}>
          <TextField
            fullWidth
            label="Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button variant="contained" onClick={handleInvite} disabled={!inviteEmail.trim()}>
            Send
          </Button>
        </Box>
        {message && (
          <Alert severity="success" sx={{ mt: 2, maxWidth: 480 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 480 }}>
            {error}
          </Alert>
        )}
      </Box>

      {project?.join_code && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Join Code
          </Typography>
          <Typography variant="body1">{project.join_code}</Typography>
        </Box>
      )}
    </Box>
  )
}
