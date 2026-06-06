import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  verification_status: string
  created_by: string
  created_at: string
  updated_at: string
  assignee_ids: string[]
  project_name?: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_by: string | null
  completed_at: string | null
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
}

export interface TimeLog {
  id: string
  task_id: string
  user_id: string
  hours: number
  date: string
  description: string | null
  created_at: string
  user_name?: string
}

export interface EditRequest {
  id: string
  task_id: string
  requested_by: string
  proposed_changes: Record<string, unknown>
  status: string
  reviewed_by: string | null
  created_at: string
  reviewed_at: string | null
}

interface PaginatedTasks {
  items: Task[]
  next_cursor: string | null
}

export interface TasksState {
  items: Task[]
  myTasks: Task[]
  searchResults: Task[]
  currentTask: Task | null
  activeDetailTaskId: string | null
  lastSearchQuery: string
  myTasksLoading: boolean
  subtasks: Subtask[]
  comments: Comment[]
  timeLogs: TimeLog[]
  totalProjectHours: number
  editRequests: EditRequest[]
  isLoading: boolean
  error: string | null
}

const initialState: TasksState = {
  items: [],
  myTasks: [],
  searchResults: [],
  currentTask: null,
  activeDetailTaskId: null,
  lastSearchQuery: '',
  myTasksLoading: false,
  subtasks: [],
  comments: [],
  timeLogs: [],
  totalProjectHours: 0,
  editRequests: [],
  isLoading: false,
  error: null,
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
    const detail = data?.detail
    if (typeof detail === 'string') return detail
    const apiError = data?.error as { message?: string } | undefined
    if (apiError?.message) return apiError.message
  }
  return 'Something went wrong'
}

