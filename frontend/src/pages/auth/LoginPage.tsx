import { Box } from '@mui/material'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import LoginCard from '../../components/auth/LoginCard'
import LoginHeroPanel from '../../components/auth/LoginHeroPanel'
import RegisterCard from '../../components/auth/RegisterCard'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearAuthError, login, register } from '../../store/authSlice'
import { checkPasswordStrength } from '../../utils/passwordValidation'

type AuthMode = 'login' | 'register'

interface LoginPageProps {
  initialMode?: AuthMode
}

export default function LoginPage({ initialMode = 'login' }: LoginPageProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loginValidationError, setLoginValidationError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerValidationError, setRegisterValidationError] = useState<string | null>(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const clearAuthState = () => {
    dispatch(clearAuthError())
    setLoginValidationError(null)
    setRegisterValidationError(null)
  }

  const switchToRegister = () => {
    clearAuthState()
    setRegisterSuccess(false)
    setAuthMode('register')
  }

  const switchToLogin = () => {
    clearAuthState()
    setRegisterSuccess(false)
    setAuthMode('login')
  }

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setLoginValidationError(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setLoginValidationError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLoginValidationError('Please enter a valid email address')
      return
    }
    if (!password) {
      setLoginValidationError('Password is required')
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

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setRegisterValidationError(null)
    setRegisterSuccess(false)

    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedFullName || !trimmedEmail || !registerPassword || !confirmPassword) {
      setRegisterValidationError('All fields are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegisterValidationError('Please enter a valid email address')
      return
    }
    if (registerPassword !== confirmPassword) {
      setRegisterValidationError('Passwords do not match')
      return
    }
    if (!checkPasswordStrength(registerPassword).isValid) {
      setRegisterValidationError('Password does not meet requirements')
      return
    }

    const result = await dispatch(
      register({
        full_name: trimmedFullName,
        email: trimmedEmail.toLowerCase(),
        password: registerPassword,
      }),
    )
    if (register.fulfilled.match(result)) {
      setRegisterSuccess(true)
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
      <Box
        key={authMode}
        sx={{
          minHeight: '100vh',
          '@keyframes authPanelFadeIn': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'authPanelFadeIn 220ms ease',
        }}
      >
        {authMode === 'login' ? (
          <LoginCard
            email={email}
            password={password}
            rememberMe={rememberMe}
            isLoading={isLoading}
            validationError={loginValidationError}
            apiError={error}
            showMobileLogo
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onRememberMeChange={setRememberMe}
            onSubmit={handleLoginSubmit}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterCard
            fullName={fullName}
            email={email}
            password={registerPassword}
            confirmPassword={confirmPassword}
            isLoading={isLoading}
            validationError={registerValidationError}
            apiError={error}
            success={registerSuccess}
            showMobileLogo
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onPasswordChange={setRegisterPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={handleRegisterSubmit}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </Box>
    </Box>
  )
}
