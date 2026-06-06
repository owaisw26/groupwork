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
import api from '../services/api'
import { useAppSelector } from '../store/hooks'

export default function AcceptInvitationPage() {
  const { token } = useParams()
  const { isAuthenticated, authInitialized } = useAppSelector((state) => state.auth)
  const hasSubmitted = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required'>(() => {
    if (!token) {
      return 'error'
    }
    return 'loading'
  })
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !authInitialized) {
      return
    }

    if (!isAuthenticated) {
      setStatus('login-required')
      return
    }

    if (hasSubmitted.current) {
      return
    }

    hasSubmitted.current = true
    let cancelled = false

    api
      .post('/invitations/accept', { token })
      .then((response) => {
        if (!cancelled) {
          setProjectName(response.data.project_name ?? null)
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
  }, [token, isAuthenticated, authInitialized])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {status === 'loading' && <CircularProgress />}
          {status === 'login-required' && (
            <>
              <Alert severity="info">Please log in to accept this invitation.</Alert>
              <Button
                component={Link}
                to={`/login?redirect=/invitations/accept/${token}`}
                variant="contained"
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </>
          )}
          {status === 'success' && (
            <>
              <Alert severity="success">
                {projectName
                  ? `You have joined ${projectName}.`
                  : 'Invitation accepted successfully.'}
              </Alert>
              <Button component={Link} to="/dashboard" variant="contained" sx={{ mt: 2 }}>
                Go to Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Alert severity="error">
                Unable to accept invitation. The link may be invalid or expired.
              </Alert>
              <Button component={Link} to="/dashboard" variant="outlined" sx={{ mt: 2 }}>
                Go to Dashboard
              </Button>
            </>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Project invitation
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
