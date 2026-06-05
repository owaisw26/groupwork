import AddIcon from '@mui/icons-material/Add'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DashboardIcon from '@mui/icons-material/Dashboard'
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'

const DRAWER_WIDTH = 260
const COLLAPSED_WIDTH = 64

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(true)
  const location = useLocation()
  const projects = useAppSelector((state) => state.projects.items)

  const width = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH

  const navItem = (to: string, label: string, icon: React.ReactNode) => (
    <ListItemButton
      component={Link}
      to={to}
      selected={location.pathname === to}
      sx={{ minHeight: 48 }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
        {icon}
      </ListItemIcon>
      {!collapsed && <ListItemText primary={label} />}
    </ListItemButton>
  )

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          transition: 'width 0.2s',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ height: 64 }} />
      <List>
        {navItem('/dashboard', 'Dashboard', <DashboardIcon />)}
        {navItem('/my-tasks', 'My Tasks', <AssignmentIcon />)}
      </List>
      <Divider />
      {!collapsed && (
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Projects
          </Typography>
          <IconButton size="small" aria-label="create project">
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <List>
        {projects.map((project) => (
          <Box key={project.id}>
            <ListItemButton onClick={() => setProjectsOpen(!projectsOpen)}>
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <AssignmentIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={project.name} />}
            </ListItemButton>
            {!collapsed && (
              <Collapse in={projectsOpen}>
                <List component="div" disablePadding>
                  {[
                    ['tasks', 'Tasks'],
                    ['meetings', 'Meetings'],
                    ['members', 'Members'],
                    ['evidence', 'Evidence'],
                    ['settings', 'Settings'],
                  ].map(([segment, label]) => (
                    <ListItemButton
                      key={segment}
                      component={Link}
                      to={`/projects/${project.id}/${segment}`}
                      sx={{ pl: 4 }}
                      selected={location.pathname.includes(`/projects/${project.id}/${segment}`)}
                    >
                      <ListItemText primary={label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    </Drawer>
  )
}