export const fetchProjectTasks = createAsyncThunk(
  'tasks/fetchProjectTasks',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<PaginatedTasks>(`/projects/${projectId}/tasks`, {
        params: { limit: 100 },
      })
      return response.data.items
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (
    payload: {
      projectId: string
      title: string
      description?: string
      status?: string
      priority?: string
      due_date?: string
      assignee_ids?: string[]
    },
    { rejectWithValue },
  ) => {
    try {
      const { projectId, ...body } = payload
      const response = await api.post<Task>(`/projects/${projectId}/tasks`, body)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status }: { taskId: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch<Task>(`/tasks/${taskId}/status`, { status })
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${taskId}`)
      return taskId
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchTask = createAsyncThunk(
  'tasks/fetchTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<Task>(`/tasks/${taskId}`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (
    payload: {
      taskId: string
      title?: string
      description?: string
      priority?: string
      due_date?: string
      assignee_ids?: string[]
    },
    { rejectWithValue },
  ) => {
    try {
      const { taskId, ...body } = payload
      const response = await api.put<Task>(`/tasks/${taskId}`, body)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchSubtasks = createAsyncThunk(
  'tasks/fetchSubtasks',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<Subtask[]>(`/tasks/${taskId}/subtasks`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createSubtask = createAsyncThunk(
  'tasks/createSubtask',
  async ({ taskId, title }: { taskId: string; title: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title })
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const toggleSubtask = createAsyncThunk(
  'tasks/toggleSubtask',
  async (
    { taskId, subtaskId, is_completed }: { taskId: string; subtaskId: string; is_completed: boolean },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch<Subtask>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        is_completed,
      })
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchComments = createAsyncThunk(
  'tasks/fetchComments',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<Comment[]>(`/tasks/${taskId}/comments`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createComment = createAsyncThunk(
  'tasks/createComment',
  async ({ taskId, content }: { taskId: string; content: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<Comment>(`/tasks/${taskId}/comments`, { content })
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchTimeLogs = createAsyncThunk(
  'tasks/fetchTimeLogs',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<{
        items: TimeLog[]
        total_hours_for_user_in_project: number
      }>(`/tasks/${taskId}/time-logs`)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createTimeLog = createAsyncThunk(
  'tasks/createTimeLog',
  async (
    payload: { taskId: string; hours: number; date: string; description?: string },
    { rejectWithValue },
  ) => {
    try {
      const { taskId, ...body } = payload
      const response = await api.post<TimeLog>(`/tasks/${taskId}/time-logs`, body)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const submitEditRequest = createAsyncThunk(
  'tasks/submitEditRequest',
  async (
    { taskId, proposed_changes }: { taskId: string; proposed_changes: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post<EditRequest>(`/tasks/${taskId}/request-edit`, {
        proposed_changes,
      })
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchEditRequests = createAsyncThunk(
  'tasks/fetchEditRequests',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<EditRequest[]>(`/tasks/${taskId}/edit-requests`)
      return { taskId, requests: response.data }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const reviewEditRequest = createAsyncThunk(
  'tasks/reviewEditRequest',
  async (
    {
      taskId,
      requestId,
      approved,
    }: { taskId: string; requestId: string; approved: boolean },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post<EditRequest>(
        `/tasks/${taskId}/edit-requests/${requestId}/review`,
        { approved },
      )
      return { taskId, request: response.data }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchMyTasks = createAsyncThunk('tasks/fetchMyTasks', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<PaginatedTasks>('/my-tasks', { params: { limit: 100 } })
    return response.data.items
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const searchTasks = createAsyncThunk(
  'tasks/searchTasks',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await api.get<PaginatedTasks>('/search/tasks', {
        params: { q: query, limit: 10 },
      })
      return { query, items: response.data.items }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

function upsertTask(state: TasksState, task: Task) {
  const index = state.items.findIndex((item) => item.id === task.id)
  if (index >= 0) {
    state.items[index] = task
  } else if (state.items.length === 0 || state.items.some((item) => item.project_id === task.project_id)) {
    state.items.push(task)
  }
  const myIndex = state.myTasks.findIndex((item) => item.id === task.id)
  if (myIndex >= 0) {
    state.myTasks[myIndex] = { ...state.myTasks[myIndex], ...task }
  }
  if (state.currentTask?.id === task.id) {
    state.currentTask = task
  }
}

function isActiveDetailTask(state: TasksState, taskId: string): boolean {
  return state.activeDetailTaskId === taskId
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setActiveDetailTaskId(state, action: { payload: string | null }) {
      state.activeDetailTaskId = action.payload
    },
    clearTaskDetail(state) {
      state.activeDetailTaskId = null
      state.currentTask = null
      state.subtasks = []
      state.comments = []
      state.timeLogs = []
      state.totalProjectHours = 0
      state.editRequests = []
    },
    clearSearchResults(state) {
      state.searchResults = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectTasks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        upsertTask(state, action.payload)
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.meta.arg)) return
        state.currentTask = action.payload
        upsertTask(state, action.payload)
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        upsertTask(state, action.payload)
      })
      .addCase(fetchSubtasks.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.meta.arg)) return
        state.subtasks = action.payload
      })
      .addCase(createSubtask.fulfilled, (state, action) => {
        state.subtasks.push(action.payload)
      })
      .addCase(toggleSubtask.fulfilled, (state, action) => {
        const index = state.subtasks.findIndex((s) => s.id === action.payload.id)
        if (index >= 0) state.subtasks[index] = action.payload
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.meta.arg)) return
        state.comments = action.payload
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.comments.push(action.payload)
      })
      .addCase(fetchTimeLogs.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.meta.arg)) return
        state.timeLogs = action.payload.items
        state.totalProjectHours = action.payload.total_hours_for_user_in_project
      })
      .addCase(createTimeLog.fulfilled, (state, action) => {
        state.timeLogs.unshift(action.payload)
      })
      .addCase(fetchEditRequests.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.payload.taskId)) return
        state.editRequests = action.payload.requests
      })
      .addCase(submitEditRequest.fulfilled, (state, action) => {
        if (!isActiveDetailTask(state, action.meta.arg.taskId)) return
        state.editRequests.push(action.payload)
      })
      .addCase(reviewEditRequest.fulfilled, (state, action) => {
        state.editRequests = state.editRequests.filter(
          (item) => item.id !== action.payload.request.id,
        )
      })
      .addCase(fetchMyTasks.pending, (state) => {
        state.myTasksLoading = true
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.myTasksLoading = false
        state.myTasks = action.payload
      })
      .addCase(fetchMyTasks.rejected, (state) => {
        state.myTasksLoading = false
      })
      .addCase(searchTasks.pending, (state, action) => {
        state.lastSearchQuery = action.meta.arg
      })
      .addCase(searchTasks.fulfilled, (state, action) => {
        if (action.payload.query !== state.lastSearchQuery) return
        state.searchResults = action.payload.items
      })
  },
})

export const { clearTaskDetail, clearSearchResults, setActiveDetailTaskId } = tasksSlice.actions
export default tasksSlice.reducer
