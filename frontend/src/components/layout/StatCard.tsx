import { Box, Typography } from '@mui/material'
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
  const isInteractive = Boolean(actionTo || onActionClick)

  const content = (
    <>
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
      {actionLabel && isInteractive && (
        <Typography
          className="stat-card-action"
          component="span"
          sx={{
            mt: footer ? 1.5 : 'auto',
            fontSize: fs(14),
            fontWeight: 700,
            color: accent === '#DC2626' ? '#DC2626' : APP_PRIMARY,
          }}
        >
          {actionLabel}
        </Typography>
      )}
    </>
  )

  const cardSx = {
    ...SURFACE_CARD_SX,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...(isInteractive && {
      cursor: 'pointer',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      '&:hover': {
        borderColor: APP_PRIMARY,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
      },
      '&:hover .stat-card-action': {
        textDecoration: 'underline',
      },
    }),
  }

  if (actionTo) {
    return (
      <Box component={RouterLink} to={actionTo} sx={cardSx}>
        {content}
      </Box>
    )
  }

  if (onActionClick) {
    return (
      <Box
        component="button"
        type="button"
        onClick={onActionClick}
        sx={{
          ...cardSx,
          width: '100%',
          textAlign: 'left',
          fontFamily: 'inherit',
          appearance: 'none',
        }}
      >
        {content}
      </Box>
    )
  }

  return <Box sx={cardSx}>{content}</Box>
}
