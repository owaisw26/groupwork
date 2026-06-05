import { createSlice } from '@reduxjs/toolkit'

export interface Notification {
  id: string
  title: string
  message: string
  is_read: boolean
}

export interface NotificationsState {
  items: Notification[]
  unreadCount: number
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
})

export default notificationsSlice.reducer
