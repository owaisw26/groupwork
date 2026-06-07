import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { Badge, Box, Button, IconButton, Popover, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../store/notificationsSlice'

export default function NotificationDropdown() {
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const { items, unreadCount } = useAppSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchUnreadCount())
    const interval = window.setInterval(() => {
      dispatch(fetchUnreadCount())
    }, 30000)
    return () => window.clearInterval(interval)
  }, [dispatch])

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    dispatch(fetchNotifications())
  }

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead())
  }

  const handleMarkRead = (id: string) => {
    dispatch(markNotificationRead(id))
  }

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </Box>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          ) : (
            items.map((notification) => (
              <Box
                key={notification.id}
                sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer' }}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 400 : 600 }}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.message}
                </Typography>
              </Box>
            ))
          )}
          <Button component={Link} to="/notifications" size="small" sx={{ mt: 1 }}>
            See all notifications
          </Button>
        </Box>
      </Popover>
    </>
  )
}
