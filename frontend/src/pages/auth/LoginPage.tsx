import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearAuthError, login } from '../../store/authSlice'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setValidationError(null)

    if (!email.trim()) {
      setValidationError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address')
      return
    }
    if (!password) {
      setValidationError('Password is required')
      return
    }

    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      const user = result.payload
      navigate(user.has_completed_onboarding ? '/dashboard' : '/onboarding')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Log in to GroupWork
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {(validationError || error) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationError || error}
              </Alert>
            )}
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isLoading}
            >
              Log In
            </Button>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <MuiLink component={Link} to="/forgot-password" variant="body2">
              Forgot password?
            </MuiLink>
          </Box>
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography variant="body2">
              Don&apos;t have an account?{' '}
              <MuiLink component={Link} to="/register">
                Sign up
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
