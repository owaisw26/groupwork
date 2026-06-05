import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() =>
    token ? 'loading' : 'error',
  )

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    api
      .post('/auth/verify-email', { token })
      .then(() => {
        if (!cancelled) {
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) {
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
            <Alert severity="success">Your email has been verified. You can now log in.</Alert>
          )}
          {status === 'error' && (
            <Alert severity="error">Verification failed. The link may be invalid or expired.</Alert>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Email verification
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
