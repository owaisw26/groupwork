import { Box, Stack, Typography } from '@mui/material'
import { fs, SLATE } from '../appTheme'
import { formatActivityTimestamp, getActivityVisual, type ActivityItem } from '../utils/activityDisplay'

interface ActivityFeedProps {
  items: ActivityItem[]
  emptyMessage?: string
  limit?: number
}

export default function ActivityFeed({
  items,
  emptyMessage = 'No activity yet.',
  limit,
}: ActivityFeedProps) {
  const visibleItems = limit ? items.slice(0, limit) : items

  if (visibleItems.length === 0) {
    return (
      <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      {visibleItems.map((item) => {
        const visual = getActivityVisual(item)
        return (
          <Box key={item.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                bgcolor: visual.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {visual.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900] }}>
                {visual.actionLine}
              </Typography>
              {visual.detailLine && (
                <Typography sx={{ fontSize: fs(13), color: SLATE[500], lineHeight: 1.45 }}>
                  {visual.detailLine}
                </Typography>
              )}
              {'created_at' in item && item.created_at && (
                <Typography sx={{ fontSize: fs(12), color: SLATE[400], mt: 0.25 }}>
                  {formatActivityTimestamp(item.created_at)}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
