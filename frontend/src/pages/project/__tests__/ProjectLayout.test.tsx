import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeaderBridgeProvider } from '../../../contexts/HeaderBridgeContext'
import ProjectLayout from '../ProjectLayout'
import projectsReducer from '../../../store/projectsSlice'
import tasksReducer from '../../../store/tasksSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

const project = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'A test project',
  course: null,
  due_date: '2026-12-31',
  status: 'active',
  owner_id: 'user-1',
  join_code: 'ABC123',
  join_code_expires_at: '2026-12-31T00:00:00Z',
  max_members: 6,
  member_count: 2,
  created_at: '2026-01-01T00:00:00Z',
}

const members = [
  { id: 'user-1', full_name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
  { id: 'user-2', full_name: 'Bob Member', email: 'bob@example.com', role: 'member' },
]

function OpenCreateHarness() {
  const { openCreateTask } = useOutletContext<{ openCreateTask: () => void }>()
  return <button onClick={openCreateTask}>Open Create Dialog</button>
}

function renderProjectLayout() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      tasks: tasksReducer,
      auth: () => ({
        user: {
          id: 'user-1',
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
      tasks: { items: [], myTasks: [], searchResults: [], currentTask: null, activeDetailTaskId: null, lastSearchQuery: '', myTasksLoading: false, subtasks: [], comments: [], timeLogs: [], totalProjectHours: 0, editRequests: [], isLoading: false, error: null },
    },
  })

  return render(
    <Provider store={store}>
      <HeaderBridgeProvider>
        <MemoryRouter initialEntries={['/projects/proj-1/tasks']}>
          <Routes>
            <Route path="/projects/:id" element={<ProjectLayout />}>
              <Route path="tasks" element={<OpenCreateHarness />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </HeaderBridgeProvider>
    </Provider>,
  )
}

describe('ProjectLayout create task dialog', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/projects/proj-1') return Promise.resolve({ data: project })
      if (url === '/dashboard') {
        return Promise.resolve({ data: { my_tasks: [], upcoming_deadlines: [], recent_activity: [] } })
      }
      if (url === '/projects/proj-1/members') return Promise.resolve({ data: members })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'task-new',
        project_id: 'proj-1',
        title: 'New task',
        description: null,
        status: 'todo',
        priority: 'medium',
        due_date: null,
        verification_status: 'unverified',
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        assignee_ids: ['user-1'],
      },
    })
  })

  it('renders due date, priority, and assignee fields in create dialog', async () => {
    const user = userEvent.setup()
    renderProjectLayout()

    await user.click(await screen.findByRole('button', { name: 'Open Create Dialog' }))

    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assignees/i)).toBeInTheDocument()
  })

  it('submits due_date, priority, and assignee_ids when creating a task', async () => {
    const user = userEvent.setup()
    renderProjectLayout()

    await user.click(await screen.findByRole('button', { name: 'Open Create Dialog' }))
    await user.type(screen.getByLabelText(/^title$/i), 'Ship feature')
    await user.type(screen.getByLabelText(/due date/i), '2026-07-15')

    const prioritySelect = screen.getByLabelText(/priority/i)
    await user.click(prioritySelect)
    await user.click(await screen.findByRole('option', { name: 'High' }))

    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/projects/proj-1/tasks', {
        title: 'Ship feature',
        priority: 'high',
        due_date: '2026-07-15',
        assignee_ids: ['user-1'],
      })
    })
  })

  it('defaults priority to medium and pre-selects the current user as assignee', async () => {
    const user = userEvent.setup()
    renderProjectLayout()

    await user.click(await screen.findByRole('button', { name: 'Open Create Dialog' }))
    await user.type(screen.getByLabelText(/^title$/i), 'Default fields task')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/projects/proj-1/tasks', {
        title: 'Default fields task',
        priority: 'medium',
        assignee_ids: ['user-1'],
      })
    })
  })
})
