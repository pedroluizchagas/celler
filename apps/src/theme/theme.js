import { createTheme } from '@mui/material/styles'

// Cores Personalizáveis - Celler
const colors = {
  red: {
    main: '#ff0000', // Vermelho pulsante vibrante
    light: '#ff3333',
    dark: '#cc0000',
    neon: '#ff0040', // Tom neon para efeitos especiais
  },
  black: {
    main: '#0a0a0a',
    light: '#1a1a1a',
    medium: '#2a2a2a',
  },
  gray: {
    main: '#6b7280', // Cinza cimento queimado
    light: '#9ca3af',
    dark: '#374151',
    concrete: '#8b8680', // Tom cimento queimado
  },
  white: {
    main: '#ffffff',
    off: '#f8fafc',
  },
}

// Função para criar tema baseado no modo
export const createSaymonCellTheme = (isDarkMode) => {
  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: colors.red.main,
        light: colors.red.light,
        dark: colors.red.dark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.gray.concrete,
        light: colors.gray.light,
        dark: colors.gray.dark,
        contrastText: isDarkMode ? '#ffffff' : '#000000',
      },
      background: {
        default: isDarkMode ? colors.black.main : '#f8fafc',
        paper: isDarkMode
          ? 'rgba(26, 26, 26, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
      },
      text: {
        primary: isDarkMode ? colors.white.main : colors.black.main,
        secondary: isDarkMode ? colors.gray.light : colors.gray.dark,
      },
      divider: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      error: {
        main: colors.red.main,
        light: colors.red.light,
        dark: colors.red.dark,
      },
      info: {
        main: colors.gray.main,
        light: colors.gray.light,
        dark: colors.gray.dark,
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", system-ui, -apple-system, sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
        fontSize: 'clamp(1.5rem, 3vw, 2rem)',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)',
        lineHeight: 1.4,
        color: isDarkMode ? colors.white.main : colors.black.main,
      },
      h5: {
        fontWeight: 600,
        fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
        lineHeight: 1.5,
        color: isDarkMode ? colors.white.main : colors.black.main,
      },
      body1: {
        fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
        lineHeight: 1.6,
        fontWeight: 400,
      },
      body2: {
        fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)',
        lineHeight: 1.5,
        fontWeight: 400,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'none',
        fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
      },
    },
    shape: {
      borderRadius: 16,
    },
    spacing: (factor) => `${0.25 * factor}rem`,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundAttachment: 'fixed',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            scrollBehavior: 'smooth',
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: isDarkMode
              ? 'rgba(255, 0, 0, 0.3) transparent'
              : 'rgba(0, 0, 0, 0.2) transparent',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDarkMode
              ? 'rgba(10, 10, 10, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: isDarkMode
              ? '1px solid rgba(255, 0, 0, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            background: isDarkMode
              ? 'rgba(26, 26, 26, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: isDarkMode
              ? '1px solid rgba(255, 0, 0, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDarkMode
                ? '0 20px 40px rgba(255, 0, 0, 0.1)'
                : '0 20px 40px rgba(0, 0, 0, 0.15)',
            },
            [theme.breakpoints.down('sm')]: {
              borderRadius: 16,
              '&:hover': {
                transform: 'translateY(-2px)',
              },
            },
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            background: isDarkMode
              ? 'rgba(26, 26, 26, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 16,
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease-in-out',
            [theme.breakpoints.down('sm')]: {
              borderRadius: 12,
            },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 50,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
            letterSpacing: '0.5px',
            padding: '12px 32px',
            boxShadow: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 44,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
              transition: 'left 0.5s',
            },
            '&:hover::before': {
              left: '100%',
            },
            '&:hover': {
              transform: 'translateY(-2px) scale(1.02)',
              boxShadow: `0 8px 25px ${colors.red.main}40`,
            },
            '&:active': {
              transform: 'translateY(0) scale(0.98)',
            },
            [theme.breakpoints.down('sm')]: {
              padding: '10px 24px',
              fontSize: '0.8rem',
              minHeight: 40,
              '&:hover': {
                transform: 'none',
              },
            },
          }),
          contained: {
            background: `linear-gradient(45deg, ${colors.red.main}, ${colors.red.neon})`,
            border: `1px solid ${colors.red.neon}`,
            boxShadow: `0 4px 15px ${colors.red.main}30`,
            '&:hover': {
              background: `linear-gradient(45deg, ${colors.red.neon}, ${colors.red.main})`,
              boxShadow: `0 8px 25px ${colors.red.main}40, 0 0 30px ${colors.red.main}30`,
            },
          },
          outlined: {
            borderColor: colors.red.main,
            color: colors.red.main,
            borderWidth: 2,
            '&:hover': {
              borderColor: colors.red.neon,
              color: colors.red.neon,
              backgroundColor: `${colors.red.main}10`,
              boxShadow: `0 0 15px ${colors.red.main}30`,
            },
          },
          text: {
            color: colors.red.main,
            '&:hover': {
              backgroundColor: `${colors.red.main}08`,
              color: colors.red.neon,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 50,
            fontWeight: 600,
            fontSize: 'clamp(0.7rem, 1.25vw, 0.75rem)',
            letterSpacing: '0.5px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            minHeight: 32,
            '&:hover': {
              transform: 'scale(1.05)',
            },
            [theme.breakpoints.down('sm')]: {
              fontSize: '0.7rem',
              minHeight: 28,
            },
          }),
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: ({ theme }) => ({
            background: isDarkMode
              ? 'rgba(26, 26, 26, 0.6)'
              : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            [theme.breakpoints.down('md')]: {
              borderRadius: 16,
              overflowX: 'auto',
            },
            [theme.breakpoints.down('sm')]: {
              borderRadius: 12,
            },
          }),
        },
      },
      MuiTable: {
        styleOverrides: {
          root: ({ theme }) => ({
            [theme.breakpoints.down('md')]: {
              minWidth: 650,
            },
          }),
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            background: `linear-gradient(135deg, ${colors.red.main}, ${colors.red.dark})`,
            '& .MuiTableCell-head': {
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '20px 16px',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderBottom: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            minHeight: 60,
            '&:hover': {
              background: isDarkMode
                ? 'rgba(255, 0, 0, 0.02)'
                : 'rgba(255, 0, 0, 0.01)',
              transform: 'scale(1.001)',
            },
            [theme.breakpoints.down('md')]: {
              minHeight: 56,
            },
            [theme.breakpoints.down('sm')]: {
              minHeight: 52,
              '&:hover': {
                transform: 'none',
              },
            },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)',
            [theme.breakpoints.down('sm')]: {
              padding: '12px 8px',
            },
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            background: isDarkMode
              ? 'rgba(10, 10, 10, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: isDarkMode
              ? '1px solid rgba(255, 0, 0, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            [theme.breakpoints.down('md')]: {
              width: '85vw',
              maxWidth: 320,
            },
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 16,
            margin: '4px 12px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 48,
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
              background: isDarkMode
                ? 'rgba(255, 0, 0, 0.05)'
                : 'rgba(255, 0, 0, 0.03)',
              transform: 'translateX(8px)',
            },
            '&.Mui-selected': {
              background: `linear-gradient(135deg, ${colors.red.main}15, ${colors.red.neon}08)`,
              borderLeft: `4px solid ${colors.red.main}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${colors.red.main}20, ${colors.red.neon}10)`,
              },
            },
            [theme.breakpoints.down('md')]: {
              minHeight: 52,
              margin: '4px 8px',
              '&:hover': {
                transform: 'none',
              },
            },
          }),
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiOutlinedInput-root': {
              background: isDarkMode
                ? 'rgba(0, 0, 0, 0.2)'
                : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 12,
              transition: 'all 0.3s ease',
              minHeight: 56,
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              '& fieldset': {
                borderColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 2,
              },
              '&:hover fieldset': {
                borderColor: colors.red.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.red.main,
                boxShadow: `0 0 0 3px ${colors.red.main}20`,
              },
              '& input': {
                fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              },
            },
            [theme.breakpoints.down('sm')]: {
              '& .MuiOutlinedInput-root': {
                minHeight: 48,
                fontSize: '16px', // Previne zoom no iOS
                '& input': {
                  fontSize: '16px',
                },
              },
            },
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            background: isDarkMode
              ? 'rgba(26, 26, 26, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: isDarkMode
              ? '1px solid rgba(255, 0, 0, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            [theme.breakpoints.down('sm')]: {
              borderRadius: 16,
              margin: 16,
              width: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
            },
          }),
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: ({ theme }) => ({
            [theme.breakpoints.down('sm')]: {
              paddingLeft: 16,
              paddingRight: 16,
            },
          }),
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: '64px !important',
            [theme.breakpoints.up('sm')]: {
              minHeight: '70px !important',
            },
            [theme.breakpoints.up('md')]: {
              minHeight: '72px !important',
            },
          }),
        },
      },
    },
  })
}

// Tema padrão (light mode)
export const defaultTheme = createSaymonCellTheme(false)

export default createSaymonCellTheme
