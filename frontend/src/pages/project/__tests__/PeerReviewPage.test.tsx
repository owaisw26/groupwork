import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PeerReviewPage from '../PeerReviewPage'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

function renderPeerReviewPage() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/peer-review']}>
      <Routes>
        <Route path="/projects/:id/peer-review" element={<PeerReviewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PeerReviewPage', () => {
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
      return Promise.resolve({ data: [] })
    })
  })

  it('keeps task disputes out of the peer review page', async () => {
    renderPeerReviewPage()

    expect(await screen.findByText('Peer Review')).toBeInTheDocument()
    expect(screen.queryByText(/task disputes/i)).not.toBeInTheDocument()
  })
})
