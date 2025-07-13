import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  QuestionAnswer as QuestionAnswerIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material'

export default function BotTraining() {
  const [trainings, setTrainings] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState(null)
  const [formData, setFormData] = useState({
    intent: '',
    patterns: [],
    responses: [],
    context: '',
    priority: 1,
    active: true,
  })
  const [newPattern, setNewPattern] = useState('')
  const [newResponse, setNewResponse] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Comandos pré-definidos do bot
  const predefinedCommands = [
    {
      intent: 'saudacao',
      patterns: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'e aí'],
      responses: [
        'Olá! Bem-vindo à Saymon Cell! 😊\n\nComo posso ajudá-lo hoje?\n\n• Digite *STATUS* para consultar sua ordem\n• Digite *ORÇAMENTO* para solicitar orçamento\n• Digite *LOCALIZAÇÃO* para ver nosso endereço\n• Digite *HORÁRIO* para ver nosso funcionamento\n• Digite *ATENDIMENTO* para falar com um humano',
        'Oi! Que bom ter você aqui! 👋\n\nEm que posso ajudá-lo?\n\n🔧 *STATUS* - Consultar ordem de serviço\n💰 *ORÇAMENTO* - Solicitar orçamento\n📍 *LOCALIZAÇÃO* - Ver endereço\n⏰ *HORÁRIO* - Horário de funcionamento\n👨‍💼 *ATENDIMENTO* - Falar com atendente',
      ],
      context: 'Saudação inicial do cliente',
      priority: 1,
      active: true,
    },
    {
      intent: 'status_ordem',
      patterns: ['status', 'consultar', 'ordem', 'andamento', 'situação'],
      responses: [
        'Para consultar o status da sua ordem de serviço, preciso do número da ordem.\n\nPor favor, me informe o número que aparece no seu comprovante. 📋',
        'Vou verificar o status da sua ordem! 🔍\n\nMe informe o número da ordem de serviço (ex: #001, #123, etc.)',
      ],
      context: 'Consulta de status de ordem de serviço',
      priority: 2,
      active: true,
    },
    {
      intent: 'orcamento',
      patterns: ['orçamento', 'preço', 'valor', 'quanto custa', 'cotação'],
      responses: [
        'Ficou interessado em nossos serviços? Ótimo! 💰\n\nPara fazer um orçamento preciso, me conte:\n• Qual o problema do seu aparelho?\n• Marca e modelo do celular\n• O que aconteceu com ele?',
        'Vamos fazer seu orçamento! 📱\n\nMe informe:\n✓ Marca e modelo do aparelho\n✓ Qual o defeito/problema\n✓ Quando começou o problema\n\nAssim posso te dar um valor mais preciso!',
      ],
      context: 'Solicitação de orçamento',
      priority: 2,
      active: true,
    },
    {
      intent: 'localizacao',
      patterns: [
        'localização',
        'endereço',
        'onde fica',
        'local',
        'como chegar',
      ],
      responses: [
        '📍 *NOSSA LOCALIZAÇÃO*\n\n🏪 Saymon Cell - Assistência Técnica\n📍 [Endereço da loja]\n🕐 Segunda a Sábado: 8h às 18h\n📞 (37) 9 9999-9999\n\n🚗 Estacionamento disponível\n🚌 Próximo ao ponto de ônibus',
      ],
      context: 'Informações de localização',
      priority: 1,
      active: true,
    },
    {
      intent: 'horario',
      patterns: ['horário', 'funcionamento', 'aberto', 'fechado', 'que horas'],
      responses: [
        '⏰ *HORÁRIO DE FUNCIONAMENTO*\n\n🕐 Segunda a Sexta: 8h às 18h\n🕐 Sábado: 8h às 16h\n❌ Domingo: Fechado\n\n📞 Atendimento WhatsApp: 24h\n🤖 Bot sempre disponível!',
      ],
      context: 'Horário de funcionamento',
      priority: 1,
      active: true,
    },
    {
      intent: 'atendimento_humano',
      patterns: [
        'atendimento',
        'humano',
        'pessoa',
        'atendente',
        'falar com alguém',
      ],
      responses: [
        'Claro! Vou transferir você para um de nossos atendentes humanos. 👨‍💼\n\nAguarde um momento que alguém irá te atender em breve.\n\n⏳ Tempo médio de espera: 2-5 minutos',
      ],
      context: 'Solicitação de atendimento humano',
      priority: 3,
      active: true,
    },
  ]

  useEffect(() => {
    loadTrainings()
  }, [])

  const loadTrainings = () => {
    // Simular carregamento dos treinamentos
    setTrainings(predefinedCommands)
  }

  const handleOpenDialog = (training = null) => {
    if (training) {
      setEditingTraining(training)
      setFormData({
        intent: training.intent,
        patterns: [...training.patterns],
        responses: [...training.responses],
        context: training.context,
        priority: training.priority,
        active: training.active,
      })
    } else {
      setEditingTraining(null)
      setFormData({
        intent: '',
        patterns: [],
        responses: [],
        context: '',
        priority: 1,
        active: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTraining(null)
    setNewPattern('')
    setNewResponse('')
  }

  const handleAddPattern = () => {
    if (newPattern.trim()) {
      setFormData((prev) => ({
        ...prev,
        patterns: [...prev.patterns, newPattern.trim().toLowerCase()],
      }))
      setNewPattern('')
    }
  }

  const handleRemovePattern = (index) => {
    setFormData((prev) => ({
      ...prev,
      patterns: prev.patterns.filter((_, i) => i !== index),
    }))
  }

  const handleAddResponse = () => {
    if (newResponse.trim()) {
      setFormData((prev) => ({
        ...prev,
        responses: [...prev.responses, newResponse.trim()],
      }))
      setNewResponse('')
    }
  }

  const handleRemoveResponse = (index) => {
    setFormData((prev) => ({
      ...prev,
      responses: prev.responses.filter((_, i) => i !== index),
    }))
  }

  const handleSave = () => {
    if (
      !formData.intent ||
      formData.patterns.length === 0 ||
      formData.responses.length === 0
    ) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    // Simular salvamento
    if (editingTraining) {
      setTrainings((prev) =>
        prev.map((t) => (t.intent === editingTraining.intent ? formData : t))
      )
    } else {
      setTrainings((prev) => [...prev, formData])
    }

    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    handleCloseDialog()
  }

  const handleDelete = (intent) => {
    setTrainings((prev) => prev.filter((t) => t.intent !== intent))
  }

  const handleToggleActive = (intent) => {
    setTrainings((prev) =>
      prev.map((t) => (t.intent === intent ? { ...t, active: !t.active } : t))
    )
  }

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Treinamento salvo com sucesso!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Painel de controle */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={2}
            >
              <Box display="flex" alignItems="center">
                <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">Treinamento do Bot IA</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ensine o bot a responder perguntas específicas
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Novo Treinamento
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Estatísticas */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PsychologyIcon
                sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
              />
              <Typography variant="h4">{trainings.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Comandos Treinados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <QuestionAnswerIcon
                sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
              />
              <Typography variant="h4">
                {trainings.filter((t) => t.active).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comandos Ativos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LightbulbIcon
                sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
              />
              <Typography variant="h4">
                {trainings.reduce((acc, t) => acc + t.patterns.length, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Padrões Reconhecidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de treinamentos */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comandos Configurados
              </Typography>

              {trainings.map((training, index) => (
                <Accordion key={training.intent} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1">
                          {training.intent.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {training.context}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={`Prioridade ${training.priority}`}
                          size="small"
                          color={
                            training.priority >= 3
                              ? 'error'
                              : training.priority >= 2
                              ? 'warning'
                              : 'default'
                          }
                        />
                        <Chip
                          label={training.active ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={training.active ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Padrões Reconhecidos:
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          {training.patterns.map((pattern, i) => (
                            <Chip
                              key={i}
                              label={pattern}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Respostas ({training.responses.length}):
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {training.responses[0]?.substring(0, 100)}...
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          <Button
                            size="small"
                            onClick={() => handleToggleActive(training.intent)}
                            color={training.active ? 'warning' : 'success'}
                          >
                            {training.active ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenDialog(training)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(training.intent)}
                          >
                            Excluir
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de edição */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Intenção/Comando"
                  value={formData.intent}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, intent: e.target.value }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contexto"
                  value={formData.context}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      context: e.target.value,
                    }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Adicionar Padrão"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPattern()}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAddPattern}
                  sx={{ height: '56px' }}
                >
                  Adicionar
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Padrões:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {formData.patterns.map((pattern, i) => (
                    <Chip
                      key={i}
                      label={pattern}
                      onDelete={() => handleRemovePattern(i)}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Adicionar Resposta"
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddResponse}
                  sx={{ mb: 2 }}
                >
                  Adicionar Resposta
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Respostas:
                </Typography>
                {formData.responses.map((response, i) => (
                  <Box
                    key={i}
                    sx={{
                      mb: 1,
                      p: 1,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2">{response}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveResponse(i)}
                    >
                      Remover
                    </Button>
                  </Box>
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value={1}>Baixa</MenuItem>
                    <MenuItem value={2}>Média</MenuItem>
                    <MenuItem value={3}>Alta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          active: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Comando Ativo"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
