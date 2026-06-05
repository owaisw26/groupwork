import { Paper, TextField, Typography } from '@mui/material'
import { useAppSelector } from '../store/hooks'

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <Paper sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <TextField fullWidth margin="normal" label="Full Name" value={user?.full_name ?? ''} />
      <TextField fullWidth margin="normal" label="Email" value={user?.email ?? ''} disabled />
    </Paper>
  )
}
