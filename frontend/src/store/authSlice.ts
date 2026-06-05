import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

export interface User {
  id: string
  email: string
  full_name: string
  email_verified: boolean
  has_completed_onboarding: boolean
  created_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
    if (data && typeof data === 'object') {
      const apiError = data.error as { message?: string; details?: unknown } | undefined
      if (apiError?.message) {
        if (Array.isArray(apiError.details) && apiError.details.length > 0) {
          return apiError.details.map(String).join('. ')
        }
        return apiError.message
      }
      if (typeof data.detail === 'string') {
        return data.detail
      }
    }
  }
  return 'Something went wrong'
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<User>('/auth/login', credentials)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const register = createAsyncThunk(
  'auth/register',
  async (
    payload: { full_name: string; email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post<User>('/auth/register', payload)
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout')
    return null
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/refresh')
      const response = await api.get<User>('/users/me')
      return response.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (signal: AbortSignal | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get<User>('/users/me', { signal })
      return response.data
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    clearSession(state) {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.isLoading = false
          return
        }
        if (state.isAuthenticated) {
          state.isLoading = false
          return
        }
        state.user = null
        state.isAuthenticated = false
        state.isLoading = false
      })
  },
})

export const { clearAuthError, clearSession } = authSlice.actions
export default authSlice.reducer
