import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import MembersTab from '../MembersTab'
import projectsReducer from '../../../store/projectsSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

function renderMembersTab() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
      auth: () => ({
        user: { id: 'owner-1', email: 'owner@example.com', full_name: 'Owner', email_verified: true, has_completed_onboarding: true, created_at: '' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
    },
    preloadedState: {
      projects: {
        items: [{
          id: 'proj-1', name: 'Test', description: null, course: null, due_date: null,
          status: 'active', owner_id: 'owner-1', join_code: 'ABC123',
          join_code_expires_at: '2026-12-31T00:00:00Z', max_members: 6, created_at: '',
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
      <MemoryRouter initialEntries={['/projects/proj-1/members']}>
        <Routes>
          <Route path="/projects/:id/members" element={<MembersTab />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('MembersTab', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 'owner-1', full_name: 'Owner', email: 'owner@example.com', role: 'owner' }],
    })
  })

  it('renders member cards and invite coming soon notice', async () => {
    renderMembersTab()
    expect(await screen.findByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Email Invites Soon')).toBeInTheDocument()
    expect(screen.getByText(/email invites are a feature coming soon/i)).toBeInTheDocument()
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })
})
