import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DisputesPage from '../DisputesPage'
import projectsReducer from '../../../store/projectsSlice'
import tasksReducer, { type Task } from '../../../store/tasksSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

const task: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Disputed task',
  description: null,
  status: 'review',
  priority: 'medium',
  due_date: null,
  verification_status: 'disputed',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-06-09T12:00:00Z',
  assignee_ids: ['user-1'],
}

const openDispute = {
  id: 'dispute-1',
  task_id: 'task-1',
  filed_by: 'user-2',
  reason: 'Evidence is incomplete',
  status: 'open',
  outcome: null,
  created_at: '2026-06-09T12:05:00Z',
  resolved_at: null,
  votes: [],
  vote_summary: { uphold: 0, reject: 0, total_members: 2 },
}

function renderDisputesPage() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      tasks: tasksReducer,
      auth: () => ({
        user: {
          id: 'user-2',
          email: 'member@example.com',
          full_name: 'Member',
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
        items: [],
        currentProject: null,
        dashboard: null,
        isLoading: false,
        error: null,
      },
      tasks: {
        items: [task],
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
      },
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/projects/proj-1/disputes']}>
        <Routes>
          <Route path="/projects/:id/disputes" element={<DisputesPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('DisputesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/users/me') return Promise.resolve({ data: { id: 'user-2' } })
      if (url === '/projects/proj-1/tasks') return Promise.resolve({ data: { items: [task] } })
      if (url === '/tasks/task-1/disputes') return Promise.resolve({ data: { items: [openDispute] } })
      return Promise.resolve({ data: [] })
    })
    vi.mocked(api.post).mockResolvedValue({ data: { ...openDispute, status: 'resolved' } })
  })

  it('lets only the filing member resolve an open dispute from the disputes page', async () => {
    const user = userEvent.setup()
    renderDisputesPage()

    const menuButton = await screen.findByRole('button', { name: /dispute actions/i })
    await user.click(menuButton)
    await user.click(await screen.findByRole('menuitem', { name: /mark resolved/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/disputes/dispute-1/resolve')
    })
  })
})
