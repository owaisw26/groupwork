import { CssBaseline, ThemeProvider, Typography, createTheme } from '@mui/material'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0',
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Typography variant="h4" component="h1" sx={{ p: 4 }}>
        GroupWork
      </Typography>
    </ThemeProvider>
  )
}

export default App
