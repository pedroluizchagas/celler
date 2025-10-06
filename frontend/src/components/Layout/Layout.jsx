import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  CssBaseline,
  Chip,
  Fade,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  PointOfSale as PointOfSaleIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  // WhatsApp removido do sistema
  SmartToy as BotIcon,
  Backup as BackupIcon,
  Palette as PaletteIcon,
  Phone as PhoneIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material'
import { useThemeMode } from '../../contexts/ThemeContext'

const drawerWidth = 280

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isDarkMode, toggleTheme } = useThemeMode()
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Responsividade simplificada e consistente
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Clientes', icon: <PeopleIcon />, path: '/clientes' },
    { text: 'Ordens', icon: <AssignmentIcon />, path: '/ordens' },
    { text: 'Estoque', icon: <InventoryIcon />, path: '/estoque' },
    { text: 'PDV', icon: <PointOfSaleIcon />, path: '/pdv' },
    { text: 'Vendas', icon: <ReceiptIcon />, path: '/vendas' },
    { text: 'Financeiro', icon: <AccountBalanceIcon />, path: '/financeiro' },
    // WhatsApp removido do sistema
    { text: 'Bot IA', icon: <BotIcon />, path: '/bot-ia' },
    { text: 'Backup', icon: <BackupIcon />, path: '/backup' },
    { text: 'Demonstração', icon: <PaletteIcon />, path: '/theme-demo' },
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header do Drawer */}
      <Box
        sx={{
          p: 3,
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(255, 0, 0, 0.1), rgba(255, 0, 64, 0.05))'
            : 'linear-gradient(135deg, rgba(255, 0, 0, 0.05), rgba(255, 0, 64, 0.02))',
          borderBottom: isDarkMode
            ? '1px solid rgba(255, 0, 0, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box display="flex" alignItems="center" mb={1}>
          <PhoneIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff0000, #ff0040)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Saymon Cell
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            opacity: 0.7,
          }}
        >
          Sistema de Assistência Técnica
        </Typography>
      </Box>

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, py: 2 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                className={`modern-nav-item ${
                  location.pathname === item.path ? 'active' : ''
                }`}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path)
                  if (isMobile) {
                    setMobileOpen(false)
                  }
                }}
                sx={{
                  minHeight: 52,
                  px: 3,
                  mx: 2,
                  borderRadius: 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.1), transparent)',
                    transition: 'left 0.3s ease',
                  },
                  '&:hover::before': {
                    left: '100%',
                  },
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateX(8px)',
                    backgroundColor: 'rgba(255, 0, 0, 0.05)',
                  },
                  '&.Mui-selected': {
                    background:
                      'linear-gradient(135deg, rgba(255, 0, 0, 0.1), rgba(255, 0, 64, 0.05))',
                    borderLeft: '4px solid #ff0000',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, rgba(255, 0, 0, 0.15), rgba(255, 0, 64, 0.08))',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 3,
                    justifyContent: 'center',
                    color:
                      location.pathname === item.path
                        ? 'primary.main'
                        : 'text.secondary',
                    transition: 'all 0.3s ease',
                    fontSize: 20,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      fontSize: '0.875rem',
                      letterSpacing: '0.5px',
                      color:
                        location.pathname === item.path
                          ? 'primary.main'
                          : 'text.primary',
                      transition: 'all 0.3s ease',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer do Drawer */}
      <Box
        sx={{
          p: 3,
          borderTop: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          background: isDarkMode
            ? 'rgba(0, 0, 0, 0.2)'
            : 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.7rem',
            textAlign: 'center',
            display: 'block',
            opacity: 0.6,
          }}
        >
          © 2024 Saymon Cell
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 64, md: 72 },
            px: { xs: 2, md: 3 },
          }}
        >
          {/* Menu Button (Mobile) */}
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { md: 'none' },
              p: 1.5,
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo e Nome (Mobile) */}
          {isMobile && (
            <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
              <PhoneIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 700,
                  mr: 2,
                  background: 'linear-gradient(135deg, #ff0000, #ff0040)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'glow-modern 3s ease-in-out infinite',
                }}
              >
                Saymon Cell
              </Typography>
              <Chip
                label={`v1.0 ${isDarkMode ? '🌙' : '☀️'}`}
                size="small"
                sx={{
                  background: 'linear-gradient(45deg, #ff0000, #ff0040)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 15px rgba(255, 0, 0, 0.3)',
                  },
                }}
              />
            </Box>
          )}

          {/* Spacer para Desktop */}
          {!isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* Theme Toggle */}
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            sx={{
              p: 1.5,
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              maxWidth: '80vw', // Reduzido para evitar vazamento
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content - ESTRUTURA SIMPLIFICADA */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // Removido Container MUI desnecessário
        }}
      >
        {/* Toolbar Spacer */}
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />

        {/* Page Content - PADDING OTIMIZADO */}
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, md: 4, lg: 5 }, // Padding responsivo otimizado
            py: { xs: 2, sm: 3, md: 4 },
            maxWidth: '100%', // Remove limitação de largura
            mx: 'auto',
            width: '100%',
          }}
        >
          <Fade in timeout={300}>
            <Box sx={{ width: '100%' }}>{children}</Box>
          </Fade>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 2,
            px: { xs: 2, sm: 3, md: 4 },
            mt: 'auto',
            borderTop: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            background: isDarkMode
              ? 'rgba(0, 0, 0, 0.2)'
              : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              fontSize: '0.875rem',
              opacity: 0.7,
            }}
          >
            © 2024 Saymon Cell - Sistema de Assistência Técnica
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default Layout
