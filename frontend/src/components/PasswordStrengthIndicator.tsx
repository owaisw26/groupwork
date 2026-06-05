import { Box, LinearProgress, Typography } from '@mui/material'
import { checkPasswordStrength } from '../utils/passwordValidation'

interface PasswordStrengthIndicatorProps {
  password: string
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, feedback } = checkPasswordStrength(password)

  if (!password) {
    return null
  }

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        color={score === 4 ? 'success' : score >= 2 ? 'warning' : 'error'}
        sx={{ mb: 1 }}
      />
      {feedback.map((item) => (
        <Typography key={item} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {item}
        </Typography>
      ))}
    </Box>
  )
}
