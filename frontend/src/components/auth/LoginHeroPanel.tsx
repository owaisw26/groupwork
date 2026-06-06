import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import { Box, Typography } from '@mui/material'
import ProductPreviewStack from './ProductPreviewStack'

const PRIMARY = '#2563EB'
const SLATE = {
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  900: '#0F172A',
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { lg: 3.25, xl: 3.5 },
        width: { lg: 562, xl: 603 },
        height: { lg: 203, xl: 216 },
        p: { lg: '34px 36px', xl: '36px 39px' },
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(203, 213, 225, 0.74)',
        borderRadius: '18px',
        boxShadow: '0 18px 44px rgba(15, 23, 42, 0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <Box
        sx={{
          width: { lg: 94, xl: 96 },
          height: { lg: 94, xl: 96 },
          borderRadius: '22px',
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: { lg: 44, xl: 47 } },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: { lg: 24, xl: 25 }, fontWeight: 800, color: SLATE[900], mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: { lg: 21, xl: 22 }, lineHeight: 1.45, color: SLATE[600] }}>
          {description}
        </Typography>
      </Box>
    </Box>
  )
}

export default function LoginHeroPanel() {
  return (
    <Box
      component="section"
      aria-label="GroupWork product overview"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        px: { lg: 5.5, xl: 7 },
        py: { lg: 4.5, xl: 6 },
        background: `
          linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(239, 246, 255, 0.88) 54%, rgba(248, 250, 252, 0.98) 100%)
        `,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: '-27%',
          bottom: 0,
          width: '68%',
          background: `
            linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.62) 52%, rgba(239, 246, 255, 0.86) 100%),
            radial-gradient(circle at 62% 18%, rgba(37, 99, 235, 0.10), transparent 34%),
            radial-gradient(circle at 72% 76%, rgba(37, 99, 235, 0.08), transparent 38%)
          `,
          clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 28% 100%, 0 38%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '60%',
          borderRadius: '36px',
          backgroundImage: 'radial-gradient(rgba(30, 64, 175, 0.28) 1.3px, transparent 1.3px)',
          backgroundSize: '22px 22px',
          opacity: 0.24,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: '14%',
          top: '6%',
          color: '#93C5FD',
          display: 'flex',
          gap: 1,
          transform: 'rotate(10deg)',
          pointerEvents: 'none',
        }}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 32 }} />
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 24, mt: 3 }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { lg: 8, xl: 9 }, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '11px',
            bgcolor: PRIMARY,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GroupsOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography sx={{ fontSize: 34, fontWeight: 800, color: PRIMARY, letterSpacing: 0 }}>
          GroupWork
        </Typography>
      </Box>

      <Box sx={{ mb: { lg: 5.5, xl: 6.5 }, position: 'relative', zIndex: 1, maxWidth: 980 }}>
        <Typography
          component="h1"
          sx={{
            mb: 3,
            fontSize: { lg: 86, xl: 103 },
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: 0,
            color: SLATE[900],
          }}
        >
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            Organise group work
          </Box>
          <br />
          with clarity.
        </Typography>
        <Typography sx={{ maxWidth: 936, fontSize: { lg: 29, xl: 34 }, lineHeight: 1.45, color: SLATE[700] }}>
          Manage tasks, track contributions, verify evidence and generate
          accountability reports - all in one place.
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { lg: 4.25, xl: 4.5 } }}>
          <FeatureCard
            icon={<GroupsOutlinedIcon />}
            iconBg="#DBEAFE"
            iconColor={PRIMARY}
            title="Track contributions"
            description="See who's doing what with real-time progress tracking."
          />
          <FeatureCard
            icon={<VerifiedUserOutlinedIcon />}
            iconBg="#D1FAE5"
            iconColor="#16A34A"
            title="Verify completed work"
            description="Peer verification ensures everyone contributes fairly."
          />
          <FeatureCard
            icon={<AssessmentOutlinedIcon />}
            iconBg="#F5F3FF"
            iconColor="#8B5CF6"
            title="Generate accountability reports"
            description="Export detailed reports for fair and transparent assessments."
          />
        </Box>

        <Box
          sx={{
            position: 'absolute',
            right: { lg: '-1%', xl: '5%' },
            top: { lg: '-19%', xl: '-23%' },
            width: { lg: 470, xl: 540 },
            transform: 'scale(1.2)',
            transformOrigin: 'top center',
          }}
        >
          <ProductPreviewStack />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.75,
          mt: 5,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: '20px',
            bgcolor: '#DBEAFE',
            color: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography sx={{ fontSize: 21, lineHeight: 1.5, color: SLATE[600] }}>
          Trusted by students and educators
          <br />
          to build fairer, more accountable teams.
        </Typography>
      </Box>
    </Box>
  )
}
