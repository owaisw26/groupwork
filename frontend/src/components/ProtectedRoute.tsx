import { CircularProgress, Box } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth)
  const location = useLocation()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.has_completed_onboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  if (user && !user.has_completed_onboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
