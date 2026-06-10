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
        px: { xs: 2.5, sm: 4, lg: 3.5, xl: 4 },
        py: { xs: 4, lg: 3 },
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
            FairShare
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          minHeight: { xs: 48, lg: 29 },
          px: { xs: '24px', lg: '15px' },
          mb: { xs: 3, lg: 3.4 },
          borderRadius: '999px',
          bgcolor: '#EFF6FF',
          color: PRIMARY,
          fontSize: { xs: 16, lg: 11 },
          fontWeight: 700,
        }}
      >
        <SchoolOutlinedIcon sx={{ fontSize: { xs: 22, lg: 14 } }} />
        <span>Built for university group projects</span>
      </Box>

      <Box sx={AUTH_CARD_SX}>{children}</Box>

      <Box
        sx={{
          mt: { xs: '38px', lg: '32px' },
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: '#64748B',
          fontSize: { xs: 15, lg: 10 },
          textAlign: 'center',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: { xs: 16, lg: 12 } }} />
        <span>{securityMessage}</span>
      </Box>
    </Box>
  )
}
