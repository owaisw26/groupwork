import { FormControlLabel, Paper, Switch, TextField, Typography } from '@mui/material'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchNotificationPreferences,
  updateNotificationPreference,
} from '../store/notificationsSlice'

const PREFERENCE_TYPES = [
  'invitation',
  'task_assigned',
  'task_completed',
  'dispute_filed',
  'deadline_reminder',
  'peer_review',
  'report_ready',
]

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { preferences } = useAppSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchNotificationPreferences())
  }, [dispatch])

  const isEmailEnabled = (type: string) => {
    const pref = preferences.find((p) => p.notification_type === type)
    return pref?.email_enabled ?? true
  }

  const handleToggle = (type: string, enabled: boolean) => {
    dispatch(updateNotificationPreference({ notification_type: type, email_enabled: enabled }))
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <TextField fullWidth margin="normal" label="Full Name" value={user?.full_name ?? ''} />
      <TextField fullWidth margin="normal" label="Email" value={user?.email ?? ''} disabled />

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Notification Preferences
      </Typography>
      {PREFERENCE_TYPES.map((type) => (
        <FormControlLabel
          key={type}
          control={
            <Switch
              checked={isEmailEnabled(type)}
              onChange={(e) => handleToggle(type, e.target.checked)}
            />
          }
          label={`Email: ${type.replace(/_/g, ' ')}`}
        />
      ))}
    </Paper>
  )
}
