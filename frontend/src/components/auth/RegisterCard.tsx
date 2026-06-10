import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, CircularProgress, Link, Typography } from '@mui/material'
import { useState } from 'react'
import PasswordStrengthIndicator from '../PasswordStrengthIndicator'
import AuthCardShell from './AuthCardShell'
import AuthTextField from './AuthTextField'
import { AUTH_TOGGLE_SX, PRIMARY, PRIMARY_DARK, SLATE } from './authTheme'

interface RegisterCardProps {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  isLoading: boolean
  validationError: string | null
  apiError: string | null
  success: boolean
  showMobileLogo?: boolean
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onSwitchToLogin: () => void
}

export default function RegisterCard({
  fullName,
  email,
  password,
  confirmPassword,
  isLoading,
  validationError,
  apiError,
  success,
  showMobileLogo = false,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onSwitchToLogin,
}: RegisterCardProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const formError = apiError
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const fullNameError = validationError && !fullName.trim() ? validationError : null
  const emailError =
    validationError && fullName.trim() && (!email.trim() || !hasValidEmail)
      ? validationError
      : null
  const passwordError =
    validationError &&
    fullName.trim() &&
    email.trim() &&
    hasValidEmail &&
    (!password || validationError === 'Password does not meet requirements')
      ? validationError
      : null
  const confirmPasswordError =
    validationError &&
    fullName.trim() &&
    email.trim() &&
    hasValidEmail &&
    password &&
    (validationError === 'Passwords do not match' ||
      (validationError === 'All fields are required' && !confirmPassword))
      ? validationError
      : null

  const passwordToggle = (visible: boolean, onToggle: () => void) => (
    <Box
      component="button"
      type="button"
      aria-label={visible ? 'Hide characters' : 'Show characters'}
      onClick={onToggle}
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
      {visible ? (
        <VisibilityOffOutlinedIcon fontSize="small" />
      ) : (
        <VisibilityOutlinedIcon fontSize="small" />
      )}
    </Box>
  )

  return (
    <AuthCardShell
      ariaLabel="Registration form"
      showMobileLogo={showMobileLogo}
      securityMessage="Secure signup - Your data is protected with enterprise-grade security."
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
            Create your account
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, lg: 12, xl: 13 }, color: SLATE[500], m: 0 }}>
            Join FairShare and start collaborating with your team.
          </Typography>
        </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {success ? (
          <Box
            role="status"
            sx={{
              flex: 1,
              p: '16px 18px',
              borderRadius: '12px',
              bgcolor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              color: '#166534',
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            Account created. You can log in now.
          </Box>
        ) : (
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
              id="full_name"
              label="Full name"
              type="text"
              value={fullName}
              placeholder="Jane Doe"
              autoComplete="name"
              icon={<PersonOutlineOutlinedIcon fontSize="small" />}
              hasError={!!fullNameError}
              errorMessage={fullNameError ?? undefined}
              onChange={onFullNameChange}
            />

            <AuthTextField
              id="register_email"
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
              id="register_password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              placeholder="Create a password"
              autoComplete="new-password"
              icon={<LockOutlinedIcon fontSize="small" />}
              hasError={!!passwordError}
              errorMessage={passwordError ?? undefined}
              onChange={onPasswordChange}
              trailing={passwordToggle(showPassword, () => setShowPassword((prev) => !prev))}
            />

            <Box sx={{ mt: -1.5, mb: 2 }}>
              <PasswordStrengthIndicator password={password} />
            </Box>

            <AuthTextField
              id="confirm_password"
              label="Confirm password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              icon={<LockOutlinedIcon fontSize="small" />}
              hasError={!!confirmPasswordError}
              errorMessage={confirmPasswordError ?? undefined}
              onChange={onConfirmPasswordChange}
              trailing={passwordToggle(showConfirmPassword, () =>
                setShowConfirmPassword((prev) => !prev),
              )}
            />

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
                  Creating account...
                </Box>
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        )}

        <Typography sx={AUTH_TOGGLE_SX}>
          Already have an account?{' '}
          <Link
            component="button"
            type="button"
            onClick={onSwitchToLogin}
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
            Log in
          </Link>
        </Typography>
      </Box>
    </AuthCardShell>
  )
}
