import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EvidenceUpload from '../EvidenceUpload'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

import api from '../../services/api'

describe('EvidenceUpload', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('shows the API error message when storage is not configured', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'File storage is not configured',
          },
        },
      },
    })

    const { container } = render(<EvidenceUpload taskId="task-1" />)
    const input = container.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(['test'], 'evidence.pdf', { type: 'application/pdf' })],
      },
    })

    await waitFor(() => {
      expect(screen.getByText('File storage is not configured')).toBeInTheDocument()
    })
  })
})
