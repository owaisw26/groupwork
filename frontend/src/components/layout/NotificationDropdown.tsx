import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { Badge, Box, IconButton, Popover, Typography } from '@mui/material'
import { useState } from 'react'
import { useAppSelector } from '../../store/hooks'

export default function NotificationDropdown() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const { items, unreadCount } = useAppSelector((state) => state.notifications)

  return (
    <>
      <IconButton color="inherit" onClick={(event) => setAnchorEl(event.currentTarget)}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 400, maxHeight: 500, overflow: 'auto' },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            Notifications
          </Typography>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          ) : (
            items.map((notification) => (
              <Box key={notification.id} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 400 : 600 }}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  )
}
