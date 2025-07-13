import React from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'

export default function BotAnalytics({ botStats }) {
  const analytics = {
    successRate: 85,
    averageResponseTime: 0.8,
    popularCommands: [
      { command: 'saudacao', count: 245, percentage: 35 },
      { command: 'status', count: 156, percentage: 22 },
      { command: 'orcamento', count: 134, percentage: 19 },
      { command: 'localizacao', count: 89, percentage: 13 },
      { command: 'atendimento', count: 76, percentage: 11 },
    ],
    hourlyDistribution: [
      { hour: '8h-10h', count: 45 },
      { hour: '10h-12h', count: 67 },
      { hour: '12h-14h', count: 34 },
      { hour: '14h-16h', count: 89 },
      { hour: '16h-18h', count: 76 },
    ],
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Métricas principais */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon
                sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
              />
              <Typography variant="h4" color="success.main">
                {analytics.successRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Taxa de Sucesso
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analytics.successRate}
                color="success"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {analytics.averageResponseTime}s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tempo Médio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon
                sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
              />
              <Typography variant="h4" color="primary.main">
                {botStats?.totalInteractions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Interações Hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ErrorIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {100 - analytics.successRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Não Compreendidas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Comandos mais populares */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comandos Mais Utilizados
              </Typography>
              <List>
                {analytics.popularCommands.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle1">
                            {item.command.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Chip
                            label={`${item.count} (${item.percentage}%)`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <LinearProgress
                          variant="determinate"
                          value={item.percentage * 2.5}
                          sx={{ mt: 1 }}
                        />
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Distribuição por horário */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribuição por Horário
              </Typography>
              <List>
                {analytics.hourlyDistribution.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle1">
                            {item.hour}
                          </Typography>
                          <Chip
                            label={`${item.count} interações`}
                            color="secondary"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <LinearProgress
                          variant="determinate"
                          value={(item.count / 89) * 100}
                          color="secondary"
                          sx={{ mt: 1 }}
                        />
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Insights e Recomendações
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="success.main"
                    gutterBottom
                  >
                    ✅ Pontos Fortes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Alta taxa de sucesso (85%)
                    <br />
                    • Resposta rápida (0.8s)
                    <br />• Comandos bem reconhecidos
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="warning.main"
                    gutterBottom
                  >
                    ⚠️ Oportunidades
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Melhorar reconhecimento de variações
                    <br />
                    • Adicionar mais comandos
                    <br />• Treinar para perguntas complexas
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="info.main"
                    gutterBottom
                  >
                    💡 Sugestões
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Horário de pico: 14h-16h
                    <br />
                    • Implementar FAQ automático
                    <br />• Adicionar emojis nas respostas
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
