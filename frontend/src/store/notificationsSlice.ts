import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface NotificationPreference {
  notification_type: string
  email_enabled: boolean
}

export interface NotificationsState {
  items: Notification[]
  unreadCount: number
  preferences: NotificationPreference[]
  nextCursor: string | null
  loading: boolean
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  preferences: [],
  nextCursor: null,
  loading: false,
}

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
  const response = await api.get('/notifications/unread-count')
  return response.data.count as number
})

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (cursor?: string) => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const response = await api.get(`/notifications${params}`)
    return response.data as { items: Notification[]; next_cursor: string | null }
  },
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`)
    return response.data as Notification
  },
)

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.put('/notifications/read-all')
})

export const fetchNotificationPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async () => {
    const response = await api.get('/users/me/notification-preferences')
    return response.data.items as NotificationPreference[]
  },
)

export const updateNotificationPreference = createAsyncThunk(
  'notifications/updatePreference',
  async ({ notification_type, email_enabled }: NotificationPreference) => {
    const response = await api.put('/users/me/notification-preferences', {
      notification_type,
      email_enabled,
    })
    return response.data as NotificationPreference
  },
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.nextCursor = action.payload.next_cursor
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((n) => n.id === action.payload.id)
        if (index >= 0) state.items[index] = action.payload
        if (state.unreadCount > 0) state.unreadCount -= 1
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, is_read: true }))
        state.unreadCount = 0
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload
      })
      .addCase(updateNotificationPreference.fulfilled, (state, action) => {
        const index = state.preferences.findIndex(
          (p) => p.notification_type === action.payload.notification_type,
        )
        if (index >= 0) {
          state.preferences[index] = action.payload
        } else {
          state.preferences.push(action.payload)
        }
      })
  },
})

export default notificationsSlice.reducer
