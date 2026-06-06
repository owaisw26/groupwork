import { Avatar, AvatarGroup, Box, Chip, CircularProgress, Typography } from '@mui/material'
import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchProject } from '../../store/projectsSlice'

export default function ProjectLayout() {
  const { id } = useParams()
  const dispatch = useAppDispatch()
  const { items, currentProject, isLoading } = useAppSelector((state) => state.projects)
  const displayProject = items.find((item) => item.id === id) ?? currentProject

  useEffect(() => {
    if (id) {
      dispatch(fetchProject(id))
    }
  }, [dispatch, id])

  if (!displayProject && isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!displayProject) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          {displayProject.name}
        </Typography>
        <Chip label={displayProject.status} size="small" color="primary" variant="outlined" />
        <AvatarGroup max={4}>
          {Array.from({ length: displayProject.member_count ?? 1 }).map((_, index) => (
            <Avatar key={index} sx={{ width: 32, height: 32 }}>
              {index + 1}
            </Avatar>
          ))}
        </AvatarGroup>
      </Box>
      <Outlet />
    </Box>
  )
}
