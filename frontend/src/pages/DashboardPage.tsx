import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { Box, Button, Divider, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { APP_PRIMARY, fs, SLATE, SURFACE_CARD_SX } from '../appTheme'
import { STATUS_LABELS, STATUS_STYLES } from '../constants/taskFields'
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

function getDeadlineBadge(dueDate: string): { label: string; bg: string; color: string } {
  const due = new Date(`${dueDate}T00:00:00`)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)
    return { label: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`, bg: '#FEE2E2', color: '#DC2626' }
  if (diff === 0)
    return { label: 'Due today', bg: '#FEF3C7', color: '#D97706' }
  return { label: `${diff} day${diff === 1 ? '' : 's'} remaining`, bg: '#DCFCE7', color: '#16A34A' }
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

  const scrollToDeadlines = () => {
    document.getElementById('dashboard-deadlines')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            label="Deadlines"
            value={String(deadlines.length)}
            actionLabel="View deadlines"
            onActionClick={scrollToDeadlines}
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
        <Grid id="dashboard-deadlines" size={{ xs: 12, lg: 6 }} sx={{ scrollMarginTop: 24 }}>
          <Widget title="My Tasks">
            {myTasks.length === 0 ? (
              <Typography color="text.secondary">No tasks assigned yet.</Typography>
            ) : (
              <>
                <Stack divider={<Divider />}>
                  {myTasks.slice(0, 7).map((task) => {
                    const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.todo
                    const statusLabel = STATUS_LABELS[task.status] ?? task.status
                    return (
                      <Box
                        key={task.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          py: 1.25,
                          cursor: 'pointer',
                          '&:hover .task-title': { color: APP_PRIMARY },
                        }}
                        onClick={() => navigate(`/projects/${task.project_id}/tasks`)}
                      >
                        <Box
                          sx={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `2px solid ${SLATE[300]}`,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            className="task-title"
                            sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900], lineHeight: 1.3 }}
                          >
                            {task.title}
                          </Typography>
                          <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                            {task.project_name}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '6px',
                            bgcolor: statusStyle.bg,
                            color: statusStyle.color,
                            fontSize: fs(12),
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {statusLabel}
                        </Box>
                      </Box>
                    )
                  })}
                </Stack>
                <Box sx={{ mt: 1.5 }}>
                  <RouterLink
                    to="/my-tasks"
                    style={{ color: APP_PRIMARY, fontWeight: 700, fontSize: fs(13), textDecoration: 'none' }}
                  >
                    View all tasks →
                  </RouterLink>
                </Box>
              </>
            )}
          </Widget>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Widget title="Deadlines">
            {deadlines.length === 0 ? (
              <Typography color="text.secondary">No active deadlines.</Typography>
            ) : (
              <>
                <Stack divider={<Divider />}>
                  {deadlines.map((item) => {
                    const badge = getDeadlineBadge(item.due_date)
                    const isProject = item.type === 'project'
                    return (
                      <Box
                        key={item.id}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            bgcolor: '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isProject
                            ? <FolderOutlinedIcon sx={{ fontSize: 20, color: '#2563EB' }} />
                            : <AssignmentOutlinedIcon sx={{ fontSize: 20, color: '#7C3AED' }} />
                          }
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900], lineHeight: 1.3 }}>
                            {item.title}
                          </Typography>
                          <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                            {isProject ? 'Project deadline' : 'Task deadline'} · {item.project_name}
                          </Typography>
                          <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                            {item.due_date}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '6px',
                            bgcolor: badge.bg,
                            color: badge.color,
                            fontSize: fs(12),
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </Box>
                      </Box>
                    )
                  })}
                </Stack>
                <Box sx={{ mt: 1.5 }}>
                  <RouterLink
                    to="/my-tasks"
                    style={{ color: APP_PRIMARY, fontWeight: 700, fontSize: fs(13), textDecoration: 'none' }}
                  >
                    View all deadlines →
                  </RouterLink>
                </Box>
              </>
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
