import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { HeaderBridgeProvider } from '../../contexts/HeaderBridgeContext'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppShell() {
  return (
    <HeaderBridgeProvider>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2.5, md: 3 },
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
    </HeaderBridgeProvider>
  )
}
