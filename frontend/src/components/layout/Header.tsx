import AccountCircle from '@mui/icons-material/AccountCircle'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../../store/authSlice'
import NotificationDropdown from './NotificationDropdown'

export default function Header() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={1}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper' }}
    >
      <Toolbar>
        <Typography
          component={Link}
          to="/dashboard"
          variant="h6"
          color="primary"
          sx={{ textDecoration: 'none', fontWeight: 700, mr: 3 }}
        >
          GroupWork
        </Typography>
        <TextField
          size="small"
          placeholder="Search tasks..."
          sx={{ flexGrow: 1, maxWidth: 480 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <NotificationDropdown />
        <IconButton
          aria-label="user menu"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ ml: 1 }}
        >
          <AccountCircle />
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>{user?.full_name}</MenuItem>
          <MenuItem component={Link} to="/profile" onClick={() => setAnchorEl(null)}>
            Profile
          </MenuItem>
          <MenuItem component={Link} to="/profile" onClick={() => setAnchorEl(null)}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
