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
import { Link } from 'react-router-dom'
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearAuthError, register } from '../../store/authSlice'
import { checkPasswordStrength } from '../../utils/passwordValidation'

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setValidationError(null)
    setSuccess(false)

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setValidationError('All fields are required')
      return
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }
    if (!checkPasswordStrength(password).isValid) {
      setValidationError('Password does not meet requirements')
      return
    }

    const result = await dispatch(register({ full_name: fullName, email, password }))
    if (register.fulfilled.match(result)) {
      setSuccess(true)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Create your account
          </Typography>
          {success ? (
            <Alert severity="success">Account created. Please check your email to verify your account.</Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                margin="normal"
                label="Full Name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
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
              <PasswordStrengthIndicator password={password} />
              <TextField
                fullWidth
                margin="normal"
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Create Account
              </Button>
            </Box>
          )}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login">
                Log in
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
