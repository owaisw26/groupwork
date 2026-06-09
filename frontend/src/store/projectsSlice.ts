import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

export interface Project {
  id: string
  name: string
  description: string | null
  course: string | null
  due_date: string | null
  status: string
  owner_id: string
  join_code: string
  join_code_expires_at: string
  max_members: number
  member_count?: number
  completed_at?: string | null
  peer_review_ends_at?: string | null
  report_s3_key?: string | null
  archived_at?: string | null
  created_at: string
}

export interface DashboardData {
  my_tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    due_date: string | null
    project_id: string
    project_name: string
  }>
  upcoming_deadlines: Array<{
    id: string
    title: string
    due_date: string
    project_id: string
    project_name: string
    type?: 'task' | 'project'
    status?: string
  }>
  recent_activity: Array<{
    id: string
    action_type: string
    entity_type: string
    entity_id: string
    created_at: string
    project_id: string
    project_name: string
    user_name: string
  }>
}

export interface ProjectsState {
  items: Project[]
  currentProject: Project | null
  dashboard: DashboardData | null
  isLoading: boolean
  error: string | null
}

const initialState: ProjectsState = {
  items: [],
  currentProject: null,
  dashboard: null,
  isLoading: false,
  error: null,
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
    const apiError = data?.error as { message?: string } | undefined
    if (apiError?.message) {
      return apiError.message
    }
  }
  return 'Something went wrong'
}

export const fetchProjects = createAsyncThunk('projects/fetchProjects', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<Project[]>('/projects')
    return response.data
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (
    payload: {
      name: string
      description?: string
      course?: string
      due_date?: string
      max_members?: number
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post<Project>('/projects', payload)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchProject = createAsyncThunk(
  'projects/fetchProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<Project>(`/projects/${projectId}`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const completeProject = createAsyncThunk(
  'projects/completeProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await api.post<Project>(`/projects/${projectId}/complete`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${projectId}`)
      return projectId
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchDashboard = createAsyncThunk('projects/fetchDashboard', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<DashboardData>('/dashboard')
    return response.data
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearCurrentProject(state) {
      state.currentProject = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        const existing = state.items.findIndex((item) => item.id === action.payload.id)
        if (existing >= 0) {
          state.items[existing] = action.payload
        } else {
          state.items.push(action.payload)
        }
        state.currentProject = action.payload
      })
      .addCase(completeProject.fulfilled, (state, action) => {
        const existing = state.items.findIndex((item) => item.id === action.payload.id)
        if (existing >= 0) {
          state.items[existing] = action.payload
        } else {
          state.items.push(action.payload)
        }
        state.currentProject = action.payload
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null
        }
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboard = action.payload
      })
  },
})

export const { clearCurrentProject } = projectsSlice.actions
export default projectsSlice.reducer
