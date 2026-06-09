import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PeerReviewPage from '../PeerReviewPage'
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

function renderPeerReviewPage() {
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
      <MemoryRouter initialEntries={['/projects/proj-1/peer-review']}>
        <Routes>
          <Route path="/projects/:id/peer-review" element={<PeerReviewPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('PeerReviewPage disputes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/projects/proj-1/members') {
        return Promise.resolve({
          data: [
            { id: 'user-1', full_name: 'Owner', email: 'owner@example.com' },
            { id: 'user-2', full_name: 'Member', email: 'member@example.com' },
          ],
        })
      }
      if (url === '/projects/proj-1/peer-review/status') {
        return Promise.resolve({
          data: {
            project_status: 'peer_review',
            is_open: true,
            submitted_count: 0,
            total_members: 2,
            submitted_by: [],
            pending_members: [],
            reviewed_reviewee_ids: [],
            non_submitters: [],
            peer_review_ends_at: null,
            deadline_passed: false,
          },
        })
      }
      if (url === '/users/me') return Promise.resolve({ data: { id: 'user-2' } })
      if (url === '/projects/proj-1/tasks') return Promise.resolve({ data: { items: [task] } })
      if (url === '/tasks/task-1/disputes') return Promise.resolve({ data: { items: [openDispute] } })
      return Promise.resolve({ data: [] })
    })
    vi.mocked(api.post).mockResolvedValue({ data: { ...openDispute, status: 'resolved' } })
  })

  it('lets only the filing member resolve an open dispute from the disputes list', async () => {
    const user = userEvent.setup()
    renderPeerReviewPage()

    await user.click(await screen.findByRole('button', { name: /dispute resolved/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/disputes/dispute-1/resolve')
    })
  })
})
