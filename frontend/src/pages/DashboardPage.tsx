import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PRIMARY, fs, SLATE, SURFACE_CARD_SX } from '../appTheme'
import CreateProjectDialog from '../components/CreateProjectDialog'
import JoinProjectDialog from '../components/JoinProjectDialog'
import ProjectCard from '../components/ProjectCard'
import PageHeader from '../components/layout/PageHeader'
import StatCard from '../components/layout/StatCard'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchDashboard, fetchProjects } from '../store/projectsSlice'

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ ...SURFACE_CARD_SX, height: '100%' }}>
      <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900], mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
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

  const scrollToProjects = () => {
    if (items.length === 0) {
      setCreateOpen(true)
      return
    }
    if (items.length === 1) {
      navigate(`/projects/${items[0].id}/tasks`)
      return
    }
    document.getElementById('your-projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your projects, tasks, and recent team activity."
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => setJoinOpen(true)}>
              Join Project
            </Button>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Create Project
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<FolderOutlinedIcon fontSize="small" />}
            label="Projects"
            value={String(items.length)}
            actionLabel="View projects"
            onActionClick={scrollToProjects}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<AssignmentOutlinedIcon fontSize="small" />}
            label="My Tasks"
            value={String(myTasks.length)}
            actionLabel="Open task board"
            actionTo="/my-tasks"
            accent="#0891B2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<AccessTimeOutlinedIcon fontSize="small" />}
            label="Upcoming Deadlines"
            value={String(deadlines.length)}
            actionLabel="View deadlines"
            actionTo="/my-tasks"
            accent="#D97706"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<BoltOutlinedIcon fontSize="small" />}
            label="Recent Activity"
            value={String(activity.length)}
            actionLabel="See activity"
            actionTo="/notifications"
            accent="#7C3AED"
          />
        </Grid>
      </Grid>

      {items.length > 0 && (
        <Box id="your-projects" sx={{ mb: 3, scrollMarginTop: 24 }}>
          <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900], mb: 2 }}>
            Your Projects
          </Typography>
          <Grid container spacing={2.5}>
            {items.map((project) => (
              <Grid key={project.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <ProjectCard project={project} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Widget title="My Tasks">
            {myTasks.length === 0 ? (
              <Typography color="text.secondary">No tasks assigned yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {myTasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'border-color 160ms ease',
                      '&:hover': { borderColor: APP_PRIMARY },
                    }}
                    onClick={() => navigate(`/projects/${task.project_id}/tasks`)}
                  >
                    <Typography sx={{ fontSize: fs(15), fontWeight: 700 }}>{task.title}</Typography>
                    <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                      {task.project_name} · {task.status.replace('_', ' ')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Widget title="Upcoming Deadlines">
            {deadlines.length === 0 ? (
              <Typography color="text.secondary">No upcoming deadlines.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {deadlines.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontSize: fs(15), fontWeight: 700 }}>{item.title}</Typography>
                    <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                      {item.due_date} · {item.project_name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Widget title="Recent Activity">
            {activity.length === 0 ? (
              <Typography color="text.secondary">No recent activity.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {activity.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: SLATE[50],
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: APP_PRIMARY,
                        mt: 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography sx={{ fontSize: fs(15), fontWeight: 600 }}>
                        {item.user_name} · {item.action_type.replace('_', ' ')}
                      </Typography>
                      <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                        {item.project_name}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Widget>
        </Grid>
      </Grid>

      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinProjectDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </Box>
  )
}
