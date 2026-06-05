import { Paper, Typography } from '@mui/material'

export default function NotificationsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Notifications
      </Typography>
      <Typography color="text.secondary">Your notifications will appear here.</Typography>
    </Paper>
  )
}
