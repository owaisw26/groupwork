import { Paper, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

interface ProjectPlaceholderPageProps {
  title: string
}

export default function ProjectPlaceholderPage({ title }: ProjectPlaceholderPageProps) {
  const { id } = useParams()

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">Project {id} — coming in Phase 2.</Typography>
    </Paper>
  )
}
