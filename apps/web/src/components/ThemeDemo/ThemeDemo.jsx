import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton,
  Fade,
  Grow,
} from '@mui/material'
import {
  Smartphone,
  Star,
  Favorite,
  Share,
  MoreVert,
  CheckCircle,
  Build,
  Schedule,
} from '@mui/icons-material'

const ThemeDemo = () => {
  const demoData = [
    {
      id: 1,
      nome: 'João Silva',
      dispositivo: 'iPhone 13',
      status: 'em_reparo',
    },
    {
      id: 2,
      nome: 'Maria Santos',
      dispositivo: 'Samsung Galaxy',
      status: 'pronto',
    },
    {
      id: 3,
      nome: 'Pedro Costa',
      dispositivo: 'Xiaomi Note',
      status: 'recebido',
    },
  ]

  const getStatusColor = (status) => {
    const colors = {
      recebido: '#3b82f6',
      em_reparo: '#8b5cf6',
      pronto: '#10b981',
    }
    return colors[status] || '#6b7280'
  }

  const getStatusIcon = (status) => {
    const icons = {
      recebido: <Schedule />,
      em_reparo: <Build />,
      pronto: <CheckCircle />,
    }
    return icons[status] || <Schedule />
  }

  return (
    <Box sx={{ p: 3 }}>
      <Fade in timeout={600}>
        <Box mb={4} className="animate-slide-up">
          <Typography
            variant="h3"
            component="h1"
            className="modern-title"
            sx={{
              mb: 1,
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Demonstração de Tema
          </Typography>
          <Typography
            variant="body1"
            className="modern-subtitle"
            sx={{
              color: 'text.secondary',
              fontSize: '1.1rem',
              opacity: 0.8,
            }}
          >
            Interface moderna com glassmorphism e efeitos futurísticos
          </Typography>
        </Box>
      </Fade>

      <Grid container spacing={3}>
        {/* Cards com Glassmorphism */}
        <Grid item xs={12} md={6}>
          <Grow in timeout={800}>
            <Card className="glass-card modern-elevation">
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '50%',
                      background: (theme) => `linear-gradient(135deg, ${'rgba(var(--accent-rgb), 0.1)'}, ${'rgba(var(--accent-neon-rgb), 0.05)'})`,
                      backdropFilter: 'blur(10px)',
                      mr: 2,
                    }}
                  >
                    <Smartphone sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Card Moderno
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Com glassmorphism e blur
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" paragraph>
                  Este card utiliza glassmorphism com backdrop-filter blur,
                  bordas arredondadas e sombras modernas para criar um efeito
                  visual futurístico.
                </Typography>
                <Box display="flex" gap={1} mb={2}>
                  <Chip
                    label="Moderno"
                    className="modern-status"
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="Glassmorphism"
                    className="modern-status"
                    sx={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Button
                  variant="contained"
                  className="futuristic-button"
                  fullWidth
                >
                  Botão Futurístico
                </Button>
              </CardContent>
            </Card>
          </Grow>
        </Grid>

        {/* Inputs Modernos */}
        <Grid item xs={12} md={6}>
          <Grow in timeout={1000}>
            <Card className="glass-card modern-elevation">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Inputs Modernos
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Nome do Cliente"
                    variant="outlined"
                    className="modern-input"
                    fullWidth
                  />
                  <TextField
                    label="Dispositivo"
                    variant="outlined"
                    className="modern-input"
                    fullWidth
                  />
                  <TextField
                    label="Descrição do Problema"
                    variant="outlined"
                    multiline
                    rows={3}
                    className="modern-input"
                    fullWidth
                  />
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      className="futuristic-button"
                      sx={{ flex: 1 }}
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="outlined"
                      className="futuristic-button"
                      sx={{
                        flex: 1,
                        background: 'transparent',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                      }}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>

        {/* Tabela Moderna */}
        <Grid item xs={12}>
          <Fade in timeout={1200}>
            <Card className="glass-card modern-elevation">
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 3, pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Tabela Moderna
                  </Typography>
                </Box>
                <TableContainer className="modern-table">
                  <Table>
                    <TableHead className="modern-table-header">
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Dispositivo</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {demoData.map((item, index) => (
                        <TableRow
                          key={item.id}
                          className="modern-table-row"
                          sx={{
                            animation: `slideInUp 0.6s ease-out ${
                              index * 0.1
                            }s both`,
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>
                            #{item.id}
                          </TableCell>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Smartphone
                                sx={{ fontSize: 16, color: 'text.secondary' }}
                              />
                              {item.dispositivo}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              className="modern-status"
                              icon={getStatusIcon(item.status)}
                              label={item.status
                                .replace('_', ' ')
                                .toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor:
                                  getStatusColor(item.status) + '20',
                                color: getStatusColor(item.status),
                                border: `1px solid ${getStatusColor(
                                  item.status
                                )}40`,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <IconButton
                                size="small"
                                sx={{
                                  borderRadius: 2,
                                  '&:hover': { transform: 'scale(1.1)' },
                                }}
                              >
                                <Star sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                sx={{
                                  borderRadius: 2,
                                  '&:hover': { transform: 'scale(1.1)' },
                                }}
                              >
                                <Share sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                sx={{
                                  borderRadius: 2,
                                  '&:hover': { transform: 'scale(1.1)' },
                                }}
                              >
                                <MoreVert sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Fade>
        </Grid>

        {/* Demonstração de Efeitos */}
        <Grid item xs={12}>
          <Fade in timeout={1400}>
            <Card className="glass-card modern-elevation">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Efeitos Visuais Especiais
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 3,
                        background: (theme) => `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? 'rgba(var(--accent-rgb), 0.05)' : 'rgba(var(--accent-rgb), 0.05)'}, ${'rgba(var(--accent-neon-rgb), 0.02)'})`,
                        border: '1px solid rgba(var(--accent-rgb), 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.15)',
                        },
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: 'primary.main', fontWeight: 700 }}
                      >
                        127
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hover Effect
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      className="pulse-modern"
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 3,
                        background:
                          'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(52, 211, 153, 0.02))',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: '#10b981', fontWeight: 700 }}
                      >
                        89%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pulse Effect
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 3,
                        background:
                          'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(251, 191, 36, 0.02))',
                        border: '1px solid rgba(245, 158, 11, 0.1)',
                        animation: 'glow-modern 3s ease-in-out infinite',
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: '#f59e0b', fontWeight: 700 }}
                      >
                        42
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Glow Effect
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 3,
                        background:
                          'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(167, 139, 250, 0.02))',
                        border: '1px solid rgba(139, 92, 246, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'scale(1.05) rotate(1deg)',
                          boxShadow: '0 12px 30px rgba(139, 92, 246, 0.2)',
                        },
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: '#8b5cf6', fontWeight: 700 }}
                      >
                        15
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Scale & Rotate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ThemeDemo
