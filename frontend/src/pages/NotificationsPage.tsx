import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchNotifications, markAllNotificationsRead } from '../store/notificationsSlice'

export default function NotificationsPage() {
  const dispatch = useAppDispatch()
  const { items, loading, unreadCount } = useAppSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Button variant="outlined" onClick={() => dispatch(markAllNotificationsRead())}>
            Mark all read
          </Button>
        )}
      </Box>
      {loading ? (
        <CircularProgress size={24} />
      ) : items.length === 0 ? (
        <Typography color="text.secondary">No notifications yet.</Typography>
      ) : (
        <List>
          {items.map((notification) => (
            <ListItem key={notification.id} divider>
              <ListItemText
                primary={notification.title}
                secondary={`${notification.message} · ${new Date(notification.created_at).toLocaleString()}`}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: notification.is_read ? 400 : 600,
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
}
