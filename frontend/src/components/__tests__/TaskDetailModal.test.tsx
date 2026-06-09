import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TaskDetailModal from '../TaskDetailModal'
import tasksReducer, { type Task } from '../../store/tasksSlice'
import projectsReducer from '../../store/projectsSlice'

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../services/api'

const task: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Original title',
  description: 'Original description',
  status: 'todo',
  priority: 'medium',
  due_date: '2026-06-01',
  verification_status: 'unverified',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  assignee_ids: ['user-1'],
}

const members = [
  { id: 'user-1', full_name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
  { id: 'user-2', full_name: 'Bob Member', email: 'bob@example.com', role: 'member' },
]

let currentApiTask = task

function renderModal({
  ownerId = 'user-1',
  userId = 'user-1',
  taskOverride = {},
}: {
  ownerId?: string
  userId?: string
  taskOverride?: Partial<Task>
} = {}) {
  const modalTask = { ...task, ...taskOverride }
  currentApiTask = modalTask
  const store = configureStore({
    reducer: {
      tasks: tasksReducer,
      projects: projectsReducer,
      auth: () => ({
        user: {
          id: userId,
          email: 'user@example.com',
          full_name: userId === 'user-1' ? 'Alice Owner' : 'Bob Member',
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
      tasks: {
        items: [modalTask],
        myTasks: [],
        searchResults: [],
        currentTask: modalTask,
        activeDetailTaskId: 'task-1',
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
      projects: {
        items: [{
          id: 'proj-1',
          name: 'Test',
          description: null,
          course: null,
          due_date: null,
          status: 'active',
          owner_id: ownerId,
          join_code: 'ABC123',
          join_code_expires_at: '2026-12-31T00:00:00Z',
          max_members: 6,
          created_at: '',
        }],
        currentProject: null,
        dashboard: null,
        isLoading: false,
        error: null,
      },
    },
  })

  return render(
    <Provider store={store}>
      <TaskDetailModal
        taskId="task-1"
        projectOwnerId={ownerId}
        onClose={() => {}}
      />
    </Provider>,
  )
}

describe('TaskDetailModal task metadata', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/tasks/task-1') return Promise.resolve({ data: currentApiTask })
      if (url === '/tasks/task-1/subtasks') return Promise.resolve({ data: [] })
      if (url === '/tasks/task-1/comments') return Promise.resolve({ data: [] })
      if (url === '/tasks/task-1/time-logs') {
        return Promise.resolve({ data: { items: [], total_hours_for_user_in_project: 0 } })
      }
      if (url === '/tasks/task-1/evidence') return Promise.resolve({ data: { items: [] } })
      if (url === '/tasks/task-1/verifications') return Promise.resolve({ data: { items: [] } })
      if (url === '/tasks/task-1/disputes') return Promise.resolve({ data: { items: [] } })
      if (url === '/tasks/task-1/edit-requests') return Promise.resolve({ data: [] })
      if (url === '/projects/proj-1/members') return Promise.resolve({ data: members })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
    vi.mocked(api.put).mockResolvedValue({
      data: { ...task, priority: 'high', due_date: '2026-09-10', assignee_ids: ['user-1', 'user-2'] },
    })
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'ok' } })
  })

  it('shows assignee names in view mode', async () => {
    renderModal()
    expect(await screen.findByText('Alice Owner')).toBeInTheDocument()
  })

  it('shows priority, due date, and assignee controls in owner edit mode', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(await screen.findByRole('button', { name: 'Edit Task' }))

    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assignees/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument()
  })

  it('dispatches updateTask with changed priority, due date, and assignees on save', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(await screen.findByRole('button', { name: 'Edit Task' }))

    const prioritySelect = screen.getByRole('combobox', { name: /priority/i })
    await user.click(prioritySelect)
    await user.click(await screen.findByRole('option', { name: 'High' }))

    const dueDateInput = screen.getByLabelText(/due date/i)
    await user.clear(dueDateInput)
    await user.type(dueDateInput, '2026-09-10')

    const assigneesSelect = screen.getByLabelText(/assignees/i)
    await user.click(assigneesSelect)
    await user.click(await screen.findByRole('option', { name: 'Bob Member' }))
    await user.keyboard('{Escape}')

    await user.click(await screen.findByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/tasks/task-1', {
        title: 'Original title',
        description: 'Original description',
        priority: 'high',
        due_date: '2026-09-10',
        assignee_ids: ['user-1', 'user-2'],
      })
    })
  })

  it('does not show direct edit controls for non-owner members', async () => {
    const user = userEvent.setup()
    renderModal({ ownerId: 'user-1', userId: 'user-2' })

    expect(screen.queryByRole('button', { name: 'Edit Task' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Request Edit' }))
    expect(screen.getByLabelText(/proposed title/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/assignees/i)).not.toBeInTheDocument()
  })

  it('does not expose dispute creation inside the task modal', async () => {
    renderModal({
      ownerId: 'user-1',
      userId: 'user-2',
      taskOverride: {
        status: 'review',
        verification_status: 'pending',
      },
    })

    expect(await screen.findByText(/no verification votes yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dispute/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/dispute reason/i)).not.toBeInTheDocument()
  })

  it('shows a success popup after verifying inside the task modal', async () => {
    const user = userEvent.setup()
    renderModal({
      ownerId: 'user-1',
      userId: 'user-2',
      taskOverride: {
        status: 'review',
        verification_status: 'pending',
      },
    })

    await user.click(await screen.findByRole('button', { name: /^verify$/i }))

    expect(await screen.findByText(/original title.*verified/i)).toBeInTheDocument()
  })
})
