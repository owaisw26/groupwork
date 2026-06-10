import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CreateProjectDialog from '../CreateProjectDialog'
import projectsReducer from '../../store/projectsSlice'
import { getTodayDateInputValue } from '../../utils/dateInput'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../services/api'

function renderDialog() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      auth: () => ({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          full_name: 'Owner',
          email_verified: true,
          has_completed_onboarding: true,
          created_at: '',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
    },
  })

  return render(
    <Provider store={store}>
      <CreateProjectDialog open onClose={vi.fn()} />
    </Provider>,
  )
}

describe('CreateProjectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'project-1',
        name: 'New Project',
        description: null,
        course: null,
        due_date: getTodayDateInputValue(),
        status: 'active',
        owner_id: 'user-1',
        join_code: 'ABC123',
        join_code_expires_at: '2026-12-31T00:00:00Z',
        max_members: 6,
        created_at: '2026-01-01T00:00:00Z',
      },
    })
  })

  it('defaults the due date to today when creating a project', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByLabelText(/due date/i)).toHaveValue(getTodayDateInputValue())

    await user.type(screen.getByLabelText(/project name/i), 'New Project')
    await user.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/projects', expect.objectContaining({
        name: 'New Project',
        due_date: getTodayDateInputValue(),
      }))
    })
  })
})
