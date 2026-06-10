import { Alert, Box, Button } from '@mui/material'

export default function InviteMemberForm() {
  return (
    <Box>
      <Alert severity="info">Email invites are a feature coming soon.</Alert>
      <Button variant="contained" sx={{ mt: 2 }} disabled>
        Email Invites Soon
      </Button>
    </Box>
  )
}
