import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const hasSubmitted = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() =>
    token ? 'loading' : 'error',
  )

  useEffect(() => {
    if (!token || hasSubmitted.current) {
      return
    }

    hasSubmitted.current = true
    let cancelled = false

    api
      .post('/auth/verify-email', { token })
      .then(() => {
        if (!cancelled) {
          setStatus('success')
        }
      })
      .catch((error: { response?: { data?: { error?: { message?: string } } } }) => {
        if (cancelled) {
          return
        }
        const message = error.response?.data?.error?.message ?? ''
        if (message.toLowerCase().includes('already verified')) {
          setStatus('success')
        } else {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {status === 'loading' && <CircularProgress />}
          {status === 'success' && (
            <>
              <Alert severity="success">Your email has been verified. You can now log in.</Alert>
              <Button component={Link} to="/login" variant="contained" sx={{ mt: 2 }}>
                Go to Login
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Alert severity="error">Verification failed. The link may be invalid or expired.</Alert>
              <Button component={Link} to="/login" variant="outlined" sx={{ mt: 2 }}>
                Back to Login
              </Button>
            </>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Email verification
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
