import { Paper, Typography } from '@mui/material'

export default function MyTasksPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Tasks
      </Typography>
      <Typography color="text.secondary">Tasks assigned to you across all projects will appear here.</Typography>
    </Paper>
  )
}
