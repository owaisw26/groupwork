import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import api from '../services/api'
import { createTestStore } from '../test-utils'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn().mockRejectedValue(new Error('not authenticated')),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

describe('App', () => {
  it('renders without crashing', async () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      </Provider>,
    )

    expect(await screen.findByRole('heading', { name: /log in to groupwork/i })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalled()
  })
})
