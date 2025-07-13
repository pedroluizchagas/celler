import React, { useState, useEffect, useRef } from 'react'
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
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  InputAdornment,
  Badge,
  Fab,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Send as SendIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CallReceived as ReceivedIcon,
  CallMade as SentIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import whatsappService from '../../services/whatsappService'

export default function WhatsAppMessages() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendLoading, setSendLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [newChatDialog, setNewChatDialog] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState('')
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const messagesEndRef = useRef(null)
  const refreshInterval = useRef(null)

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      if (isMounted) {
        await loadConversations()
      }
    }

    loadInitialData()

    // Auto-refresh a cada 5 segundos se ativado
    if (autoRefresh) {
      refreshInterval.current = setInterval(async () => {
        if (isMounted) {
          await loadConversations()
          if (selectedConversation) {
            await loadMessages(selectedConversation.phone_number)
          }
        }
      }, 5000)
    }

    return () => {
      isMounted = false
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
        refreshInterval.current = null
      }
    }
  }, [autoRefresh])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Effect separado para mudanças na conversa selecionada
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.phone_number)
    }
  }, [selectedConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null) // Limpar erros anteriores

      const response = await Promise.race([
        whatsappService.getMessages(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        ),
      ])

      // Verificar se o componente ainda está montado
      if (
        !document.contains(
          document.querySelector('[data-testid="whatsapp-messages"]')
        )
      ) {
        return
      }

      // Agrupar mensagens por número de telefone
      const messagesByPhone = {}
      const allMessages = response.data || []

      allMessages.forEach((msg) => {
        const phone = msg.phone_number
        const normalizedPhone = normalizePhoneNumber(phone) || phone

        if (!messagesByPhone[normalizedPhone]) {
          messagesByPhone[normalizedPhone] = {
            phone_number: normalizedPhone,
            contact_name: msg.contact_name || normalizedPhone,
            messages: [],
            lastMessage: null,
            lastTimestamp: null,
            unreadCount: 0,
          }
        }
        messagesByPhone[normalizedPhone].messages.push(msg)
      })

      // Processar cada conversa
      const conversationsList = Object.values(messagesByPhone).map((conv) => {
        const sortedMessages = conv.messages.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        )

        const lastMessage = sortedMessages[sortedMessages.length - 1]
        const unreadCount = sortedMessages.filter(
          (msg) => msg.direction === 'received' && !msg.read_at
        ).length

        return {
          ...conv,
          messages: sortedMessages,
          lastMessage: lastMessage?.message_body || 'Mensagem sem texto',
          lastTimestamp: lastMessage?.timestamp,
          unreadCount,
          isOnline: false, // Implementar lógica de status online futuramente
        }
      })

      // Ordenar por última mensagem
      conversationsList.sort(
        (a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
      )

      setConversations(conversationsList)
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)

      // Não mostrar erro se for timeout e já temos dados
      if (err.message !== 'Timeout' || conversations.length === 0) {
        setError('Erro ao carregar conversas. Verifique sua conexão.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (phoneNumber) => {
    try {
      const response = await whatsappService.getMessages({
        phone_number: phoneNumber,
      })
      const sortedMessages = (response.data || []).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      )
      setMessages(sortedMessages)
    } catch (err) {
      setError('Erro ao carregar mensagens')
      console.error('Erro ao carregar mensagens:', err)
    }
  }

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation)
    loadMessages(conversation.phone_number)
    setError(null)

    // Marcar mensagens como lidas
    if (conversation.unreadCount > 0) {
      try {
        await whatsappService.markAsRead({
          phone_number: conversation.phone_number,
        })
        // Atualizar a lista de conversas para refletir as mensagens lidas
        setTimeout(() => {
          loadConversations()
        }, 500)
      } catch (err) {
        console.error('Erro ao marcar mensagens como lidas:', err)
      }
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    try {
      setSendLoading(true)
      await whatsappService.sendMessage({
        to: selectedConversation.phone_number,
        message: newMessage,
      })

      setNewMessage('')
      setSuccess('Mensagem enviada com sucesso!')

      // Recarregar mensagens após envio
      setTimeout(() => {
        loadMessages(selectedConversation.phone_number)
        loadConversations()
      }, 1000)
    } catch (err) {
      setError('Erro ao enviar mensagem: ' + err.message)
      console.error('Erro ao enviar:', err)
    } finally {
      setSendLoading(false)
    }
  }

  const handleNewChat = async () => {
    if (!newChatPhone.trim()) return

    try {
      // Criar nova conversa enviando uma mensagem
      await whatsappService.sendMessage({
        to: newChatPhone,
        message: 'Olá! Como posso ajudá-lo?',
      })

      setNewChatDialog(false)
      setNewChatPhone('')
      setSuccess('Nova conversa iniciada!')

      // Recarregar conversas
      setTimeout(() => {
        loadConversations()
      }, 1000)
    } catch (err) {
      setError('Erro ao iniciar nova conversa')
      console.error('Erro ao criar conversa:', err)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now - date
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    }
  }

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.phone_number.includes(searchTerm)
  )

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Função para normalizar números de telefone (similar ao backend)
  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return null

    // Remover @c.us se existir
    let normalized = phoneNumber.replace('@c.us', '')

    // Remover caracteres especiais e espaços
    normalized = normalized.replace(/[^\d]/g, '')

    // Garantir que tenha código do país (55 para Brasil)
    if (normalized.length === 11 && normalized.startsWith('0')) {
      normalized = '55' + normalized.substring(1) // Remove o 0 e adiciona 55
    } else if (normalized.length === 10) {
      normalized = '55' + normalized // Adiciona código do país
    } else if (normalized.length === 11 && !normalized.startsWith('55')) {
      normalized = '55' + normalized // Adiciona código do país
    }

    return normalized
  }

  if (loading && conversations.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando conversas...
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      data-testid="whatsapp-messages"
      sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - Lista de Conversas */}
        <Box
          sx={{
            width: 350,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header da Sidebar */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Typography variant="h6">Conversas</Typography>
              <Box>
                <Tooltip
                  title={
                    autoRefresh ? 'Pausar atualização' : 'Ativar atualização'
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    color={autoRefresh ? 'primary' : 'default'}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Mais opções">
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Lista de Conversas */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <Box textAlign="center" py={4}>
                <MessageIcon
                  sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {searchTerm
                    ? 'Nenhuma conversa encontrada'
                    : 'Nenhuma conversa ainda'}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredConversations.map((conversation) => (
                  <ListItem
                    key={conversation.phone_number}
                    button
                    onClick={() => handleSelectConversation(conversation)}
                    selected={
                      selectedConversation?.phone_number ===
                      conversation.phone_number
                    }
                    sx={{ py: 1.5 }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={conversation.unreadCount}
                        color="primary"
                        invisible={conversation.unreadCount === 0}
                      >
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getInitials(conversation.contact_name)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2" noWrap>
                            {conversation.contact_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(conversation.lastTimestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {conversation.lastMessage}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Área Principal - Chat */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header do Chat */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: '#128C7E',
                  color: 'white',
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: 'white',
                        color: '#128C7E',
                        mr: 2,
                        fontWeight: 'bold',
                      }}
                    >
                      {getInitials(selectedConversation.contact_name)}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ color: 'white', fontWeight: 'bold' }}
                      >
                        {selectedConversation.contact_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255,255,255,0.8)' }}
                      >
                        {selectedConversation.phone_number}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Tooltip title="Ligar">
                      <IconButton size="small" sx={{ color: 'white' }}>
                        <PhoneIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>

              {/* Área de Mensagens */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: '#E5DDD5',
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)',
                }}
              >
                {messages.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <MessageIcon sx={{ fontSize: 48, color: '#999', mb: 2 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: '#666', fontWeight: '500' }}
                    >
                      Nenhuma mensagem ainda
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999', mt: 1 }}>
                      Comece a conversa enviando uma mensagem
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {messages.map((message, index) => {
                      const isOwn = message.direction === 'sent'
                      const showDate =
                        index === 0 ||
                        new Date(message.timestamp).toDateString() !==
                          new Date(messages[index - 1].timestamp).toDateString()

                      return (
                        <Box key={message.id}>
                          {showDate && (
                            <Box textAlign="center" my={2}>
                              <Chip
                                size="small"
                                label={new Date(
                                  message.timestamp
                                ).toLocaleDateString('pt-BR')}
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.9)',
                                  fontSize: '0.75rem',
                                  color: '#666',
                                  fontWeight: 'bold',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              />
                            </Box>
                          )}

                          <Box
                            display="flex"
                            justifyContent={isOwn ? 'flex-end' : 'flex-start'}
                            mb={1}
                          >
                            <Paper
                              sx={{
                                p: 1.5,
                                maxWidth: '70%',
                                bgcolor: isOwn ? '#128C7E' : 'white',
                                color: isOwn ? 'white' : '#333',
                                borderRadius: 2,
                                borderBottomRightRadius: isOwn ? 0.5 : 2,
                                borderBottomLeftRadius: isOwn ? 2 : 0.5,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                border: isOwn ? 'none' : '1px solid #e0e0e0',
                              }}
                            >
                              <Typography variant="body2">
                                {message.message_body || (
                                  <em>Mensagem sem texto</em>
                                )}
                              </Typography>
                              <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="flex-end"
                                mt={0.5}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: isOwn
                                      ? 'rgba(255,255,255,0.8)'
                                      : '#666',
                                    fontSize: '0.7rem',
                                    fontWeight: '500',
                                  }}
                                >
                                  {formatMessageTime(message.timestamp)}
                                </Typography>
                                {isOwn && (
                                  <CheckCircleIcon
                                    sx={{
                                      ml: 0.5,
                                      fontSize: '0.8rem',
                                      color: 'rgba(255,255,255,0.8)',
                                    }}
                                  />
                                )}
                              </Box>
                            </Paper>
                          </Box>
                        </Box>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </Box>
                )}
              </Box>

              {/* Input de Mensagem */}
              <Box
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: '#e0e0e0',
                  bgcolor: '#F0F0F0',
                }}
              >
                <form onSubmit={handleSendMessage}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sendLoading}
                      multiline
                      maxRows={3}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          bgcolor: 'white',
                          '&:hover': {
                            borderColor: '#128C7E',
                          },
                          '&.Mui-focused': {
                            borderColor: '#128C7E',
                            boxShadow: '0 0 0 2px rgba(18, 140, 126, 0.1)',
                          },
                        },
                      }}
                    />
                    <IconButton
                      type="submit"
                      color="primary"
                      disabled={!newMessage.trim() || sendLoading}
                      sx={{
                        bgcolor: '#128C7E',
                        color: 'white',
                        '&:hover': { bgcolor: '#0F7B6F' },
                        '&:disabled': { bgcolor: 'grey.300' },
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      {sendLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SendIcon />
                      )}
                    </IconButton>
                  </Box>
                </form>
              </Box>
            </>
          ) : (
            // Estado vazio - Nenhuma conversa selecionada
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              sx={{ bgcolor: '#f5f5f5' }}
            >
              <MessageIcon
                sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Selecione uma conversa
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                Escolha uma conversa da lista para começar a interagir
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* FAB - Nova Conversa */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setNewChatDialog(true)}
      >
        <AddIcon />
      </Fab>

      {/* Menu de Opções */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            loadConversations()
            setMenuAnchor(null)
          }}
        >
          <RefreshIcon sx={{ mr: 1 }} />
          Atualizar Conversas
        </MenuItem>
        <MenuItem
          onClick={() => {
            setNewChatDialog(true)
            setMenuAnchor(null)
          }}
        >
          <AddIcon sx={{ mr: 1 }} />
          Nova Conversa
        </MenuItem>
      </Menu>

      {/* Dialog - Nova Conversa */}
      <Dialog
        open={newChatDialog}
        onClose={() => setNewChatDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AddIcon sx={{ mr: 2 }} />
            Iniciar Nova Conversa
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Número do WhatsApp"
              placeholder="Ex: 5537999999999"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              helperText="Digite o número com código do país (55) e DDD"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleNewChat}
            variant="contained"
            disabled={!newChatPhone.trim()}
          >
            Iniciar Conversa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
