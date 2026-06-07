import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { fs, SLATE } from '../../appTheme'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: fs(16), color: SLATE[400] }} />}
          sx={{ mb: 1.5 }}
        >
          {breadcrumbs.map((item, index) =>
            item.to && index < breadcrumbs.length - 1 ? (
              <Link
                key={item.label}
                component={RouterLink}
                to={item.to}
                sx={{
                  fontSize: fs(14),
                  fontWeight: 600,
                  color: SLATE[500],
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {item.label}
              </Link>
            ) : (
              <Typography key={item.label} sx={{ fontSize: fs(14), fontWeight: 600, color: SLATE[700] }}>
                {item.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: subtitle ? 0.5 : 0 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ color: SLATE[500], fontSize: fs(16), maxWidth: 720 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
      </Box>
    </Box>
  )
}
