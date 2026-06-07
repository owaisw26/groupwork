import { Box, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
  onActionClick?: () => void
  accent?: string
  footer?: React.ReactNode
}

export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  actionLabel,
  actionTo,
  onActionClick,
  accent = APP_PRIMARY,
  footer,
}: StatCardProps) {
  return (
    <Box sx={{ ...SURFACE_CARD_SX, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: accent === APP_PRIMARY ? APP_PRIMARY_LIGHT : 'rgba(15, 23, 42, 0.06)',
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[500], mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: fs(22), md: fs(26) },
          fontWeight: 800,
          color: SLATE[900],
          mb: subtitle ? 0.5 : 1.5,
        }}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      {footer}
      {actionLabel && (actionTo || onActionClick) && (
        <Link
          component={onActionClick ? 'button' : RouterLink}
          to={onActionClick ? undefined : actionTo}
          onClick={onActionClick}
          sx={{
            mt: footer ? 1.5 : 0,
            fontSize: fs(14),
            fontWeight: 700,
            color: accent === '#DC2626' ? '#DC2626' : APP_PRIMARY,
            textDecoration: 'none',
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {actionLabel}
        </Link>
      )}
    </Box>
  )
}
