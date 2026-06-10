import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function ForgotPasswordPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Forgot password
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Password reset by email is coming soon. For now, ask the project owner or app admin to reset access manually.
          </Alert>
          <Button fullWidth component={RouterLink} to="/login" variant="contained" sx={{ mt: 3 }}>
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}
