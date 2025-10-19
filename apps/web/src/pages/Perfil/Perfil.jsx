import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  MenuItem,
  Avatar,
  Divider,
  Chip,
  Stack,
  Alert,
} from '@mui/material'
import {
  AccountCircle,
  Settings,
  ColorLens,
  CreditCard,
  Upload as UploadIcon,
  Save as SaveIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useThemeMode } from '../../contexts/ThemeContext'
import billingService from '../../services/billingService'
import { useAuth } from '../../contexts/AuthContext'

function TabPanel({ children, value, index }) {
  if (value !== index) return null
  return <Box sx={{ mt: 2 }}>{children}</Box>
}

const Perfil = () => {
  const { isDarkMode, toggleTheme } = useThemeMode()
  const { user, signOut, loginWithMagicLink } = useAuth()
  const [tab, setTab] = useState(0)

  // Perfil
  const [profile, setProfile] = useLocalStorage('celler.profile', {
    name: 'Usuário',
    email: 'usuario@exemplo.com',
    phone: '',
    avatar: '',
  })
  const [profileMsg, setProfileMsg] = useState('')

  // Preferências
  const [prefs, setPrefs] = useLocalStorage('celler.preferences', {
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'dd/MM/yyyy',
    notifications: true,
  })
  const [prefsMsg, setPrefsMsg] = useState('')

  // Customização
  const [custom, setCustom] = useLocalStorage('celler.customization', {
    brandName: 'Celler',
    primaryColor: '#ff0000',
    logoDataUrl: '',
  })
  const [customMsg, setCustomMsg] = useState('')

  // Assinatura (Asaas)
  const [summary, setSummary] = useState(null)
  const [billingMsg, setBillingMsg] = useState('')
  const [loadingBilling, setLoadingBilling] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingBilling(true)
        const s = await billingService.getSummary()
        setSummary(s)
      } catch (e) {
        setBillingMsg(String(e.message || e))
      } finally {
        setLoadingBilling(false)
      }
    }
    load()
  }, [])

  const avatarSrc = useMemo(() => profile.avatar || '', [profile.avatar])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile({ ...profile, avatar: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCustom({ ...custom, logoDataUrl: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = () => {
    setProfile({ ...profile })
    setProfileMsg('Perfil atualizado com sucesso!')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  const savePrefs = () => {
    setPrefs({ ...prefs })
    setPrefsMsg('Preferências salvas!')
    setTimeout(() => setPrefsMsg(''), 3000)
  }

  const saveCustom = () => {
    setCustom({ ...custom })
    window.dispatchEvent(new Event('celler:customization-changed'))
    setCustomMsg('Personalização salva!')
    setTimeout(() => setCustomMsg(''), 3000)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setProfileMsg('Sessão encerrada.')
      setTimeout(() => setProfileMsg(''), 3000)
    } catch (e) {
      setProfileMsg('Erro ao encerrar sessão')
    }
  }

  const handleMagicLink = async () => {
    try {
      await loginWithMagicLink(profile.email || 'usuario@exemplo.com')
      setProfileMsg('Link de acesso enviado ao e-mail informado.')
      setTimeout(() => setProfileMsg(''), 4000)
    } catch (e) {
      setProfileMsg('Falha ao enviar link de acesso')
      setTimeout(() => setProfileMsg(''), 4000)
    }
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar src={avatarSrc} sx={{ width: 64, height: 64 }}>
          {profile.name?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Perfil do Usuário
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure seus dados, preferências e assinatura do sistema
          </Typography>
        </Box>
        {user ? (
          <Button startIcon={<LogoutIcon />} variant="outlined" onClick={handleLogout}>
            Sair
          </Button>
        ) : (
          <Button variant="outlined" onClick={handleMagicLink}>Entrar por e‑mail</Button>
        )}
      </Stack>

      <Card>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab icon={<AccountCircle />} iconPosition="start" label="Conta" />
            <Tab icon={<Settings />} iconPosition="start" label="Preferências" />
            <Tab icon={<ColorLens />} iconPosition="start" label="Personalização" />
            <Tab icon={<CreditCard />} iconPosition="start" label="Assinatura" />
          </Tabs>

          <Divider sx={{ my: 2 }} />

          {/* Conta */}
          <TabPanel value={tab} index={0}>
            {profileMsg && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setProfileMsg('')}>
                {profileMsg}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="E-mail"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
                  Trocar avatar
                  <input hidden type="file" accept="image/*" onChange={handleAvatarChange} />
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button onClick={saveProfile} variant="contained" startIcon={<SaveIcon />}>Salvar</Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Preferências */}
          <TabPanel value={tab} index={1}>
            {prefsMsg && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPrefsMsg('')}>
                {prefsMsg}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={<Switch checked={isDarkMode} onChange={toggleTheme} />}
                  label="Modo escuro"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!prefs.notifications}
                      onChange={(e) => setPrefs({ ...prefs, notifications: e.target.checked })}
                    />
                  }
                  label="Notificações"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Idioma"
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                >
                  <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                  <MenuItem value="en-US">English</MenuItem>
                  <MenuItem value="es-ES">Español</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Moeda"
                  value={prefs.currency}
                  onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                >
                  <MenuItem value="BRL">R$ (Real)</MenuItem>
                  <MenuItem value="USD">$ (US Dollar)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Formato de data"
                  value={prefs.dateFormat}
                  onChange={(e) => setPrefs({ ...prefs, dateFormat: e.target.value })}
                >
                  <MenuItem value="dd/MM/yyyy">dd/MM/yyyy</MenuItem>
                  <MenuItem value="MM/dd/yyyy">MM/dd/yyyy</MenuItem>
                  <MenuItem value="yyyy-MM-dd">yyyy-MM-dd</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button onClick={savePrefs} variant="contained" startIcon={<SaveIcon />}>Salvar</Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Personalização */}
          <TabPanel value={tab} index={2}>
            {customMsg && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCustomMsg('')}>
                {customMsg}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome da marca"
                  value={custom.brandName}
                  onChange={(e) => setCustom({ ...custom, brandName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="color"
                  label="Cor primária"
                  value={custom.primaryColor}
                  onChange={(e) => setCustom({ ...custom, primaryColor: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button component="label" variant="outlined" startIcon={<UploadIcon />} fullWidth>
                  Logo
                  <input hidden type="file" accept="image/*" onChange={handleLogoChange} />
                </Button>
              </Grid>
              {custom.logoDataUrl && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={custom.logoDataUrl} variant="rounded" sx={{ width: 64, height: 64 }} />
                    <Typography variant="body2" color="text.secondary">
                      Pré-visualização da logo
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  A aplicação dinâmica da cor primária no tema será adicionada na próxima etapa.
                </Alert>
                <Button onClick={saveCustom} variant="contained" startIcon={<SaveIcon />}>Salvar</Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Assinatura */}
          <TabPanel value={tab} index={3}>
            {billingMsg && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBillingMsg('')}>
                {billingMsg}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Seu Plano
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip label={summary?.plan || 'N/D'} color="primary" />
                      <Chip label={summary?.status || 'N/D'} variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Próxima cobrança: {loadingBilling ? '—' : new Date(summary?.next_billing_date || Date.now()).toLocaleDateString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Método: {summary?.payment_method || 'N/D'}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={async () => {
                          const url = await billingService.getPortalLink()
                          if (url && url !== '#') window.open(url, '_blank')
                        }}
                      >
                        Gerenciar plano
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          const url = await billingService.getPortalLink()
                          if (url && url !== '#') window.open(url, '_blank')
                        }}
                      >
                        Atualizar pagamento
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Faturas Recentes
                    </Typography>
                    <Stack spacing={1}>
                      {(summary?.invoices || []).map((inv) => (
                        <Stack key={inv.id} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{inv.id}</Typography>
                          <Typography variant="body2" color={inv.status === 'paid' ? 'success.main' : 'text.secondary'}>
                            {inv.status}
                          </Typography>
                        </Stack>
                      ))}
                      {!summary?.invoices?.length && (
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma fatura encontrada
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Perfil
