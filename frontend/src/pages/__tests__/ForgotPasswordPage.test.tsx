import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import api from '../../services/api'
import { renderWithProviders } from '../../test-utils'
import ForgotPasswordPage from '../auth/ForgotPasswordPage'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

describe('ForgotPasswordPage', () => {
  it('renders email form', () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('submits email and shows success message', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({ data: { status: 'ok' } })
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      })
    })
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })
})
