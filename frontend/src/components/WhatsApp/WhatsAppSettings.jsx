import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Message as MessageIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material'
import whatsappService from '../../services/whatsappService'

export default function WhatsAppSettings() {
  const [settings, setSettings] = useState({
    business_name: 'Saymon Cell',
    business_phone: '(37) 9 9999-9999',
    business_email: 'contato@saymon-cell.com',
    business_address: '[Endereço da loja]',
    auto_reply_enabled: true,
    business_hours_start: 8,
    business_hours_end: 18,
    business_days: [1, 2, 3, 4, 5, 6],
    welcome_message: 'Bem-vindo à Saymon Cell! Como posso ajudá-lo?',
    away_message:
      'No momento estamos fora do horário comercial. Retornaremos em breve!',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const daysOfWeek = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await whatsappService.getSettings()
      if (response.success && response.data) {
        setSettings({
          ...settings,
          ...response.data,
          business_days: response.data.business_days
            ? JSON.parse(response.data.business_days)
            : [1, 2, 3, 4, 5, 6],
        })
      }
    } catch (err) {
      setError('Erro ao carregar configurações')
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const dataToSave = {
        ...settings,
        business_days: JSON.stringify(settings.business_days),
      }

      await whatsappService.updateSettings(dataToSave)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Erro ao salvar configurações')
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleDayToggle = (day) => {
    setSettings((prev) => ({
      ...prev,
      business_days: prev.business_days.includes(day)
        ? prev.business_days.filter((d) => d !== day)
        : [...prev.business_days, day].sort(),
    }))
  }

  const handleReset = () => {
    loadSettings()
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando configurações...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configurações salvas com sucesso!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informações do Negócio */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Informações do Negócio</Typography>
              </Box>

              <Box sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                <TextField
                  fullWidth
                  label="Nome da Empresa"
                  value={settings.business_name}
                  onChange={(e) =>
                    handleInputChange('business_name', e.target.value)
                  }
                />

                <TextField
                  fullWidth
                  label="Telefone"
                  value={settings.business_phone}
                  onChange={(e) =>
                    handleInputChange('business_phone', e.target.value)
                  }
                />

                <TextField
                  fullWidth
                  label="E-mail"
                  type="email"
                  value={settings.business_email}
                  onChange={(e) =>
                    handleInputChange('business_email', e.target.value)
                  }
                />

                <TextField
                  fullWidth
                  label="Endereço"
                  multiline
                  rows={2}
                  value={settings.business_address}
                  onChange={(e) =>
                    handleInputChange('business_address', e.target.value)
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Horário de Funcionamento */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ScheduleIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Horário de Funcionamento</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.auto_reply_enabled}
                      onChange={(e) =>
                        handleInputChange(
                          'auto_reply_enabled',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Respostas automáticas ativas"
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Hora de Abertura</InputLabel>
                    <Select
                      value={settings.business_hours_start}
                      onChange={(e) =>
                        handleInputChange(
                          'business_hours_start',
                          e.target.value
                        )
                      }
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Hora de Fechamento</InputLabel>
                    <Select
                      value={settings.business_hours_end}
                      onChange={(e) =>
                        handleInputChange('business_hours_end', e.target.value)
                      }
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Dias de Funcionamento
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {daysOfWeek.map((day) => (
                  <Chip
                    key={day.value}
                    label={day.label.substring(0, 3)}
                    onClick={() => handleDayToggle(day.value)}
                    color={
                      settings.business_days.includes(day.value)
                        ? 'primary'
                        : 'default'
                    }
                    variant={
                      settings.business_days.includes(day.value)
                        ? 'filled'
                        : 'outlined'
                    }
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Mensagens Automáticas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MessageIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Mensagens Automáticas</Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mensagem de Boas-vindas"
                    multiline
                    rows={4}
                    value={settings.welcome_message}
                    onChange={(e) =>
                      handleInputChange('welcome_message', e.target.value)
                    }
                    helperText="Mensagem enviada quando o cliente inicia uma conversa"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mensagem Fora do Horário"
                    multiline
                    rows={4}
                    value={settings.away_message}
                    onChange={(e) =>
                      handleInputChange('away_message', e.target.value)
                    }
                    helperText="Mensagem enviada fora do horário comercial"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Comandos do Bot */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comandos Disponíveis do Bot
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Os clientes podem usar estes comandos para interagir com o bot:
              </Typography>

              <List dense>
                {[
                  {
                    command: 'OI, OLÁ, BOM DIA',
                    description: 'Saudação e menu principal',
                  },
                  {
                    command: 'STATUS',
                    description: 'Consultar status de ordem de serviço',
                  },
                  { command: 'ORÇAMENTO', description: 'Solicitar orçamento' },
                  {
                    command: 'LOCALIZAÇÃO',
                    description: 'Ver endereço da loja',
                  },
                  {
                    command: 'HORÁRIO',
                    description: 'Ver horário de funcionamento',
                  },
                  {
                    command: 'ATENDIMENTO',
                    description: 'Falar com atendente humano',
                  },
                ].map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={<Chip label={item.command} size="small" />}
                      secondary={item.description}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Botões de Ação */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="outlined"
              onClick={handleReset}
              startIcon={<RestoreIcon />}
            >
              Restaurar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              Salvar Configurações
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
