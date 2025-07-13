import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
} from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'

export default function BotConfig() {
  const [config, setConfig] = useState({
    enabled: true,
    responseDelay: 1000,
    fallbackMessage:
      'Desculpe, não entendi. Digite ATENDIMENTO para falar com um humano.',
    learningMode: true,
  })
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configurações salvas com sucesso!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configurações Gerais
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Bot Ativo"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Delay de Resposta (ms)"
                type="number"
                value={config.responseDelay}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    responseDelay: e.target.value,
                  }))
                }
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mensagem de Fallback"
                value={config.fallbackMessage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    fallbackMessage: e.target.value,
                  }))
                }
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.learningMode}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        learningMode: e.target.checked,
                      }))
                    }
                  />
                }
                label="Modo Aprendizado"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Salvar Configurações
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}
