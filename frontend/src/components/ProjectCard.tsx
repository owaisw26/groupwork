import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type { Project } from '../store/projectsSlice'

interface ProjectCardProps {
  project: Project
  taskProgress?: number
}

export default function ProjectCard({ project, taskProgress = 0 }: ProjectCardProps) {
  return (
    <Card component={Link} to={`/projects/${project.id}/tasks`} sx={{ textDecoration: 'none', height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {project.name}
        </Typography>
        {project.course && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {project.course}
          </Typography>
        )}
        {project.due_date && (
          <Typography variant="body2" color="text.secondary">
            Due: {project.due_date}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {project.member_count ?? 1} member{(project.member_count ?? 1) === 1 ? '' : 's'}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={taskProgress} />
          <Typography variant="caption" color="text.secondary">
            Task progress
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
