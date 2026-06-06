import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateProjectDialog from '../components/CreateProjectDialog'
import JoinProjectDialog from '../components/JoinProjectDialog'
import ProjectCard from '../components/ProjectCard'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchDashboard, fetchProjects } from '../store/projectsSlice'

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
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items, dashboard } = useAppSelector((state) => state.projects)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchProjects())
    dispatch(fetchDashboard())
  }, [dispatch])

  const myTasks = dashboard?.my_tasks ?? []
  const deadlines = dashboard?.upcoming_deadlines ?? []
  const activity = dashboard?.recent_activity ?? []

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      {items.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {items.map((project) => (
            <Grid key={project.id} size={{ xs: 12, md: 4 }}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="My Tasks">
            {myTasks.length === 0 ? (
              <Typography color="text.secondary">No tasks assigned yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {myTasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${task.project_id}/tasks`)}
                  >
                    <Typography variant="body2">{task.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.project_name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Upcoming Deadlines">
            {deadlines.length === 0 ? (
              <Typography color="text.secondary">No upcoming deadlines.</Typography>
            ) : (
              <Stack spacing={1}>
                {deadlines.map((item) => (
                  <Box key={item.id}>
                    <Typography variant="body2">{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.due_date} · {item.project_name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Recent Activity">
            {activity.length === 0 ? (
              <Typography color="text.secondary">No recent activity.</Typography>
            ) : (
              <Stack spacing={1}>
                {activity.map((item) => (
                  <Box key={item.id}>
                    <Typography variant="body2">
                      {item.user_name} · {item.action_type.replace('_', ' ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.project_name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Quick Actions">
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={() => setCreateOpen(true)}>
                Create Project
              </Button>
              <Button variant="outlined" onClick={() => setJoinOpen(true)}>
                Join Project
              </Button>
            </Stack>
          </Widget>
        </Grid>
      </Grid>

      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinProjectDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </Box>
  )
}
