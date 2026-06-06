import { Box } from '@mui/material'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import LoginCard from '../../components/auth/LoginCard'
import LoginHeroPanel from '../../components/auth/LoginHeroPanel'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearAuthError, login } from '../../store/authSlice'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setValidationError(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setValidationError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address')
      return
    }
    if (!password) {
      setValidationError('Password is required')
      return
    }

    const result = await dispatch(
      login({ email: trimmedEmail.toLowerCase(), password }),
    )
    if (login.fulfilled.match(result)) {
      const user = result.payload
      const from = (location.state as { from?: Location } | null)?.from?.pathname
      const destination =
        from && from !== '/login'
          ? from
          : user.has_completed_onboarding
            ? '/dashboard'
            : '/onboarding'
      navigate(destination)
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
        bgcolor: '#FFFFFF',
        fontFamily: '"Atlassian Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <LoginHeroPanel />
      <LoginCard
        email={email}
        password={password}
        rememberMe={rememberMe}
        isLoading={isLoading}
        validationError={validationError}
        apiError={error}
        showMobileLogo
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onRememberMeChange={setRememberMe}
        onSubmit={handleSubmit}
      />
    </Box>
  )
}
