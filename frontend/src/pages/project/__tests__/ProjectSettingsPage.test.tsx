import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectSettingsPage from '../ProjectSettingsPage'
import projectsReducer from '../../../store/projectsSlice'

vi.mock('../../../services/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

const project = {
  id: 'proj-1',
  name: 'Mistake Project',
  description: 'Created by accident',
  course: null,
  due_date: '2026-12-31',
  status: 'active',
  owner_id: 'user-1',
  join_code: 'ABC123',
  join_code_expires_at: '2026-12-31T00:00:00Z',
  max_members: 6,
  member_count: 1,
  created_at: '2026-01-01T00:00:00Z',
}

function renderSettingsPage({ userId = 'user-1' }: { userId?: string } = {}) {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      auth: () => ({
        user: {
          id: userId,
          email: 'alice@example.com',
          full_name: 'Alice Owner',
          email_verified: true,
          has_completed_onboarding: true,
          created_at: '',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
    },
    preloadedState: {
      projects: {
        items: [project],
        currentProject: project,
        dashboard: { my_tasks: [], upcoming_deadlines: [], recent_activity: [] },
        isLoading: false,
        error: null,
      },
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/projects/proj-1/settings']}>
        <Routes>
          <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
          <Route path="/dashboard" element={<div>Dashboard Home</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('ProjectSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.delete).mockResolvedValue({ data: { status: 'ok' } })
    vi.mocked(api.get).mockResolvedValue({
      data: { my_tasks: [], upcoming_deadlines: [], recent_activity: [] },
    })
  })

  it('lets the owner delete a project after confirming the project name', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await user.click(screen.getByRole('button', { name: /^delete project$/i }))

    const dialog = screen.getByRole('dialog', { name: /delete project/i })
    const confirmButton = within(dialog).getByRole('button', { name: /^delete project$/i })
    expect(confirmButton).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/project name/i), project.name)
    expect(confirmButton).toBeEnabled()
    await user.click(confirmButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/projects/proj-1')
    })
    expect(await screen.findByText('Dashboard Home')).toBeInTheDocument()
  })

  it('does not allow non-owner members to delete the project', () => {
    renderSettingsPage({ userId: 'user-2' })

    expect(screen.getByText(/only the project owner can delete this project/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete project$/i })).toBeDisabled()
  })
})
