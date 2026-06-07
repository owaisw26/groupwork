import AddIcon from '@mui/icons-material/Add'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
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
import { APP_PRIMARY, APP_PRIMARY_LIGHT, FONT_STACK, fs, SLATE } from '../../appTheme'
import { useAppSelector } from '../../store/hooks'

const DRAWER_WIDTH = 302
const ICON_SIZE = 24

export default function Sidebar() {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const projects = useAppSelector((state) => state.projects.items)

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const navItem = (to: string, label: string, icon: React.ReactNode, exact = false) => {
    const selected = isActive(to, exact)
    return (
      <ListItemButton
        component={Link}
        to={to}
        selected={selected}
        sx={{
          minHeight: 53,
          position: 'relative',
          '&.Mui-selected::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 9.5,
            bottom: 9.5,
            width: 3,
            borderRadius: '0 4px 4px 0',
            bgcolor: APP_PRIMARY,
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 48, justifyContent: 'center' }}>{icon}</ListItemIcon>
        <ListItemText
          primary={label}
          sx={{
            '& .MuiListItemText-primary': {
              fontSize: fs(18),
              fontWeight: selected ? 700 : 600,
            },
          }}
        />
      </ListItemButton>
    )
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: '#FFFFFF',
        },
      }}
    >
      <Box
        sx={{
          px: 3.15,
          py: 3.15,
          display: 'flex',
          alignItems: 'center',
          gap: 1.85,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '13px',
            bgcolor: APP_PRIMARY,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GroupsOutlinedIcon sx={{ fontSize: ICON_SIZE }} />
        </Box>
        <Typography
          component={Link}
          to="/dashboard"
          sx={{
            fontFamily: FONT_STACK,
            fontSize: fs(24),
            fontWeight: 800,
            color: APP_PRIMARY,
            textDecoration: 'none',
          }}
        >
          GroupWork
        </Typography>
      </Box>

      <List sx={{ px: 0.75 }}>
        {navItem(
          '/dashboard',
          'Dashboard',
          <DashboardOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
          true,
        )}
        {navItem(
          '/my-tasks',
          'My Tasks',
          <AssignmentOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
          true,
        )}
      </List>

      <Divider sx={{ mx: 2.6, my: 1.3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', px: 3.15, py: 1.3 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontSize: fs(15) }}>
          Projects
        </Typography>
        <IconButton size="small" aria-label="create project" sx={{ color: SLATE[500] }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      <List sx={{ px: 0.75, flex: 1, overflow: 'auto' }}>
        {projects.map((project) => {
          const isProjectRoute = location.pathname.includes(`/projects/${project.id}`)
          const isOpen = expandedProjects[project.id] ?? isProjectRoute

          return (
            <Box key={project.id}>
              <ListItemButton
                onClick={() => toggleProject(project.id)}
                selected={isProjectRoute}
                sx={{ minHeight: 53 }}
              >
                <ListItemIcon sx={{ minWidth: 48, justifyContent: 'center' }}>
                  <FolderOutlinedIcon sx={{ fontSize: ICON_SIZE }} />
                </ListItemIcon>
                <ListItemText
                  primary={project.name}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: fs(17),
                      fontWeight: isProjectRoute ? 700 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </ListItemButton>
              <Collapse in={isOpen}>
                <List component="div" disablePadding>
                  {[
                    ['tasks', 'Task Board'],
                    ['meetings', 'Meetings'],
                    ['members', 'Members'],
                    ['evidence', 'Evidence'],
                    ['peer-review', 'Peer Review'],
                    ['settings', 'Settings'],
                  ].map(([segment, label]) => {
                    const path = `/projects/${project.id}/${segment}`
                    const selected = location.pathname.includes(path)
                    return (
                      <ListItemButton
                        key={segment}
                        component={Link}
                        to={path}
                        selected={selected}
                        sx={{
                          pl: 6.5,
                          minHeight: 46,
                          '&.Mui-selected::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 7.5,
                            bottom: 7.5,
                            width: 3,
                            borderRadius: '0 4px 4px 0',
                            bgcolor: APP_PRIMARY,
                          },
                        }}
                      >
                        <ListItemText
                          primary={label}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: fs(17),
                              fontWeight: selected ? 700 : 500,
                            },
                          }}
                        />
                      </ListItemButton>
                    )
                  })}
                </List>
              </Collapse>
            </Box>
          )
        })}
      </List>

      <Box sx={{ p: 2.6 }}>
        <Box
          sx={{
            p: 2.6,
            borderRadius: '17px',
            bgcolor: APP_PRIMARY_LIGHT,
            border: '1px solid rgba(37, 99, 235, 0.12)',
          }}
        >
          <Typography sx={{ fontSize: fs(17), fontWeight: 700, color: APP_PRIMARY, mb: 0.5 }}>
            Built for teams
          </Typography>
          <Typography sx={{ fontSize: fs(16), color: SLATE[500], lineHeight: 1.5 }}>
            Track tasks, verify work, and keep your group project on schedule.
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}
