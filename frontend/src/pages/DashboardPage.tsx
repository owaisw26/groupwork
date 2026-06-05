import { Box, Grid, Paper, Typography } from '@mui/material'

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="My Tasks">
            <Typography color="text.secondary">No tasks assigned yet.</Typography>
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Upcoming Deadlines">
            <Typography color="text.secondary">No upcoming deadlines.</Typography>
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Recent Activity">
            <Typography color="text.secondary">No recent activity.</Typography>
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Quick Actions">
            <Typography color="text.secondary">Create or join a project to get started.</Typography>
          </Widget>
        </Grid>
      </Grid>
    </Box>
  )
}
