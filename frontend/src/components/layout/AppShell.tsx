import { Box, Toolbar } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppShell() {
  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
