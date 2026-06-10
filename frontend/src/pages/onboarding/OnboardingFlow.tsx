import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAppDispatch } from '../../store/hooks'
import { fetchCurrentUser, type User } from '../../store/authSlice'
import { APP_BG, APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, FONT_STACK, fs, SLATE } from '../../appTheme'

const steps = ['Welcome', 'Join a project', 'Invite members']
const highlights = [
  { icon: <AssignmentTurnedInOutlinedIcon />, label: 'Track tasks and ownership' },
  { icon: <GroupsOutlinedIcon />, label: 'Verify work as a team' },
  { icon: <InsightsOutlinedIcon />, label: 'Generate fair reports' },
]

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
      const response = await api.put<User>('/users/me', { has_completed_onboarding: true })
      const result = await dispatch(fetchCurrentUser(undefined))
      if (!fetchCurrentUser.fulfilled.match(result)) {
        setError('Unable to complete onboarding. Please try again.')
        return
      }
      if (!result.payload.has_completed_onboarding && !response.data.has_completed_onboarding) {
        setError('Unable to complete onboarding. Please try again.')
        return
      }
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

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <Box>
          <Typography sx={{ fontSize: fs(16), lineHeight: 1.6, color: SLATE[600], maxWidth: 520 }}>
            FairShare keeps group projects accountable with shared task tracking, peer verification,
            and contribution reports.
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.25, mt: 3 }}>
            {highlights.map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: '12px',
                  border: `1px solid ${APP_BORDER}`,
                  bgcolor: '#FFFFFF',
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    bgcolor: APP_PRIMARY_LIGHT,
                    color: APP_PRIMARY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography sx={{ fontSize: fs(13), fontWeight: 800, color: SLATE[800] }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )
    }

    if (activeStep === 1) {
      return (
        <Box>
          <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 2 }}>
            Create a project or join one from the dashboard after onboarding.
          </Typography>
          <TextField
            fullWidth
            label="Project name"
            margin="normal"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled
            helperText="Available after onboarding"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          <Typography align="center" sx={{ my: 2, fontSize: fs(12), fontWeight: 700, color: SLATE[400] }}>
            or
          </Typography>
          <TextField
            fullWidth
            label="Join code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            disabled
            helperText="Available after onboarding"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </Box>
      )
    }

    return (
      <Box>
        <Alert
          severity="info"
          icon={<PersonAddAlt1OutlinedIcon />}
          sx={{ mb: 2, borderRadius: '12px', border: `1px solid ${APP_BORDER}`, bgcolor: '#F8FAFF' }}
        >
          Email invites are coming soon. Share a project join code with teammates for now.
        </Alert>
        <TextField
          fullWidth
          label="Invite emails"
          multiline
          minRows={3}
          value={inviteEmails}
          onChange={(e) => setInviteEmails(e.target.value)}
          disabled
          helperText="Coming soon"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2.5, md: 4 },
        bgcolor: APP_BG,
        fontFamily: FONT_STACK,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(37, 99, 235, 0.14) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 860,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' },
          overflow: 'hidden',
          border: `1px solid ${APP_BORDER}`,
          borderRadius: '18px',
          bgcolor: '#FFFFFF',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.10)',
        }}
      >
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            bgcolor: '#F8FAFF',
            borderRight: { md: `1px solid ${APP_BORDER}` },
            borderBottom: { xs: `1px solid ${APP_BORDER}`, md: 0 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 4 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                bgcolor: APP_PRIMARY,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GroupsOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontSize: fs(22), fontWeight: 900, color: APP_PRIMARY }}>
              FairShare
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: fs(26), md: fs(30) }, lineHeight: 1.08, fontWeight: 900, color: SLATE[900], mb: 2 }}>
            Start your project with accountability built in.
          </Typography>
          <Typography sx={{ fontSize: fs(14), lineHeight: 1.6, color: SLATE[600] }}>
            Set up your workspace, bring teammates in, and keep contribution records ready from day one.
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <Box>
              <Typography component="h1" sx={{ fontSize: fs(24), lineHeight: 1.15, fontWeight: 900, color: SLATE[900], mb: 0.75 }}>
              Welcome to FairShare
              </Typography>
              <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                A quick setup before your dashboard.
              </Typography>
            </Box>
            <Button onClick={handleSkip} disabled={isSubmitting} sx={{ fontWeight: 800, textTransform: 'none' }}>
              Skip
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {steps.map((label, index) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: '999px',
                  bgcolor: index === activeStep ? APP_PRIMARY_LIGHT : '#F1F5F9',
                  color: index === activeStep ? APP_PRIMARY : SLATE[500],
                  fontSize: fs(12),
                  fontWeight: 800,
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: index === activeStep ? APP_PRIMARY : '#CBD5E1',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                {label}
              </Box>
            ))}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: 250 }}>
            {renderStepContent()}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isSubmitting}
              sx={{ minWidth: 110, borderRadius: '12px', py: 1.25, fontWeight: 900, textTransform: 'none' }}
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
