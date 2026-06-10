import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportPreviewPage from '../ReportPreviewPage'
import projectsReducer from '../../../store/projectsSlice'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../../services/api'

const completedProject = {
  id: 'proj-1',
  name: 'Report Project',
  description: null,
  course: null,
  due_date: null,
  status: 'completed',
  owner_id: 'user-1',
  join_code: 'ABC123',
  join_code_expires_at: '2026-12-31T00:00:00Z',
  max_members: 6,
  member_count: 2,
  created_at: '2026-01-01T00:00:00Z',
}

const reportPreview = {
  project: { id: 'proj-1', name: 'Report Project', course: null, status: 'report_generated', due_date: null },
  generated_at: '2026-06-10T00:00:00Z',
  task_summary: { total_tasks: 2, completed_tasks: 1, by_status: { done: 1 }, items: [] },
  time_logs: { total_hours: 4, by_member: [] },
  contribution_metrics: {
    items: [
      { user_id: 'user-1', user_name: 'Alice Owner', assigned_tasks: 1, completed_tasks: 1, hours: 2.5 },
      { user_id: 'user-2', user_name: 'Bob Member', assigned_tasks: 1, completed_tasks: 0, hours: 1.5 },
    ],
  },
  peer_scores: { items: [] },
  disputes: { total: 0, open: 0, resolved: 0, items: [] },
  attendance: { total_meetings: 0, by_member: [] },
}

function renderReportPage() {
  const store = configureStore({
    reducer: {
      projects: projectsReducer,
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
        items: [completedProject],
        currentProject: completedProject,
        dashboard: null,
        isLoading: false,
        error: null,
      },
    },
  })

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/projects/proj-1/report']}>
        <Routes>
          <Route path="/projects/:id/report" element={<ReportPreviewPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('ReportPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lets the owner generate a completed project report before showing the graph', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get)
      .mockRejectedValueOnce({
        response: {
          data: { error: { message: 'Report is only available for report-generated or archived projects' } },
        },
      })
      .mockResolvedValue({ data: reportPreview })
    vi.mocked(api.post).mockResolvedValue({
      data: { ...completedProject, status: 'report_generated', report_s3_key: 'reports/proj-1.pdf' },
    })

    renderReportPage()

    expect(await screen.findByText('Generate the contribution report to view this project summary.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generate Report' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/projects/proj-1/generate-report')
    })
    expect(await screen.findByText('Member Contribution Graph')).toBeInTheDocument()
    expect(screen.getByText('Alice Owner')).toBeInTheDocument()
    expect(screen.getByText('Bob Member')).toBeInTheDocument()
  })
})
