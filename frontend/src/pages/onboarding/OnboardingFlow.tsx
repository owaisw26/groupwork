import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAppDispatch } from '../../store/hooks'
import { fetchCurrentUser } from '../../store/authSlice'

const steps = ['Welcome', 'Join a project', 'Invite members']

export default function OnboardingFlow() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [inviteEmails, setInviteEmails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const completeOnboarding = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      await api.put('/users/me', { has_completed_onboarding: true })
      await dispatch(fetchCurrentUser())
      navigate('/dashboard')
    } catch {
      setError('Unable to complete onboarding. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    await completeOnboarding()
  }

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      await completeOnboarding()
      return
    }
    setActiveStep((prev) => prev + 1)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 560 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Welcome to GroupWork
            </Typography>
            <Button onClick={handleSkip} disabled={isSubmitting}>
              Skip
            </Button>
          </Box>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {activeStep === 0 && (
            <Typography>
              GroupWork helps your team track contributions, verify work, and generate fair reports.
            </Typography>
          )}
          {activeStep === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Project creation and join codes will be available from your dashboard after
                onboarding. You can skip this step for now.
              </Typography>
              <TextField
                fullWidth
                label="Project name"
                margin="normal"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled
                helperText="Available after onboarding"
              />
              <Typography align="center" sx={{ my: 2 }}>
                or
              </Typography>
              <TextField
                fullWidth
                label="Join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled
                helperText="Available after onboarding"
              />
            </Box>
          )}
          {activeStep === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Member invites will be available once you create or join a project. You can skip
                this step.
              </Typography>
              <TextField
                fullWidth
                label="Invite emails (comma separated)"
                multiline
                minRows={3}
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                disabled
                helperText="Available after onboarding"
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="contained" onClick={handleNext} disabled={isSubmitting}>
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
