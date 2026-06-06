import { Avatar, AvatarGroup, Box, Chip, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useEffect } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchProject } from '../../store/projectsSlice'

const TABS = [
  { label: 'Tasks', path: 'tasks' },
  { label: 'Meetings', path: 'meetings' },
  { label: 'Members', path: 'members' },
  { label: 'Evidence', path: 'evidence' },
  { label: 'Settings', path: 'settings' },
  { label: 'Report', path: 'report' },
]

export default function ProjectLayout() {
  const { id } = useParams()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { currentProject, isLoading } = useAppSelector((state) => state.projects)

  useEffect(() => {
    if (id) {
      dispatch(fetchProject(id))
    }
  }, [dispatch, id])

  if (isLoading || !currentProject || currentProject.id !== id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const activeTab =
    TABS.find((tab) => location.pathname.endsWith(`/${tab.path}`))?.path ?? 'tasks'

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" component="h1">
            {currentProject.name}
          </Typography>
          <Chip label={currentProject.status} size="small" />
        </Box>
        {currentProject.description && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {currentProject.description}
          </Typography>
        )}
        <AvatarGroup max={5}>
          {Array.from({ length: currentProject.member_count ?? 1 }).map((_, index) => (
            <Avatar key={index} sx={{ width: 32, height: 32 }} />
          ))}
        </AvatarGroup>
      </Box>

      <Tabs value={activeTab} sx={{ mb: 3 }}>
        {TABS.map((tab) => (
          <Tab
            key={tab.path}
            label={tab.label}
            value={tab.path}
            component={Link}
            to={`/projects/${id}/${tab.path}`}
          />
        ))}
      </Tabs>

      <Outlet />
    </Box>
  )
}
