const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class WhatsAppBot {
  constructor() {
    this.commands = this.setupCommands()
    this.conversations = new Map() // Para manter contexto das conversas
    this.businessHours = {
      start: 8,
      end: 18,
      days: [1, 2, 3, 4, 5, 6], // Segunda a sábado
    }
  }

  setupCommands() {
    return {
      oi: 'greeting',
      olá: 'greeting',
      ola: 'greeting',
      'bom dia': 'greeting',
      'boa tarde': 'greeting',
      'boa noite': 'greeting',
      menu: 'menu',
      ajuda: 'menu',
      status: 'checkStatus',
      consultar: 'checkStatus',
      orçamento: 'requestQuote',
      orcamento: 'requestQuote',
      preço: 'requestQuote',
      preco: 'requestQuote',
      localização: 'location',
      localizacao: 'location',
      endereço: 'location',
      endereco: 'location',
      horário: 'businessHours',
      horario: 'businessHours',
      contato: 'contact',
      telefone: 'contact',
      whatsapp: 'contact',
      atendimento: 'humanSupport',
      'falar com': 'humanSupport',
      técnico: 'humanSupport',
      tecnico: 'humanSupport',
    }
  }

  async processMessage(message) {
    try {
      const contact = await message.getContact()
      const messageText = message.body.toLowerCase().trim()
      const phoneNumber = contact.number

      // Verificar se é cliente cadastrado
      const cliente = await this.getClienteByPhone(phoneNumber)

      // Verificar horário comercial
      const isBusinessHours = this.isBusinessHours()

      // Analisar intenção da mensagem
      const intent = this.detectIntent(messageText)

      // Processar baseado na intenção
      let response = ''

      switch (intent) {
        case 'greeting':
          response = await this.handleGreeting(cliente, isBusinessHours)
          break

        case 'menu':
          response = this.getMenu()
          break

        case 'checkStatus':
          response = await this.handleStatusCheck(cliente, messageText)
          break

        case 'requestQuote':
          response = await this.handleQuoteRequest(cliente)
          break

        case 'location':
          response = this.getLocationInfo()
          break

        case 'businessHours':
          response = this.getBusinessHoursInfo()
          break

        case 'contact':
          response = this.getContactInfo()
          break

        case 'humanSupport':
          response = await this.handleHumanSupport(cliente, isBusinessHours)
          break

        default:
          response = await this.handleUnknownMessage(
            cliente,
            messageText,
            isBusinessHours
          )
      }

      // Registrar interação
      await this.logInteraction(
        phoneNumber,
        cliente?.id,
        messageText,
        response,
        intent
      )

      return response
    } catch (error) {
      LoggerManager.error('❌ Erro no processamento do bot:', error)
      return this.getErrorMessage()
    }
  }

  detectIntent(messageText) {
    // Verificar comandos diretos
    for (const [keyword, intent] of Object.entries(this.commands)) {
      if (messageText.includes(keyword)) {
        return intent
      }
    }

    // Verificar padrões específicos
    if (messageText.match(/ordem|os|número|numero|\d+/)) {
      return 'checkStatus'
    }

    if (messageText.match(/quanto|valor|preço|preco|custo/)) {
      return 'requestQuote'
    }

    if (messageText.match(/onde|local|endereço|endereco|fica/)) {
      return 'location'
    }

    if (messageText.match(/horário|horario|funciona|abre|fecha/)) {
      return 'businessHours'
    }

    return 'unknown'
  }

  async handleGreeting(cliente, isBusinessHours) {
    const nomeCliente = cliente ? cliente.nome.split(' ')[0] : 'cliente'
    const horaAtual = new Date().getHours()

    let saudacao = '👋'
    if (horaAtual < 12) saudacao = 'Bom dia'
    else if (horaAtual < 18) saudacao = 'Boa tarde'
    else saudacao = 'Boa noite'

    if (!isBusinessHours) {
      return `${saudacao}${
        cliente ? `, ${nomeCliente}` : ''
      }! 🌙\n\n🔧 *Saymon Cell* - Assistência Técnica\n\n⏰ No momento estamos *fora do horário comercial*.\n\nNosso atendimento é:\n📅 Segunda a Sábado\n🕗 8h às 18h\n\nEm breve retornaremos seu contato! 😊\n\nPara emergências, digite *URGENTE*`
    }

    let ordensAbertas = ''
    if (cliente) {
      const ordens = await this.getClienteOrdens(cliente.id)
      if (ordens.length > 0) {
        ordensAbertas = `\n\n📋 Você tem *${ordens.length} ordem(s)* em andamento.\nDigite *STATUS* para consultar.`
      }
    }

    return `${saudacao}${
      cliente ? `, ${nomeCliente}` : ''
    }! 👋\n\n🔧 *Saymon Cell* - Assistência Técnica\n\nComo posso ajudá-lo hoje?\n\n${this.getQuickMenu()}${ordensAbertas}`
  }

  getMenu() {
    return `📱 *Menu de Atendimento*\n\n*Opções disponíveis:*\n\n1️⃣ Consultar *STATUS* da ordem\n2️⃣ Solicitar *ORÇAMENTO*\n3️⃣ Ver nossa *LOCALIZAÇÃO*\n4️⃣ Horário de *FUNCIONAMENTO*\n5️⃣ Falar com *ATENDIMENTO*\n\n💡 *Dica:* Digite a palavra destacada para acesso rápido!\n\nEx: Digite "status" para consultar sua ordem`
  }

  getQuickMenu() {
    return `*Menu Rápido:*\n• STATUS - Consultar ordem\n• ORÇAMENTO - Solicitar orçamento\n• LOCALIZAÇÃO - Nosso endereço\n• MENU - Ver todas opções`
  }

  async handleStatusCheck(cliente, messageText) {
    if (!cliente) {
      return `Para consultar o status, preciso que você seja um cliente cadastrado.\n\n📞 Entre em contato conosco:\n*${this.getContactInfo()}*\n\nOu digite *ATENDIMENTO* para falar conosco.`
    }

    // Verificar se mencionou número da ordem
    const ordemMatch = messageText.match(/\d+/)

    if (ordemMatch) {
      const ordemId = parseInt(ordemMatch[0])
      return await this.getOrdemStatus(cliente.id, ordemId)
    }

    // Listar todas as ordens do cliente
    const ordens = await this.getClienteOrdens(cliente.id)

    if (ordens.length === 0) {
      return `${
        cliente.nome.split(' ')[0]
      }, você não possui ordens de serviço em nosso sistema no momento. 🤔\n\nGostaria de solicitar um orçamento? Digite *ORÇAMENTO*`
    }

    let response = `📋 *Suas Ordens de Serviço:*\n\n`

    ordens.forEach((ordem, index) => {
      const statusIcon = this.getStatusIcon(ordem.status)
      const statusText = this.getStatusText(ordem.status)

      response += `${index + 1}. 📱 *${ordem.equipamento}*\n`
      response += `   ${statusIcon} ${statusText}\n`
      response += `   📅 Entrada: ${this.formatDate(ordem.data_entrada)}\n`

      if (ordem.valor_final > 0) {
        response += `   💰 Valor: R$ ${ordem.valor_final.toFixed(2)}\n`
      }

      response += `\n`
    })

    response += `💡 *Dica:* Digite "STATUS ${ordens[0].id}" para detalhes específicos`

    return response
  }

  async handleQuoteRequest(cliente) {
    const nomeCliente = cliente ? cliente.nome.split(' ')[0] : 'cliente'

    return `💰 *Orçamento Gratuito*\n\nOlá${
      cliente ? ` ${nomeCliente}` : ''
    }! Para fazer um orçamento preciso, preciso de algumas informações:\n\n📱 *Qual o problema do seu aparelho?*\n• Tela quebrada\n• Não liga\n• Problema na bateria\n• Não carrega\n• Outro problema\n\n📝 *Descreva o defeito:*\nConte-me em detalhes o que está acontecendo.\n\n📸 *Foto (opcional):*\nSe possível, envie uma foto do aparelho.\n\n👤 *Atendimento Personalizado:*\nDigite *ATENDIMENTO* para falar diretamente com nosso técnico.`
  }

  getLocationInfo() {
    return `📍 *Nossa Localização*\n\n🔧 *Saymon Cell*\nAssistência Técnica de Celulares\n\n📧 Endereço:\n[Seu endereço completo aqui]\n\n🚗 Como chegar:\n[Pontos de referência]\n\n🅿️ Estacionamento disponível\n\n📱 WhatsApp: ${this.getContactInfo()}\n\n🗺️ Para ver no mapa, clique no link:\n[Link do Google Maps]`
  }

  getBusinessHoursInfo() {
    return `⏰ *Horário de Funcionamento*\n\n📅 *Segunda a Sábado*\n🕗 8h00 às 18h00\n\n🚫 *Domingo*\nFechado\n\n📱 *Atendimento WhatsApp:*\nMesmo horário da loja\n\n🆘 *Emergências:*\nApenas casos urgentes\n(Digite URGENTE)\n\n💡 Fora do horário, suas mensagens serão respondidas no próximo dia útil!`
  }

  getContactInfo() {
    return `📞 *Entre em Contato*\n\n📱 WhatsApp: (37) 9 9999-9999\n☎️ Fixo: (37) 3333-3333\n📧 Email: contato@saymon-cell.com\n\n🔧 *Saymon Cell*\nAssistência Técnica Especializada\n\n⚡ Resposta rápida pelo WhatsApp!`
  }

  async handleHumanSupport(cliente, isBusinessHours) {
    if (!isBusinessHours) {
      return `🌙 *Atendimento Humano*\n\nNo momento estamos fora do horário comercial.\n\n⏰ *Nosso horário:*\n📅 Segunda a Sábado\n🕗 8h às 18h\n\n📝 Deixe sua mensagem que retornaremos em breve!\n\nPara *emergências*, digite URGENTE`
    }

    // Marcar para atendimento humano
    await this.flagForHumanSupport(cliente)

    return `👤 *Conectando ao Atendimento*\n\nOlá${
      cliente ? ` ${cliente.nome.split(' ')[0]}` : ''
    }!\n\nEm instantes um de nossos atendentes entrará em contato.\n\n⏱️ Tempo médio de resposta: 2-5 minutos\n\n🔧 *Saymon Cell* - Atendimento Especializado`
  }

  async handleUnknownMessage(cliente, messageText, isBusinessHours) {
    if (!isBusinessHours) {
      return `🌙 Recebemos sua mensagem!\n\nRetornaremos no próximo horário comercial:\n📅 Segunda a Sábado, 8h às 18h\n\nPara o *menu*, digite MENU\nPara *emergências*, digite URGENTE`
    }

    // Tentar interpretar com IA básica
    if (messageText.length > 50) {
      // Mensagem longa - provável descrição de problema
      await this.flagForHumanSupport(cliente)
      return `📝 *Mensagem Recebida!*\n\nEntendi que você está descrevendo um problema detalhado.\n\nUm técnico especializado analisará sua mensagem e retornará em breve!\n\n⏱️ Tempo médio: 5-10 minutos\n\nEnquanto isso, digite *MENU* para ver outras opções.`
    }

    return `🤔 Não entendi sua solicitação.\n\n${this.getQuickMenu()}\n\nOu digite *ATENDIMENTO* para falar com nossa equipe.`
  }

  // Métodos auxiliares
  async getClienteByPhone(phoneNumber) {
    try {
      return await db.get('SELECT * FROM clientes WHERE telefone LIKE ?', [
        `%${phoneNumber}%`,
      ])
    } catch (error) {
      LoggerManager.error('❌ Erro ao buscar cliente:', error)
      return null
    }
  }

  async getClienteOrdens(clienteId) {
    try {
      return await db.all(
        `
        SELECT id, equipamento, defeito_relatado as defeito, status, data_entrada, 
               valor_orcamento, valor_final, data_prazo
        FROM ordens 
        WHERE cliente_id = ? AND status != 'entregue'
        ORDER BY data_entrada DESC
        LIMIT 10
      `,
        [clienteId]
      )
    } catch (error) {
      LoggerManager.error('❌ Erro ao buscar ordens:', error)
      return []
    }
  }

  async getOrdemStatus(clienteId, ordemId) {
    try {
      const ordem = await db.get(
        `
        SELECT o.*, c.nome as cliente_nome
        FROM ordens o
        JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = ? AND o.cliente_id = ?
      `,
        [ordemId, clienteId]
      )

      if (!ordem) {
        return `❌ Ordem #${ordemId} não encontrada ou não pertence a você.`
      }

      const statusIcon = this.getStatusIcon(ordem.status)
      const statusText = this.getStatusText(ordem.status)

      let response = `📋 *Ordem de Serviço #${ordem.id}*\n\n`
      response += `📱 *Equipamento:* ${ordem.equipamento}\n`
      response += `🔧 *Defeito:* ${ordem.defeito}\n`
      response += `${statusIcon} *Status:* ${statusText}\n`
      response += `📅 *Entrada:* ${this.formatDate(ordem.data_entrada)}\n`

      if (ordem.data_prazo) {
        response += `⏰ *Prazo:* ${this.formatDate(ordem.data_prazo)}\n`
      }

      if (ordem.valor_orcamento > 0) {
        response += `💰 *Orçamento:* R$ ${ordem.valor_orcamento.toFixed(2)}\n`
      }

      if (
        ordem.valor_final > 0 &&
        ordem.valor_final !== ordem.valor_orcamento
      ) {
        response += `💵 *Valor Final:* R$ ${ordem.valor_final.toFixed(2)}\n`
      }

      if (ordem.diagnostico) {
        response += `🔍 *Diagnóstico:* ${ordem.diagnostico}\n`
      }

      if (ordem.observacoes) {
        response += `📝 *Observações:* ${ordem.observacoes}\n`
      }

      // Adicionar próximos passos baseado no status
      response += this.getNextStepsForStatus(ordem.status)

      return response
    } catch (error) {
      LoggerManager.error('❌ Erro ao buscar status da ordem:', error)
      return this.getErrorMessage()
    }
  }

  getStatusIcon(status) {
    const icons = {
      recebido: '📥',
      em_analise: '🔍',
      aguardando_pecas: '⏳',
      em_reparo: '🔧',
      pronto: '✅',
      entregue: '📦',
      cancelado: '❌',
    }
    return icons[status] || '📋'
  }

  getStatusText(status) {
    const texts = {
      recebido: 'Recebido',
      em_analise: 'Em Análise',
      aguardando_pecas: 'Aguardando Peças',
      em_reparo: 'Em Reparo',
      pronto: 'Pronto para Retirada',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    }
    return texts[status] || 'Status Desconhecido'
  }

  getNextStepsForStatus(status) {
    const steps = {
      recebido:
        '\n\n⏳ *Próximo passo:* Análise técnica\n🕐 Tempo estimado: 1-2 dias úteis',
      em_analise:
        '\n\n🔍 *Próximo passo:* Diagnóstico completo\n🕐 Tempo estimado: 1 dia útil',
      aguardando_pecas:
        '\n\n📦 *Próximo passo:* Chegada das peças\n🕐 Tempo estimado: 3-7 dias úteis',
      em_reparo:
        '\n\n🔧 *Próximo passo:* Finalização do reparo\n🕐 Tempo estimado: 1-2 dias úteis',
      pronto:
        '\n\n🎉 *Seu aparelho está pronto!*\n📍 Pode retirar em nossa loja\n⏰ Horário: 8h às 18h',
      entregue: '\n\n✅ *Serviço concluído!*\n🛡️ Garantia: 90 dias',
      cancelado: '\n\n❌ *Ordem cancelada*\nPara dúvidas, entre em contato.',
    }
    return steps[status] || ''
  }

  isBusinessHours() {
    const now = new Date()
    const day = now.getDay() // 0 = domingo, 1 = segunda, ...
    const hour = now.getHours()

    return (
      this.businessHours.days.includes(day) &&
      hour >= this.businessHours.start &&
      hour < this.businessHours.end
    )
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  async flagForHumanSupport(cliente) {
    try {
      await db.run(
        `
        INSERT INTO whatsapp_human_queue (
          cliente_id, phone_number, status, created_at
        ) VALUES (?, ?, 'waiting', CURRENT_TIMESTAMP)
      `,
        [cliente?.id, cliente?.telefone]
      )
    } catch (error) {
      LoggerManager.error('❌ Erro ao marcar para atendimento humano:', error)
    }
  }

  async logInteraction(
    phoneNumber,
    clienteId,
    messageReceived,
    messageResponse,
    intent
  ) {
    try {
      await db.run(
        `
        INSERT INTO whatsapp_interactions (
          cliente_id, phone_number, message_received, message_response, 
          intent, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
        [clienteId, phoneNumber, messageReceived, messageResponse, intent]
      )
    } catch (error) {
      LoggerManager.error('❌ Erro ao registrar interação:', error)
    }
  }

  getErrorMessage() {
    return `😅 Ops! Algo deu errado por aqui.\n\nTente novamente ou digite *ATENDIMENTO* para falar com nossa equipe.\n\n🔧 *Saymon Cell* - Sempre prontos para ajudar!`
  }
}

module.exports = WhatsAppBot
