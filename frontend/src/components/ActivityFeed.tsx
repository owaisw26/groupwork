import { Box, Stack, Typography } from '@mui/material'
import { fs, SLATE } from '../appTheme'
import { formatActivityTimestamp, getActivityVisual, type ActivityItem } from '../utils/activityDisplay'

interface ActivityFeedProps {
  items: ActivityItem[]
  emptyMessage?: string
  limit?: number
  variant?: 'default' | 'comfortable'
  fillHeight?: boolean
}

export default function ActivityFeed({
  items,
  emptyMessage = 'No activity yet.',
  limit,
  variant = 'default',
  fillHeight = false,
}: ActivityFeedProps) {
  const visibleItems = limit ? items.slice(0, limit) : items
  const isComfortable = variant === 'comfortable'

  if (visibleItems.length === 0) {
    return (
      <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <Stack
      spacing={isComfortable ? 1.25 : 2}
      sx={
        isComfortable && fillHeight
          ? { flex: 1, height: '100%', justifyContent: 'space-between' }
          : undefined
      }
    >
      {visibleItems.map((item) => {
        const visual = getActivityVisual(item)
        return (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              gap: isComfortable ? 2 : 1.5,
              alignItems: isComfortable ? 'center' : 'flex-start',
              justifyContent: 'flex-start',
              ...(isComfortable && {
                flex: fillHeight ? 1 : undefined,
                px: 1.75,
                py: 1.75,
                borderRadius: '14px',
                bgcolor: SLATE[50],
                border: '1px solid #E2E8F0',
              }),
            }}
          >
            <Box
              sx={{
                width: isComfortable ? 48 : 38,
                height: isComfortable ? 48 : 38,
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
              <Typography
                sx={{
                  fontSize: fs(isComfortable ? 17 : 14),
                  fontWeight: 700,
                  color: SLATE[900],
                  lineHeight: 1.35,
                }}
              >
                {visual.actionLine}
              </Typography>
              {visual.detailLine && (
                <Typography
                  sx={{
                    fontSize: fs(isComfortable ? 14 : 13),
                    color: SLATE[500],
                    lineHeight: 1.45,
                    mt: 0.25,
                  }}
                >
                  {visual.detailLine}
                </Typography>
              )}
              {'created_at' in item && item.created_at && (
                <Typography
                  sx={{
                    fontSize: fs(isComfortable ? 13 : 12),
                    color: SLATE[400],
                    mt: 0.5,
                  }}
                >
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
