import { describe, expect, it, vi } from 'vitest'
import api from '../../services/api'
import authReducer, {
  fetchCurrentUser,
  login,
  logout,
  refreshToken,
  register,
  type AuthState,
} from '../authSlice'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authInitialized: false,
  error: null,
}

const mockUser = {
  id: '1',
  email: 'test@example.com',
  full_name: 'Test User',
  email_verified: true,
  has_completed_onboarding: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('authSlice', () => {
  it('login updates state on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockUser })
    const action = await login({ email: 'test@example.com', password: 'Password1' })(
      vi.fn(),
      () => ({}) as never,
      undefined,
    )
    const state = authReducer(initialState, action)
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('test@example.com')
  })

  it('logout clears auth state', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { status: 'ok' } })
    const loggedIn: AuthState = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      authInitialized: true,
      error: null,
    }
    const action = await logout()(vi.fn(), () => ({}) as never, undefined)
    const state = authReducer(loggedIn, action)
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('refreshToken keeps user authenticated', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { status: 'ok' } })
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser })
    const loggedIn: AuthState = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      authInitialized: true,
      error: null,
    }
    const action = await refreshToken()(vi.fn(), () => ({}) as never, undefined)
    const state = authReducer(loggedIn, action)
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('test@example.com')
  })

  it('fetchCurrentUser sets authenticated when session exists', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser })
    const action = await fetchCurrentUser(undefined)(vi.fn(), () => ({}) as never, undefined)
    const state = authReducer(initialState, action)
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.full_name).toBe('Test User')
  })

  it('login rejection marks auth as initialized so protected routes do not spin forever', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    })
    const pendingState: AuthState = {
      ...initialState,
      isLoading: true,
      authInitialized: false,
    }
    const action = await login({ email: 'test@example.com', password: 'wrong' })(
      vi.fn(),
      () => ({}) as never,
      undefined,
    )
    const state = authReducer(pendingState, action)
    expect(state.authInitialized).toBe(true)
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBe('Invalid credentials')
  })

  it('register rejection marks auth as initialized', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { error: { message: 'Email already registered' } } },
    })
    const pendingState: AuthState = {
      ...initialState,
      isLoading: true,
      authInitialized: false,
    }
    const action = await register({
      full_name: 'Test User',
      email: 'test@example.com',
      password: 'Password1',
    })(vi.fn(), () => ({}) as never, undefined)
    const state = authReducer(pendingState, action)
    expect(state.authInitialized).toBe(true)
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBe('Email already registered')
  })
})
