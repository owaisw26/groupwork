import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TasksTab from '../TasksTab'
import projectsReducer from '../../../store/projectsSlice'
import tasksReducer, { type Task } from '../../../store/tasksSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

vi.mock('../../../components/TaskDetailModal', () => ({
  default: ({ taskId }: { taskId: string | null }) => (
    taskId ? <div>Task detail modal opened</div> : null
  ),
}))

vi.mock('../../../components/ActivityFeed', () => ({
  default: () => <div>Activity feed</div>,
}))

import api from '../../../services/api'

const reviewTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Review task',
  description: null,
  status: 'review',
  priority: 'medium',
  due_date: null,
  verification_status: 'pending',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-06-09T12:00:00Z',
  assignee_ids: ['user-1'],
}

function renderTasksTab() {
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
        items: [{
          id: 'proj-1',
          name: 'Project',
          description: null,
          course: null,
          due_date: null,
          status: 'active',
          owner_id: 'user-1',
          join_code: 'ABC123',
          join_code_expires_at: '2026-12-31T00:00:00Z',
          max_members: 6,
          created_at: '',
          member_count: 2,
        }],
        currentProject: null,
        dashboard: { my_tasks: [], upcoming_deadlines: [], recent_activity: [] },
        isLoading: false,
        error: null,
      },
      tasks: {
        items: [reviewTask],
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
      <MemoryRouter initialEntries={['/projects/proj-1/tasks']}>
        <Routes>
          <Route path="/projects/:id" element={<Outlet context={{ openCreateTask: vi.fn() }} />}>
            <Route path="tasks" element={<TasksTab />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('TasksTab dispute flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/projects/proj-1/tasks') return Promise.resolve({ data: { items: [reviewTask] } })
      if (url === '/projects/proj-1/members') {
        return Promise.resolve({
          data: [
            { id: 'user-1', full_name: 'Owner' },
            { id: 'user-2', full_name: 'Member' },
          ],
        })
      }
      if (url === '/tasks/task-1/subtasks') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'ok' } })
  })

  it('opens a separate dispute dialog from the peer verification card', async () => {
    const user = userEvent.setup()
    renderTasksTab()

    await user.click(await screen.findByRole('button', { name: /dispute/i }))

    expect(screen.getByRole('dialog', { name: /file task dispute/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/reason for dispute/i)).toBeInTheDocument()
    expect(screen.queryByText('Task detail modal opened')).not.toBeInTheDocument()
  })

  it('shows a success popup after verifying from the peer verification card', async () => {
    const user = userEvent.setup()
    renderTasksTab()

    await user.click(await screen.findByRole('button', { name: /verify/i }))

    expect(await screen.findByText(/review task.*verified/i)).toBeInTheDocument()
  })
})
