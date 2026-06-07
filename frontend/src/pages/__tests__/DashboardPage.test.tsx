import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DashboardPage from '../DashboardPage'
import projectsReducer from '../../store/projectsSlice'

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../services/api'

function renderDashboard() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      auth: () => ({
        user: { id: '1', email: 'test@example.com', full_name: 'Test', email_verified: true, has_completed_onboarding: true, created_at: '' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/dashboard') {
        return Promise.resolve({
          data: {
            my_tasks: [],
            upcoming_deadlines: [],
            recent_activity: [],
          },
        })
      }
      if (url === '/projects') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
  })

  it('renders dashboard summary cards and widgets', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getAllByText('My Tasks').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Upcoming Deadlines').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Recent Activity').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
  })

  it('shows empty state for new user', async () => {
    renderDashboard()

    expect(await screen.findByText('No tasks assigned yet.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming deadlines.')).toBeInTheDocument()
    expect(screen.getByText('No recent activity.')).toBeInTheDocument()
  })
})
