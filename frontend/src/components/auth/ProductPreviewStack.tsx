import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { Box, Typography } from '@mui/material'

const PRIMARY = '#2563EB'
const SLATE = {
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  900: '#0F172A',
}

const cardSx = {
  bgcolor: '#FFFFFF',
  border: `1px solid ${SLATE[200]}`,
  borderRadius: '18px',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.11)',
}

export default function ProductPreviewStack() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        width: '100%',
        height: { lg: 560, xl: 640 },
      }}
    >
      <Box
        sx={{
          ...cardSx,
          position: 'absolute',
          top: { lg: 0, xl: 10 },
          right: { lg: 44, xl: 66 },
          width: { lg: 234, xl: 286 },
          p: { lg: 1.5, xl: 1.7 },
          transform: 'rotate(-6deg)',
          zIndex: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: { lg: 14, xl: 16 }, fontWeight: 800, color: SLATE[900] }}>To Do</Typography>
            <Box
              sx={{
                width: { lg: 22, xl: 23 },
                height: { lg: 22, xl: 23 },
                borderRadius: '50%',
                bgcolor: '#F1F5F9',
                fontSize: { lg: 11, xl: 12 },
                fontWeight: 700,
                color: SLATE[500],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: SLATE[500] }}>
            <AddIcon sx={{ fontSize: { lg: 16, xl: 18 } }} />
          </Box>
        </Box>

        <Box sx={{ p: { lg: 1.85, xl: 1.9 }, borderRadius: '14px', border: '1px solid #E7ECF3', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 0.75 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${SLATE[300]}`,
                flexShrink: 0,
                mt: 0.25,
              }}
            />
            <Box>
              <Typography
                sx={{
                  fontSize: { lg: 10.5, xl: 12 },
                  fontWeight: 700,
                  color: SLATE[900],
                  mb: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                Prepare contribution report
              </Typography>
              <Typography sx={{ fontSize: { lg: 11, xl: 12 }, color: SLATE[500], lineHeight: 1.45 }}>
                Document each member&apos;s contributions and upload the report.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.6, mb: 1.25 }}>
            <Box sx={{ display: 'flex' }}>
              {['#F8C59A', '#F0B28E', '#A56B52'].map((color, index) => (
                <Box
                  key={color}
                  sx={{
                    width: { lg: 22, xl: 25 },
                    height: { lg: 22, xl: 25 },
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '2.5px solid #FFFFFF',
                    ml: index > 0 ? '-10px' : 0,
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: SLATE[500] }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: { lg: 12, xl: 14 } }} />
              <Typography sx={{ fontSize: { lg: 10, xl: 11 } }}>21 May</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: { lg: 10, xl: 11 }, color: SLATE[500], fontWeight: 600 }}>2 / 4</Typography>
            <Box sx={{ flex: 1, height: 8, bgcolor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ width: '50%', height: '100%', bgcolor: '#22C55E', borderRadius: 4 }} />
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: '#FEF2F2',
                color: '#DC2626',
                fontSize: { lg: 9, xl: 10 },
                fontWeight: 700,
              }}
            >
              High
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          ...cardSx,
          position: 'absolute',
          top: { lg: 243, xl: 276 },
          left: { lg: -12, xl: -16 },
          width: { lg: 327, xl: 426 },
          p: { lg: 1.6, xl: 1.8 },
          transform: 'rotate(2deg)',
          zIndex: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedOutlinedIcon sx={{ fontSize: { lg: 20, xl: 22 }, color: PRIMARY }} />
            <Typography sx={{ fontSize: { lg: 12, xl: 13 }, fontWeight: 800, color: SLATE[900] }}>
              Peer Verification
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { lg: 11, xl: 12 }, fontWeight: 700, color: PRIMARY }}>View all</Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: { lg: 14, xl: 14 }, color: '#D97706' }} />
            <Typography sx={{ fontSize: { lg: 11, xl: 12 }, fontWeight: 700, color: '#D97706' }}>
              Waiting for verification
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { lg: 12, xl: 13 }, fontWeight: 700, color: SLATE[900], mb: 0.5 }}>
            Upload evidence files
          </Typography>
          <Typography sx={{ fontSize: { lg: 10, xl: 11 }, color: SLATE[500] }}>Completed by Alex Lee</Typography>
          <Typography sx={{ fontSize: { lg: 10, xl: 11 }, color: SLATE[500], mb: 2 }}>
            22 May 2025 at 10:15 AM
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                py: 1.25,
                borderRadius: 2.5,
                border: `2px solid ${PRIMARY}`,
                color: PRIMARY,
                fontSize: { lg: 11, xl: 12 },
                fontWeight: 700,
              }}
            >
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: { lg: 14, xl: 14 } }} />
              Verify
            </Box>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                py: 1.25,
                borderRadius: 2.5,
                border: '2px solid #FCA5A5',
                color: '#DC2626',
                fontSize: { lg: 11, xl: 12 },
                fontWeight: 700,
              }}
            >
              <ReportProblemOutlinedIcon sx={{ fontSize: { lg: 14, xl: 14 } }} />
              Dispute
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          ...cardSx,
          position: 'absolute',
          top: { lg: 477, xl: 540 },
          left: { lg: -30, xl: -26 },
          width: { lg: 293, xl: 363 },
          p: { lg: 1.6, xl: 1.8 },
          transform: 'rotate(2deg)',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontSize: { lg: 12, xl: 13 }, fontWeight: 800, color: SLATE[900] }}>Team Activity</Typography>
          <Typography sx={{ fontSize: { lg: 11, xl: 12 }, fontWeight: 700, color: PRIMARY }}>View all</Typography>
        </Box>
        {[
          {
            name: 'Alex Lee logged 1h 30m',
            detail: 'Working on financial analysis',
            time: 'today, 10:30 AM',
            icon: <AccessTimeOutlinedIcon sx={{ fontSize: { lg: 14, xl: 14 }, color: '#16A34A' }} />,
            iconBg: '#ECFDF5',
          },
          {
            name: 'Jamie Chen added meeting notes',
            detail: 'Team Meeting #3 Notes',
            time: 'today, 9:15 AM',
            icon: <DescriptionOutlinedIcon sx={{ fontSize: { lg: 14, xl: 14 }, color: PRIMARY }} />,
            iconBg: '#EFF6FF',
          },
        ].map((item) => (
          <Box key={item.name} sx={{ display: 'flex', gap: 1.5, mb: 2, '&:last-of-type': { mb: 0 } }}>
            <Box
              sx={{
                width: { lg: 27, xl: 29 },
                height: { lg: 27, xl: 29 },
                borderRadius: '50%',
                bgcolor: item.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: { lg: 11, xl: 12 }, fontWeight: 700, color: SLATE[900] }}>{item.name}</Typography>
              <Typography sx={{ fontSize: { lg: 10, xl: 11 }, color: SLATE[500] }}>{item.detail}</Typography>
              <Typography sx={{ fontSize: { lg: 9, xl: 10 }, color: SLATE[400] }}>{item.time}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
