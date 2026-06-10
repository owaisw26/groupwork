import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
  it('renders coming soon message', () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })
    expect(screen.getByText(/password reset by email is coming soon/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument()
  })

  it('does not call password reset email endpoint', () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })
})
