import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, Checkbox, CircularProgress, Link, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

const PRIMARY = '#2563EB'
const PRIMARY_DARK = '#1D4ED8'
const SLATE = {
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
}

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
}

function AuthTextField({
  id,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  icon,
  trailing,
  hasError,
  errorMessage,
  onChange,
}: {
  id: string
  label: string
  type: string
  value: string
  placeholder: string
  autoComplete: string
  icon: React.ReactNode
  trailing?: React.ReactNode
  hasError?: boolean
  errorMessage?: string
  onChange: (value: string) => void
}) {
  return (
    <Box sx={{ mb: '24px' }}>
      <Typography
        component="label"
        htmlFor={id}
        sx={{
          display: 'block',
          mb: '12px',
          fontSize: { xs: 16, lg: 18 },
          fontWeight: 650,
          color: SLATE[900],
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          height: { xs: 68, lg: 74, xl: 78 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: { xs: '20px', lg: '22px' },
          border: `1px solid ${hasError ? '#EF4444' : '#DDE3EC'}`,
          borderRadius: '12px',
          bgcolor: '#FFFFFF',
          boxShadow: hasError ? '0 0 0 4px rgba(239, 68, 68, 0.10)' : 'none',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
          '&:focus-within': {
            borderColor: hasError ? '#EF4444' : PRIMARY,
            boxShadow: hasError
              ? '0 0 0 4px rgba(239, 68, 68, 0.10)'
              : '0 0 0 4px rgba(37, 99, 235, 0.12)',
          },
        }}
      >
        <Box sx={{ color: SLATE[500], display: 'flex', flexShrink: 0 }}>{icon}</Box>
        <Box
          component="input"
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasError ? 'true' : 'false'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: '100%',
            border: 'none',
            outline: 'none',
            bgcolor: 'transparent',
            color: SLATE[900],
            fontSize: { xs: 16, lg: 18 },
            fontFamily: 'inherit',
            '&::placeholder': { color: SLATE[400] },
          }}
        />
        {trailing}
      </Box>
      {errorMessage && (
        <Typography sx={{ mt: 1, color: '#DC2626', fontSize: 13, lineHeight: 1.4 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  )
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
    <Box
      component="section"
      aria-label="Login form"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.5, sm: 4, lg: 3.5, xl: 4.5 },
        py: { xs: 4, lg: 5 },
        bgcolor: '#FFFFFF',
        minHeight: { xs: '100vh', lg: '100vh' },
      }}
    >
      {showMobileLogo && (
        <Box
          sx={{
            display: { xs: 'flex', lg: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: PRIMARY,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GroupsOutlinedIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>
            GroupWork
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 48,
          px: '24px',
          mb: { xs: 3, lg: 5.25 },
          borderRadius: '999px',
          bgcolor: '#EFF6FF',
          color: PRIMARY,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        <SchoolOutlinedIcon sx={{ fontSize: 22 }} />
        <span>Built for university group projects</span>
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: 704, lg: 780, xl: 840 },
          p: { xs: '40px 22px', sm: '54px 44px', lg: '92px 78px', xl: '102px 86px' },
          bgcolor: '#FFFFFF',
          border: '1px solid #DDE3EC',
          borderRadius: { xs: '22px', sm: '28px' },
          boxShadow: '0 20px 70px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: { xs: 4, lg: 5 } }}>
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: 32, sm: 42, lg: 48, xl: 52 },
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: 0,
              color: SLATE[900],
              mb: 2,
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, lg: 19, xl: 20 }, color: SLATE[500], m: 0 }}>
            Log in to continue to your GroupWork workspace.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          noValidate
          sx={{
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
              mb: { xs: '40px', lg: '48px' },
            }}
          >
            <Box
              component="label"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: { xs: '14px', lg: '16px' },
                fontSize: { xs: 16, lg: 18 },
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
                  width: { xs: 18, lg: 22 },
                  height: { xs: 18, lg: 22 },
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
                fontSize: { xs: 16, lg: 18 },
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
              height: { xs: 68, lg: 74, xl: 78 },
              borderRadius: '12px',
              bgcolor: PRIMARY,
              color: '#FFFFFF',
              fontSize: { xs: 17, lg: 19 },
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

          <Typography
            sx={{
              mt: { xs: '28px', lg: '34px' },
              textAlign: 'center',
              color: SLATE[700],
              fontSize: { xs: 17, lg: 20 },
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{
                color: PRIMARY,
                fontWeight: 800,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          mt: '38px',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: SLATE[500],
          fontSize: { xs: 15, lg: 17 },
          textAlign: 'center',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: { xs: 16, lg: 18 } }} />
        <span>Secure login - Your data is protected with enterprise-grade security.</span>
      </Box>
    </Box>
  )
}
