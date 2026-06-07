import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import { Box, CircularProgress, Link, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { APP_PRIMARY, fs, PAGE_CARD_SX, SLATE } from '../../appTheme'
import ActivityFeed from '../../components/ActivityFeed'
import api from '../../services/api'
import type { ActivityItem } from '../../utils/activityDisplay'

export default function ActivityTab() {
  const { id: projectId } = useParams()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) {
      return
    }
    setLoading(true)
    api
      .get<ActivityItem[]>(`/projects/${projectId}/activity`)
      .then((response) => setItems(response.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [projectId])

  return (
    <Box sx={{ ...PAGE_CARD_SX, p: { xs: 2.5, md: 3 } }}>
      <Link
        component={RouterLink}
        to={`/projects/${projectId}/tasks`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 2,
          fontSize: fs(13),
          fontWeight: 700,
          color: APP_PRIMARY,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        <ArrowBackOutlinedIcon sx={{ fontSize: fs(16) }} />
        Back to task board
      </Link>
      <Typography sx={{ fontSize: fs(20), fontWeight: 800, color: SLATE[900], mb: 2 }}>
        Team Activity
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <ActivityFeed
          items={items}
          emptyMessage="Activity for this project will appear here."
        />
      )}
    </Box>
  )
}
