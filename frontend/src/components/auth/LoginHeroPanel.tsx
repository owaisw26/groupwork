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
        gap: { lg: 2, xl: 2.25 },
        width: { lg: 378, xl: 414 },
        minHeight: { lg: 119, xl: 133 },
        p: { lg: '22px 23px', xl: '23px 25px' },
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(203, 213, 225, 0.74)',
        borderRadius: '18px',
        boxShadow: '0 18px 44px rgba(15, 23, 42, 0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <Box
        sx={{
          width: { lg: 58, xl: 65 },
          height: { lg: 58, xl: 65 },
          borderRadius: '14px',
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: { lg: 29, xl: 32 } },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: { lg: 15, xl: 16 }, fontWeight: 800, color: SLATE[900], mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: { lg: 14, xl: 14 }, lineHeight: 1.4, color: SLATE[600] }}>
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
        px: { lg: 4, xl: 5 },
        py: { lg: 3.5, xl: 4 },
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { lg: 5, xl: 6 }, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: { lg: 36, xl: 40 },
            height: { lg: 36, xl: 40 },
            borderRadius: '11px',
            bgcolor: PRIMARY,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GroupsOutlinedIcon sx={{ fontSize: { lg: 23, xl: 25 } }} />
        </Box>
        <Typography sx={{ fontSize: { lg: 24, xl: 26 }, fontWeight: 800, color: PRIMARY, letterSpacing: 0 }}>
          GroupWork
        </Typography>
      </Box>

      <Box sx={{ mb: { lg: 3.5, xl: 4.5 }, position: 'relative', zIndex: 1, maxWidth: 740 }}>
        <Typography
          component="h1"
          sx={{
            mb: 2,
            maxWidth: 720,
            fontSize: { lg: 52, xl: 65 },
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: 0,
            color: SLATE[900],
          }}
        >
          Organise group work
          <br />
          with clarity.
        </Typography>
        <Typography sx={{ maxWidth: 650, fontSize: { lg: 17, xl: 20 }, lineHeight: 1.45, color: SLATE[700] }}>
          Manage tasks, track contributions, verify evidence and
          <br />
          generate accountability reports - all in one place.
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { lg: 2.25, xl: 2.5 } }}>
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
            right: { lg: 'clamp(18px, 3vw, 44px)', xl: 'clamp(24px, 3vw, 56px)' },
            top: { lg: '-32%', xl: '-36%' },
            width: { lg: 'min(333px, 42vw)', xl: 'min(387px, 42vw)' },
            transformOrigin: 'top center',
            transform: 'translateX(10%)',
          }}
        >
          <ProductPreviewStack />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.35,
          mt: { lg: 3, xl: 3.5 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: { lg: 42, xl: 48 },
            height: { lg: 42, xl: 48 },
            borderRadius: '11px',
            bgcolor: '#DBEAFE',
            color: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: { lg: 23, xl: 26 } }} />
        </Box>
        <Typography sx={{ fontSize: { lg: 11, xl: 12 }, lineHeight: 1.45, color: SLATE[600] }}>
          Crafted to combat the issues
          <br />
          surrounding groupwork.
        </Typography>
      </Box>
    </Box>
  )
}
