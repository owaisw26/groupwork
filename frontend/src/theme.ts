import { createTheme } from '@mui/material/styles'
import { APP_BG, APP_BORDER, APP_PRIMARY, APP_PRIMARY_DARK, FONT_STACK, fs, SLATE } from './appTheme'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: APP_PRIMARY,
      dark: APP_PRIMARY_DARK,
      light: '#60A5FA',
    },
    secondary: {
      main: SLATE[700],
    },
    background: {
      default: APP_BG,
      paper: '#FFFFFF',
    },
    text: {
      primary: SLATE[900],
      secondary: SLATE[500],
    },
    divider: APP_BORDER,
    success: {
      main: '#16A34A',
      light: '#DCFCE7',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
    },
    info: {
      main: '#0891B2',
      light: '#CFFAFE',
    },
  },
  typography: {
    fontSize: fs(14),
    fontFamily: FONT_STACK,
    h4: { fontWeight: 800, letterSpacing: '-0.02em', color: SLATE[900] },
    h5: { fontWeight: 700, letterSpacing: '-0.01em', color: SLATE[900] },
    h6: { fontWeight: 700, color: SLATE[900] },
    subtitle1: { fontWeight: 600, color: SLATE[800] },
    subtitle2: { fontWeight: 700, color: SLATE[700], fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: APP_BG,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          fontWeight: 700,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: APP_PRIMARY,
          '&:hover': {
            backgroundColor: APP_PRIMARY_DARK,
          },
        },
        outlined: {
          borderColor: APP_BORDER,
          color: SLATE[700],
          '&:hover': {
            borderColor: APP_PRIMARY,
            backgroundColor: 'rgba(37, 99, 235, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${APP_BORDER}`,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${APP_BORDER}`,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: `1px solid ${APP_BORDER}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${APP_BORDER}`,
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            color: APP_PRIMARY,
            '& .MuiListItemIcon-root': {
              color: APP_PRIMARY,
            },
            '&:hover': {
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          minHeight: 48,
          '&.Mui-selected': {
            color: APP_PRIMARY,
            fontWeight: 700,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        filled: {
          border: '1px solid transparent',
        },
        outlined: {
          borderColor: APP_BORDER,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: APP_BORDER,
            },
            '&:hover fieldset': {
              borderColor: SLATE[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: APP_PRIMARY,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: SLATE[100],
        },
      },
    },
  },
})

export default theme
