import { Box, Typography } from '@mui/material'
import { PRIMARY, SLATE } from './authTheme'

interface AuthTextFieldProps {
  id: string
  label: string
  type: string
  value: string
  placeholder: string
  autoComplete: string
  icon: React.ReactNode
  trailing?: React.ReactNode
  hasError?: boolean
  errorMessage?: string
  onChange: (value: string) => void
}

export default function AuthTextField({
  id,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  icon,
  trailing,
  hasError,
  errorMessage,
  onChange,
}: AuthTextFieldProps) {
  return (
    <Box sx={{ mb: '24px' }}>
      <Typography
        component="label"
        htmlFor={id}
        sx={{
          display: 'block',
          mb: '12px',
          fontSize: { xs: 16, lg: 18 },
          fontWeight: 650,
          color: SLATE[900],
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          height: { xs: 68, lg: 74, xl: 78 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: { xs: '20px', lg: '22px' },
          border: `1px solid ${hasError ? '#EF4444' : '#DDE3EC'}`,
          borderRadius: '12px',
          bgcolor: '#FFFFFF',
          boxShadow: hasError ? '0 0 0 4px rgba(239, 68, 68, 0.10)' : 'none',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
          '&:focus-within': {
            borderColor: hasError ? '#EF4444' : PRIMARY,
            boxShadow: hasError
              ? '0 0 0 4px rgba(239, 68, 68, 0.10)'
              : '0 0 0 4px rgba(37, 99, 235, 0.12)',
          },
        }}
      >
        <Box sx={{ color: SLATE[500], display: 'flex', flexShrink: 0, fontSize: { xs: 22, lg: 24 } }}>
          {icon}
        </Box>
        <Box
          component="input"
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasError ? 'true' : 'false'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: '100%',
            border: 'none',
            outline: 'none',
            bgcolor: 'transparent',
            color: SLATE[900],
            fontSize: { xs: 18, sm: 19, lg: 20, xl: 21 },
            fontFamily: 'inherit',
            '&::placeholder': {
              color: SLATE[400],
              fontSize: 'inherit',
            },
          }}
        />
        {trailing}
      </Box>
      {errorMessage && (
        <Typography sx={{ mt: 1, color: '#DC2626', fontSize: 13, lineHeight: 1.4 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  )
}
