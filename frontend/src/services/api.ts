import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers.set('X-CSRF-Token', csrfToken)
    }
  }
  return config
})

let isRefreshing = false
let refreshSubscribers: Array<(success: boolean) => void> = []

function subscribeTokenRefresh(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback)
}

function onRefreshSettled(success: boolean) {
  refreshSubscribers.forEach((callback) => callback(success))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((success) => {
            if (success) {
              resolve(api(originalRequest))
            } else {
              reject(error)
            }
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await refreshClient.post('/auth/refresh')
        isRefreshing = false
        onRefreshSettled(true)
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        onRefreshSettled(false)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api
