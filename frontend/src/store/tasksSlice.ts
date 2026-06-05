import { createSlice } from '@reduxjs/toolkit'

export interface TasksState {
  items: []
  isLoading: boolean
}

const initialState: TasksState = {
  items: [],
  isLoading: false,
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
})

export default tasksSlice.reducer
