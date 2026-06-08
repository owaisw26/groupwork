import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, Checkbox, CircularProgress, Link, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import AuthCardShell from './AuthCardShell'
import AuthTextField from './AuthTextField'
import { AUTH_TOGGLE_SX, PRIMARY, PRIMARY_DARK, SLATE } from './authTheme'

interface LoginCardProps {
  email: string
  password: string
  rememberMe: boolean
  isLoading: boolean
  validationError: string | null
  apiError: string | null
  showMobileLogo?: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onRememberMeChange: (checked: boolean) => void
  onSubmit: (event: React.FormEvent) => void
  onSwitchToRegister: () => void
}

export default function LoginCard({
  email,
  password,
  rememberMe,
  isLoading,
  validationError,
  apiError,
  showMobileLogo = false,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  onSwitchToRegister,
}: LoginCardProps) {
  const [showPassword, setShowPassword] = useState(false)

  const formError = apiError
  const emailError =
    validationError && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ? validationError
      : null
  const passwordError =
    validationError && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !password
      ? validationError
      : null

  return (
    <AuthCardShell
      ariaLabel="Login form"
      showMobileLogo={showMobileLogo}
      securityMessage="Secure login - Your data is protected with enterprise-grade security."
    >
      <Box sx={{ textAlign: 'center', mb: { xs: 4, lg: 3 } }}>
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: 32, sm: 42, lg: 29, xl: 32 },
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: 0,
              color: SLATE[900],
              mb: { xs: 2, lg: 1.7 },
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, lg: 12, xl: 13 }, color: SLATE[500], m: 0 }}>
            Log in to continue to your GroupWork workspace.
          </Typography>
        </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          component="form"
          onSubmit={onSubmit}
          noValidate
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: isLoading ? 'none' : 'auto',
            opacity: isLoading ? 0.78 : 1,
          }}
        >
          <AuthTextField
            id="email"
            label="Email address"
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            icon={<EmailOutlinedIcon fontSize="small" />}
            hasError={!!emailError}
            errorMessage={emailError ?? undefined}
            onChange={onEmailChange}
          />

          <AuthTextField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            placeholder="Enter your password"
            autoComplete="current-password"
            icon={<LockOutlinedIcon fontSize="small" />}
            hasError={!!passwordError}
            errorMessage={passwordError ?? undefined}
            onChange={onPasswordChange}
            trailing={
              <Box
                component="button"
                type="button"
                aria-label={showPassword ? 'Hide characters' : 'Show characters'}
                onClick={() => setShowPassword((prev) => !prev)}
                sx={{
                  border: 'none',
                  bgcolor: 'transparent',
                  color: SLATE[500],
                  cursor: 'pointer',
                  display: 'flex',
                  p: 0.5,
                  '&:focus-visible': {
                    outline: '3px solid rgba(37, 99, 235, 0.35)',
                    outlineOffset: 3,
                    borderRadius: 1,
                  },
                }}
              >
                {showPassword ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </Box>
            }
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: '4px',
              mb: { xs: '40px', lg: '29px' },
            }}
          >
            <Box
              component="label"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: { xs: '14px', lg: '9px' },
                fontSize: { xs: 16, lg: 11 },
                color: SLATE[700],
                cursor: 'pointer',
              }}
            >
              <Checkbox
                checked={rememberMe}
                onChange={(e) => onRememberMeChange(e.target.checked)}
                size="small"
                sx={{
                  p: 0,
                  width: { xs: 18, lg: 14 },
                  height: { xs: 18, lg: 14 },
                  color: SLATE[300],
                  '&.Mui-checked': { color: PRIMARY },
                }}
              />
              <span>Remember me</span>
            </Box>
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{
                fontSize: { xs: 16, lg: 11 },
                fontWeight: 700,
                color: PRIMARY,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Forgot password?
            </Link>
          </Box>

          {formError && (
            <Box
              role="alert"
              sx={{
                p: '12px 14px',
                mb: '20px',
                borderRadius: '12px',
                bgcolor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                color: '#DC2626',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {formError}
            </Box>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
            sx={{
              height: { xs: 68, lg: 44, xl: 48 },
              borderRadius: '12px',
              bgcolor: PRIMARY,
              color: '#FFFFFF',
              fontSize: { xs: 17, lg: 12 },
              fontWeight: 800,
              textTransform: 'none',
              boxShadow: '0 12px 24px rgba(37, 99, 235, 0.24)',
              transition: 'background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
              '&:hover': {
                bgcolor: PRIMARY_DARK,
                transform: 'translateY(-1px)',
                boxShadow: '0 16px 30px rgba(37, 99, 235, 0.28)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 8px 18px rgba(37, 99, 235, 0.22)',
              },
              '&:disabled': {
                opacity: 0.65,
                bgcolor: PRIMARY,
                color: '#FFFFFF',
                transform: 'none',
              },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                Logging in...
              </Box>
            ) : (
              'Log In'
            )}
          </Button>

        </Box>

        <Typography sx={AUTH_TOGGLE_SX}>
          Don&apos;t have an account?{' '}
          <Link
            component="button"
            type="button"
            onClick={onSwitchToRegister}
            sx={{
              display: 'inline',
              verticalAlign: 'baseline',
              color: PRIMARY,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              fontWeight: 800,
              textDecoration: 'none',
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              p: 0,
              m: 0,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Sign up
          </Link>
        </Typography>
      </Box>
    </AuthCardShell>
  )
}
