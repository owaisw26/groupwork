import { Box, Card, CardActionArea, CardContent, LinearProgress, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../store/projectsSlice'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const memberCount = project.member_count ?? 1
  const progress = Math.min(100, Math.round((memberCount / project.max_members) * 100))

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/projects/${project.id}/tasks`)}>
        <CardContent>
          <Typography variant="h6" gutterBottom noWrap>
            {project.name}
          </Typography>
          {project.course && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {project.course}
            </Typography>
          )}
          {project.due_date && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Due {project.due_date}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {memberCount} / {project.max_members} members
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {project.status}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} />
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
