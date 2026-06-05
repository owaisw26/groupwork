import { configureStore } from '@reduxjs/toolkit'
import type React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import authReducer from './store/authSlice'
import notificationsReducer from './store/notificationsSlice'
import projectsReducer from './store/projectsSlice'
import tasksReducer from './store/tasksSlice'

export function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      projects: projectsReducer,
      tasks: tasksReducer,
      notifications: notificationsReducer,
    },
  })
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    ...renderOptions
  }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const store = createTestStore()
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    )
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
