import { createSlice } from '@reduxjs/toolkit'

export interface Project {
  id: string
  name: string
}

export interface ProjectsState {
  items: Project[]
  isLoading: boolean
}

const initialState: ProjectsState = {
  items: [],
  isLoading: false,
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {},
})

export default projectsSlice.reducer
