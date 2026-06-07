import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import { Box, Card, CardActionArea, CardContent, Chip, LinearProgress, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE } from '../appTheme'
import type { Project } from '../store/projectsSlice'

interface ProjectCardProps {
  project: Project
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: '#DCFCE7', color: '#166534' },
  planning: { bg: APP_PRIMARY_LIGHT, color: APP_PRIMARY },
  completed: { bg: SLATE[100], color: SLATE[700] },
  archived: { bg: SLATE[100], color: SLATE[500] },
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const memberCount = project.member_count ?? 1
  const progress = Math.min(100, Math.round((memberCount / project.max_members) * 100))
  const statusStyle = STATUS_COLORS[project.status] ?? STATUS_COLORS.planning

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => navigate(`/projects/${project.id}/tasks`)} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: APP_PRIMARY_LIGHT,
                color: APP_PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FolderOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900], mb: 0.5 }} noWrap>
                {project.name}
              </Typography>
              {project.course && (
                <Typography sx={{ fontSize: fs(14), color: SLATE[500] }} noWrap>
                  {project.course}
                </Typography>
              )}
            </Box>
            <Chip
              label={project.status}
              size="small"
              sx={{
                bgcolor: statusStyle.bg,
                color: statusStyle.color,
                fontWeight: 700,
                textTransform: 'capitalize',
              }}
            />
          </Box>

          {project.due_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: fs(16), color: SLATE[400] }} />
              <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
                Due {project.due_date}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleOutlinedIcon sx={{ fontSize: fs(16), color: SLATE[400] }} />
            <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
              {memberCount} / {project.max_members} members
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
