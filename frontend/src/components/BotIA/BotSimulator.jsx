import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'

export default function BotSimulator() {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('')
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    botResponses: 0,
    responseTime: 0,
    accuracy: 100,
  })
  const messagesEndRef = useRef(null)

  // Cenários pré-definidos para teste
  const testScenarios = [
    {
      id: 'saudacao',
      name: 'Saudação Inicial',
      messages: ['oi', 'bom dia', 'olá'],
    },
    {
      id: 'status',
      name: 'Consulta de Status',
      messages: ['oi', 'status', '123'],
    },
    {
      id: 'orcamento',
      name: 'Solicitação de Orçamento',
      messages: ['oi', 'orçamento', 'iphone 12 tela quebrada'],
    },
    {
      id: 'atendimento',
      name: 'Atendimento Humano',
      messages: ['oi', 'quero falar com atendente', 'atendimento'],
    },
  ]

  // Respostas simuladas do bot
  const botResponses = {
    oi: 'Olá! Bem-vindo à Saymon Cell! 😊\n\nComo posso ajudá-lo hoje?\n\n• Digite *STATUS* para consultar sua ordem\n• Digite *ORÇAMENTO* para solicitar orçamento\n• Digite *LOCALIZAÇÃO* para ver nosso endereço\n• Digite *HORÁRIO* para ver nosso funcionamento\n• Digite *ATENDIMENTO* para falar com um humano',
    'bom dia':
      'Bom dia! Que bom ter você aqui! 👋\n\nEm que posso ajudá-lo?\n\n🔧 *STATUS* - Consultar ordem de serviço\n💰 *ORÇAMENTO* - Solicitar orçamento\n📍 *LOCALIZAÇÃO* - Ver endereço\n⏰ *HORÁRIO* - Horário de funcionamento\n👨‍💼 *ATENDIMENTO* - Falar com atendente',
    olá: 'Olá! Bem-vindo à Saymon Cell! 😊\n\nComo posso ajudá-lo hoje?',
    status:
      'Para consultar o status da sua ordem de serviço, preciso do número da ordem.\n\nPor favor, me informe o número que aparece no seu comprovante. 📋',
    123: 'Encontrei sua ordem #123! 📱\n\n*Status:* Em andamento\n*Equipamento:* iPhone 12\n*Defeito:* Tela quebrada\n*Previsão:* 2-3 dias úteis\n*Valor:* R$ 280,00\n\nSua ordem está sendo analisada pelo nosso técnico. Em breve teremos novidades!',
    orçamento:
      'Ficou interessado em nossos serviços? Ótimo! 💰\n\nPara fazer um orçamento preciso, me conte:\n• Qual o problema do seu aparelho?\n• Marca e modelo do celular\n• O que aconteceu com ele?',
    'iphone 12 tela quebrada':
      'Perfeito! Para troca de tela do iPhone 12:\n\n💰 *ORÇAMENTO*\n• Tela Original: R$ 380,00\n• Tela Compatível: R$ 280,00\n• Prazo: 1-2 dias úteis\n• Garantia: 90 dias\n\n📍 Quer agendar? Digite *LOCALIZAÇÃO* para ver nosso endereço!',
    'quero falar com atendente':
      'Claro! Vou transferir você para um de nossos atendentes humanos. 👨‍💼\n\nAguarde um momento que alguém irá te atender em breve.\n\n⏳ Tempo médio de espera: 2-5 minutos',
    atendimento:
      'Transferindo para atendimento humano... 👨‍💼\n\nVocê foi adicionado à fila de atendimento.\nPosição na fila: 1º\nTempo estimado: 2 minutos',
    localização:
      '📍 *NOSSA LOCALIZAÇÃO*\n\n🏪 Saymon Cell - Assistência Técnica\n📍 [Endereço da loja]\n🕐 Segunda a Sábado: 8h às 18h\n📞 (37) 9 9999-9999\n\n🚗 Estacionamento disponível\n🚌 Próximo ao ponto de ônibus',
    horário:
      '⏰ *HORÁRIO DE FUNCIONAMENTO*\n\n🕐 Segunda a Sexta: 8h às 18h\n🕐 Sábado: 8h às 16h\n❌ Domingo: Fechado\n\n📞 Atendimento WhatsApp: 24h\n🤖 Bot sempre disponível!',
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simular tempo de processamento do bot
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage.toLowerCase())
      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)

      // Atualizar estatísticas
      setSessionStats((prev) => ({
        totalMessages: prev.totalMessages + 2,
        botResponses: prev.botResponses + 1,
        responseTime: Math.random() * 2 + 0.5, // 0.5-2.5 segundos
        accuracy: Math.min(100, prev.accuracy + Math.random() * 5),
      }))
    }, 1000 + Math.random() * 1000) // 1-2 segundos
  }

  const getBotResponse = (message) => {
    // Buscar resposta exata
    if (botResponses[message]) {
      return botResponses[message]
    }

    // Buscar por palavras-chave
    const keywords = Object.keys(botResponses)
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        return botResponses[keyword]
      }
    }

    // Resposta padrão
    return 'Desculpe, não entendi sua mensagem. 🤔\n\nTente uma destas opções:\n• *STATUS* - Consultar ordem\n• *ORÇAMENTO* - Solicitar orçamento\n• *LOCALIZAÇÃO* - Ver endereço\n• *ATENDIMENTO* - Falar com humano'
  }

  const runScenario = (scenario) => {
    setMessages([])
    setSessionStats({
      totalMessages: 0,
      botResponses: 0,
      responseTime: 0,
      accuracy: 100,
    })

    let delay = 0
    scenario.messages.forEach((msg, index) => {
      setTimeout(() => {
        setInputMessage(msg)
        setTimeout(() => {
          sendMessage()
        }, 500)
      }, delay)
      delay += 3000 // 3 segundos entre mensagens
    })
  }

  const clearChat = () => {
    setMessages([])
    setSessionStats({
      totalMessages: 0,
      botResponses: 0,
      responseTime: 0,
      accuracy: 100,
    })
  }

  const exportChat = () => {
    const chatText = messages
      .map(
        (msg) =>
          `[${msg.timestamp.toLocaleTimeString()}] ${
            msg.sender === 'user' ? 'Usuário' : 'Bot'
          }: ${msg.text}`
      )
      .join('\n\n')

    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-simulacao-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  return (
    <Box>
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
                <PlayIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">Simulador de Conversas</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teste o comportamento do bot em diferentes cenários
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={2} flexWrap="wrap">
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Cenário de Teste</InputLabel>
                  <Select
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                  >
                    {testScenarios.map((scenario) => (
                      <MenuItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const scenario = testScenarios.find(
                      (s) => s.id === selectedScenario
                    )
                    if (scenario) runScenario(scenario)
                  }}
                  disabled={!selectedScenario}
                >
                  Executar Cenário
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={clearChat}
                >
                  Limpar Chat
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportChat}
                  disabled={messages.length === 0}
                >
                  Exportar
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Estatísticas da sessão */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {sessionStats.totalMessages}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mensagens Trocadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {sessionStats.botResponses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Respostas do Bot
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {sessionStats.responseTime.toFixed(1)}s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tempo de Resposta
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {sessionStats.accuracy.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Precisão
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat simulator */}
        <Grid item xs={12}>
          <Card
            sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                p: 0,
              }}
            >
              {/* Header do chat */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{ bgcolor: 'white', color: 'primary.main', mr: 2 }}
                  >
                    <BotIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Bot Saymon Cell</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {isTyping ? 'Digitando...' : 'Online'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Área de mensagens */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                {messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <BotIcon
                      sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      Simulador do Bot IA
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Digite uma mensagem ou execute um cenário de teste
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ py: 0 }}>
                    {messages.map((message) => (
                      <ListItem
                        key={message.id}
                        sx={{
                          flexDirection: 'column',
                          alignItems:
                            message.sender === 'user'
                              ? 'flex-end'
                              : 'flex-start',
                          py: 1,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 2,
                            borderRadius: 2,
                            bgcolor:
                              message.sender === 'user'
                                ? 'primary.main'
                                : 'grey.100',
                            color:
                              message.sender === 'user'
                                ? 'white'
                                : 'text.primary',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          <Typography variant="body2">
                            {message.text}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      </ListItem>
                    ))}
                    {isTyping && (
                      <ListItem sx={{ alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            bgcolor: 'grey.100',
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Bot está digitando...
                          </Typography>
                        </Box>
                      </ListItem>
                    )}
                    <div ref={messagesEndRef} />
                  </List>
                )}
              </Box>

              {/* Input de mensagem */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    placeholder="Digite sua mensagem..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isTyping}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Dicas de teste */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              💡 Dicas para testar o bot:
            </Typography>
            <Typography variant="body2">
              • Teste comandos básicos: "oi", "status", "orçamento",
              "localização", "horário", "atendimento"
              <br />
              • Experimente variações: "bom dia", "olá", "e aí", "quero falar
              com atendente"
              <br />
              • Teste números de ordem: digite "status" e depois "123"
              <br />• Simule solicitações de orçamento: "orçamento" seguido de
              "iphone 12 tela quebrada"
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  )
}
