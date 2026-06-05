import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import api from '../../services/api'
import { renderWithProviders } from '../../test-utils'
import RegisterPage from '../auth/RegisterPage'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

describe('RegisterPage', () => {
  it('renders all registration fields', () => {
    renderWithProviders(<RegisterPage />, { route: '/register' })
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows password strength indicator', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.type(screen.getByLabelText(/^password/i), 'weak')
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('validates password match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password2')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('calls API on valid submit', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: '1',
        email: 'new@example.com',
        full_name: 'New User',
        email_verified: false,
        has_completed_onboarding: false,
        created_at: '2026-01-01T00:00:00Z',
      },
    })
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.type(screen.getByLabelText(/full name/i), 'New User')
    await user.type(screen.getByLabelText(/^email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        full_name: 'New User',
        email: 'new@example.com',
        password: 'Password1',
      })
    })
  })
})
