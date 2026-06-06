import { Avatar, Box, Chip, Paper, Typography } from '@mui/material'

export interface Member {
  id: string
  full_name: string
  email: string
  role: string
}

interface MemberCardProps {
  member: Member
}

export default function MemberCard({ member }: MemberCardProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar>{member.full_name.charAt(0)}</Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1">{member.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{member.email}</Typography>
        </Box>
        <Chip label={member.role} size="small" color={member.role === 'owner' ? 'primary' : 'default'} />
      </Box>
    </Paper>
  )
}
