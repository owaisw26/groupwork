import AccountCircle from '@mui/icons-material/AccountCircle'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  ClickAwayListener,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../../store/authSlice'
import { clearSearchResults, searchTasks } from '../../store/tasksSlice'
import NotificationDropdown from './NotificationDropdown'

export default function Header() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, error: authError } = useAppSelector((state) => state.auth)
  const { searchResults } = useAppSelector((state) => state.tasks)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      dispatch(clearSearchResults())
      return
    }

    const timer = window.setTimeout(() => {
      dispatch(searchTasks(query.trim()))
      setSearchOpen(true)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, dispatch])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setSearchOpen(false)
    }
  }

  const handleLogout = async () => {
    const result = await dispatch(logout())
    if (logout.fulfilled.match(result)) {
      navigate('/login')
    }
  }

  const handleResultClick = (projectId: string) => {
    setQuery('')
    setSearchOpen(false)
    dispatch(clearSearchResults())
    navigate(`/projects/${projectId}/tasks`)
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={1}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper' }}
    >
      <Toolbar>
        {authError && (
          <Typography variant="body2" color="error" sx={{ mr: 2 }}>
            {authError}
          </Typography>
        )}
        <Typography
          component={Link}
          to="/dashboard"
          variant="h6"
          color="primary"
          sx={{ textDecoration: 'none', fontWeight: 700, mr: 3 }}
        >
          GroupWork
        </Typography>
        <Box ref={searchRef} sx={{ position: 'relative', flexGrow: 1, maxWidth: 480 }}>
          <TextField
            size="small"
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && setSearchOpen(true)}
            fullWidth
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
          {searchOpen && searchResults.length > 0 && (
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  maxHeight: 300,
                  overflow: 'auto',
                  zIndex: 10,
                }}
              >
                <List dense disablePadding>
                  {searchResults.map((task) => (
                    <ListItemButton key={task.id} onClick={() => handleResultClick(task.project_id)}>
                      <ListItemText
                        primary={task.title}
                        secondary={task.project_name}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </ClickAwayListener>
          )}
          {searchOpen && query.trim() && searchResults.length === 0 && (
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
              <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, p: 2, zIndex: 10 }}>
                <Typography variant="body2" color="text.secondary">
                  No tasks found
                </Typography>
              </Paper>
            </ClickAwayListener>
          )}
        </Box>
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
