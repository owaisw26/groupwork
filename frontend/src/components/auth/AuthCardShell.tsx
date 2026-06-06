import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import { Box, Typography } from '@mui/material'
import { AUTH_CARD_SX, PRIMARY } from './authTheme'

interface AuthCardShellProps {
  ariaLabel: string
  showMobileLogo?: boolean
  securityMessage: string
  children: React.ReactNode
}

export default function AuthCardShell({
  ariaLabel,
  showMobileLogo = false,
  securityMessage,
  children,
}: AuthCardShellProps) {
  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.5, sm: 4, lg: 3.5, xl: 4.5 },
        py: { xs: 4, lg: 5 },
        bgcolor: '#FFFFFF',
        minHeight: { xs: '100vh', lg: '100vh' },
      }}
    >
      {showMobileLogo && (
        <Box
          sx={{
            display: { xs: 'flex', lg: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: PRIMARY,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GroupsOutlinedIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>
            GroupWork
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 48,
          px: '24px',
          mb: { xs: 3, lg: 5.25 },
          borderRadius: '999px',
          bgcolor: '#EFF6FF',
          color: PRIMARY,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        <SchoolOutlinedIcon sx={{ fontSize: 22 }} />
        <span>Built for university group projects</span>
      </Box>

      <Box sx={AUTH_CARD_SX}>{children}</Box>

      <Box
        sx={{
          mt: '38px',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: '#64748B',
          fontSize: { xs: 15, lg: 17 },
          textAlign: 'center',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: { xs: 16, lg: 18 } }} />
        <span>{securityMessage}</span>
      </Box>
    </Box>
  )
}
