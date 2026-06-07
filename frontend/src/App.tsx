import { Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import MyTasksPage from './pages/MyTasksPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import ProjectLayout from './pages/project/ProjectLayout'
import MembersTab from './pages/project/MembersTab'
import EvidenceTab from './pages/project/EvidenceTab'
import MeetingsTab from './pages/project/MeetingsTab'
import PeerReviewPage from './pages/project/PeerReviewPage'
import ProjectPlaceholderPage from './pages/project/ProjectPlaceholderPage'
import ReportPreviewPage from './pages/project/ReportPreviewPage'
import ActivityTab from './pages/project/ActivityTab'
import TasksTab from './pages/project/TasksTab'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { fetchCurrentUser } from './store/authSlice'
import theme from './theme'

const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true
  }
  return (
    pathname.startsWith('/reset-password/')
    || pathname.startsWith('/verify-email/')
    || pathname.startsWith('/invitations/accept/')
  )
}

function AppRoutes() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { isAuthenticated, authInitialized, user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    const controller = new AbortController()
    dispatch(fetchCurrentUser(controller.signal))
    return () => controller.abort()
  }, [dispatch])

  const authRedirectPath =
    isAuthenticated && user && !user.has_completed_onboarding ? '/onboarding' : '/dashboard'

  if (!authInitialized && !isPublicPath(location.pathname)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={authRedirectPath} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={authRedirectPath} replace /> : <RegisterPage />}
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/invitations/accept/:token" element={<AcceptInvitationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/projects/:id" element={<ProjectLayout />}>
            <Route index element={<Navigate to="tasks" replace />} />
            <Route path="tasks" element={<TasksTab />} />
            <Route path="activity" element={<ActivityTab />} />
            <Route path="meetings" element={<MeetingsTab />} />
            <Route path="members" element={<MembersTab />} />
            <Route path="evidence" element={<EvidenceTab />} />
            <Route path="peer-review" element={<PeerReviewPage />} />
            <Route path="settings" element={<ProjectPlaceholderPage title="Settings" />} />
            <Route path="report" element={<ReportPreviewPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  )
}

export default App
