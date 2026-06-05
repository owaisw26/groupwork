import { Avatar, AvatarGroup, Box, Chip, Typography } from '@mui/material'
import { Outlet, useParams } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'

export default function ProjectLayout() {
  const { id } = useParams()
  const projects = useAppSelector((state) => state.projects.items)
  const displayProject = projects.find((item) => item.id === id)

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          {displayProject?.name ?? 'Project'}
        </Typography>
        {displayProject && (
          <Chip label={displayProject.status} size="small" color="primary" variant="outlined" />
        )}
        <AvatarGroup max={4}>
          {Array.from({ length: displayProject?.member_count ?? 1 }).map((_, index) => (
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
