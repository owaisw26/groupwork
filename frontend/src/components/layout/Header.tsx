import AddIcon from '@mui/icons-material/Add'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  Breadcrumbs,
  Button,
  ClickAwayListener,
  Divider,
  IconButton,
  InputAdornment,
  Link as MuiLink,
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, fs, SLATE } from '../../appTheme'
import { useHeaderBridge } from '../../contexts/HeaderBridgeContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../../store/authSlice'
import { clearSearchResults, searchTasks } from '../../store/tasksSlice'
import NotificationDropdown from './NotificationDropdown'

export default function Header() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { createTaskHandler } = useHeaderBridge()
  const { user, error: authError } = useAppSelector((state) => state.auth)
  const { searchResults } = useAppSelector((state) => state.tasks)
  const { items: projects, currentProject } = useAppSelector((state) => state.projects)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const projectId = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/)
    return match?.[1] ?? null
  }, [location.pathname])

  const isProjectRoute = Boolean(projectId)
  const project = useMemo(() => {
    if (!projectId) return null
    return (
      projects.find((item) => item.id === projectId)
      ?? (currentProject?.id === projectId ? currentProject : null)
    )
  }, [projectId, projects, currentProject])

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  const handleResultClick = (taskProjectId: string) => {
    setQuery('')
    setSearchOpen(false)
    dispatch(clearSearchResults())
    navigate(`/projects/${taskProjectId}/tasks`)
  }

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer - 1,
        borderBottom: `1px solid ${APP_BORDER}`,
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1.5, md: 2 },
          minHeight: { xs: 64, md: 72 },
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        {authError && (
          <Typography variant="body2" color="error" sx={{ mr: 2 }}>
            {authError}
          </Typography>
        )}

        {isProjectRoute && (
          <Breadcrumbs
            separator={<NavigateNextIcon sx={{ fontSize: fs(16), color: SLATE[400] }} />}
            sx={{ flexShrink: 0, display: { xs: 'none', md: 'flex' } }}
          >
            <MuiLink
              component={RouterLink}
              to="/dashboard"
              sx={{
                fontSize: fs(14),
                fontWeight: 600,
                color: SLATE[500],
                textDecoration: 'none',
                '&:hover': { color: APP_PRIMARY },
              }}
            >
              Projects
            </MuiLink>
            <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900] }}>
              {project?.name ?? 'Project'}
            </Typography>
          </Breadcrumbs>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Box
          ref={searchRef}
          sx={{
            position: 'relative',
            width: { xs: '100%', sm: 280, md: 360, lg: 420 },
            maxWidth: { xs: 200, sm: 280, md: 360, lg: 420 },
            flexShrink: 0,
          }}
        >
          <TextField
            inputRef={searchInputRef}
            size="small"
            placeholder={
              isProjectRoute
                ? 'Search tasks, members, or evidence...'
                : 'Search tasks...'
            }
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && setSearchOpen(true)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: SLATE[400] }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box
                      component="span"
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '6px',
                        border: `1px solid ${APP_BORDER}`,
                        bgcolor: '#FFFFFF',
                        fontSize: fs(11),
                        color: SLATE[400],
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      ⌘K
                    </Box>
                  </InputAdornment>
                ),
                sx: {
                  height: 44,
                  fontSize: fs(15),
                  bgcolor: SLATE[50],
                  pr: 0.5,
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: SLATE[50],
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
                  mt: 0.75,
                  maxHeight: 300,
                  overflow: 'auto',
                  zIndex: 10,
                  border: `1px solid ${APP_BORDER}`,
                  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
                }}
              >
                <List dense disablePadding>
                  {searchResults.map((task) => (
                    <ListItemButton key={task.id} onClick={() => handleResultClick(task.project_id)}>
                      <ListItemText primary={task.title} secondary={task.project_name} />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </ClickAwayListener>
          )}
          {searchOpen && query.trim() && searchResults.length === 0 && (
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.75,
                  p: 2,
                  zIndex: 10,
                  border: `1px solid ${APP_BORDER}`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No tasks found
                </Typography>
              </Paper>
            </ClickAwayListener>
          )}
        </Box>

        {createTaskHandler && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createTaskHandler}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              whiteSpace: 'nowrap',
              px: 2.25,
              py: 1,
              flexShrink: 0,
            }}
          >
            Create Task
          </Button>
        )}

        {createTaskHandler && (
          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', sm: 'block' }, borderColor: APP_BORDER, my: 1.25 }}
          />
        )}

        <NotificationDropdown />

        <IconButton
          aria-label="user menu"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            border: `1px solid ${APP_BORDER}`,
            borderRadius: '12px',
            width: 44,
            height: 44,
            flexShrink: 0,
          }}
        >
          <AccountCircleOutlinedIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>{user?.full_name}</MenuItem>
          <MenuItem component={RouterLink} to="/profile" onClick={() => setAnchorEl(null)}>
            Profile
          </MenuItem>
          <MenuItem component={RouterLink} to="/profile" onClick={() => setAnchorEl(null)}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
