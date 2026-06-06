import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import api from '../../services/api'
import { renderWithProviders } from '../../test-utils'
import LoginPage from '../auth/LoginPage'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows register form inline when sign up is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })
    await user.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows error on empty submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
  })

  it('calls API on valid submit', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        email_verified: true,
        has_completed_onboarding: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    })
    renderWithProviders(<LoginPage />, { route: '/login' })
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Password1',
      })
    })
  })
})
