import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PeerReviewPage from '../PeerReviewPage'
import projectsReducer from '../../../store/projectsSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

let projectStatus = 'peer_review'
let isOpen = true

function renderPeerReviewPage() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
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

describe('PeerReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectStatus = 'peer_review'
    isOpen = true
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'ok' } })
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
            project_status: projectStatus,
            is_open: isOpen,
            submitted_count: isOpen ? 0 : 2,
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
      if (url === '/projects/proj-1') {
        return Promise.resolve({
          data: {
            id: 'proj-1',
            name: 'Project',
            description: null,
            course: null,
            due_date: null,
            status: projectStatus,
            owner_id: 'user-1',
            join_code: 'ABC123',
            join_code_expires_at: '2026-12-31T00:00:00Z',
            max_members: 6,
            created_at: '',
          },
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('keeps task disputes out of the peer review page', async () => {
    renderPeerReviewPage()

    expect(await screen.findByText('Peer Review')).toBeInTheDocument()
    expect(screen.queryByText(/task disputes/i)).not.toBeInTheDocument()
  })

  it('shows completed message after all peer reviews are submitted', async () => {
    projectStatus = 'completed'
    isOpen = false

    renderPeerReviewPage()

    expect(await screen.findByText(/all peer reviews have been submitted/i)).toBeInTheDocument()
  })

  it('refreshes the project after submitting a peer review', async () => {
    const user = userEvent.setup()
    renderPeerReviewPage()

    await user.click(await screen.findByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/projects/proj-1')
    })
  })
})
