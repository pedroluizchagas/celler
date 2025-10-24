import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Card,
  CardContent,
  Stack,
  Autocomplete,
  InputAdornment,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  Image as ImageIcon,
  Print as PrintIcon,
  Label as LabelIcon,
} from '@mui/icons-material'
import { clienteService } from '../../services/clienteService'

const statusOptions = [
  { value: 'recebido', label: 'Recebido', color: 'info' },
  { value: 'em_analise', label: 'Em Análise', color: 'warning' },
  { value: 'aguardando_pecas', label: 'Aguardando Peças', color: 'secondary' },
  { value: 'em_reparo', label: 'Em Reparo', color: 'primary' },
  { value: 'pronto', label: 'Pronto', color: 'success' },
  { value: 'entregue', label: 'Entregue', color: 'default' },
  { value: 'cancelado', label: 'Cancelado', color: 'error' },
]

const prioridadeOptions = [
  { value: 'baixa', label: 'Baixa', color: 'success' },
  { value: 'normal', label: 'Normal', color: 'info' },
  { value: 'alta', label: 'Alta', color: 'warning' },
  { value: 'urgente', label: 'Urgente', color: 'error' },
]

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ordem-tabpanel-${index}`}
      aria-labelledby={`ordem-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

function OrdemModal({ open, onClose, ordem = null, onSave, onPrint, onPrintLabel }) {
  const [tabAtiva, setTabAtiva] = useState(0)
  const [formData, setFormData] = useState({
    cliente_id: '',
    equipamento: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    defeito: '',
    descricao: '',
    diagnostico: '',
    solucao: '',
    status: 'recebido',
    prioridade: 'normal',
    valor_orcamento: '',
    valor_mao_obra: '',
    valor_pecas: '',
    valor_final: '',
    desconto: '',
    data_prazo: '',
    tecnico_responsavel: '',
    observacoes: '',
    observacoes_internas: '',
    garantia_dias: 90,
  })

  const [clientes, setClientes] = useState([])
  const [fotos, setFotos] = useState([])
  const [pecas, setPecas] = useState([])
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (open) {
      carregarClientes()
      resetarFormulario()
    }
  }, [open, ordem])

  const resetarFormulario = () => {
    if (ordem) {
      setFormData({
        cliente_id: ordem.cliente_id || '',
        equipamento: ordem.equipamento || '',
        marca: ordem.marca || '',
        modelo: ordem.modelo || '',
        numero_serie: ordem.numero_serie || '',
        defeito: ordem.defeito || '',
        descricao: ordem.descricao || '',
        diagnostico: ordem.diagnostico || '',
        solucao: ordem.solucao || '',
        status: ordem.status || 'recebido',
        prioridade: ordem.prioridade || 'normal',
        valor_orcamento: ordem.valor_orcamento || '',
        valor_mao_obra: ordem.valor_mao_obra || '',
        valor_pecas: ordem.valor_pecas || '',
        valor_final: ordem.valor_final || '',
        desconto: ordem.desconto || '',
        data_prazo: ordem.data_prazo ? ordem.data_prazo.split('T')[0] : '',
        tecnico_responsavel: ordem.tecnico_responsavel || '',
        observacoes: ordem.observacoes || '',
        observacoes_internas: ordem.observacoes_internas || '',
        garantia_dias: ordem.garantia_dias || 90,
      })
      setPecas(ordem.pecas || [])
      setServicos(ordem.servicos || [])
    } else {
      setFormData({
        cliente_id: '',
        equipamento: '',
        marca: '',
        modelo: '',
        numero_serie: '',
        defeito: '',
        descricao: '',
        diagnostico: '',
        solucao: '',
        status: 'recebido',
        prioridade: 'normal',
        valor_orcamento: '',
        valor_mao_obra: '',
        valor_pecas: '',
        valor_final: '',
        desconto: '',
        data_prazo: '',
        tecnico_responsavel: '',
        observacoes: '',
        observacoes_internas: '',
        garantia_dias: 90,
      })
      setPecas([])
      setServicos([])
    }
    setFotos([])
    setError('')
    setTabAtiva(0)
  }

  const carregarClientes = async () => {
    try {
      console.log('🔄 Carregando lista de clientes...')
      const response = await clienteService.listar()
      const clientesData = response.data || response || []
      
      console.log('✅ Clientes carregados:', clientesData.length)
      setClientes(clientesData)

      // Se estamos editando uma ordem e o cliente não está na lista, tentar buscá-lo
      if (ordem && ordem.cliente_id && clientesData.length > 0) {
        const clienteExiste = clientesData.find(c => c.id === ordem.cliente_id)
        if (!clienteExiste) {
          console.log('⚠️ Cliente da ordem não encontrado na lista, tentando buscar:', ordem.cliente_id)
          try {
            const clienteResponse = await clienteService.buscarPorId(ordem.cliente_id)
            if (clienteResponse.data || clienteResponse) {
              const clienteData = clienteResponse.data || clienteResponse
              console.log('✅ Cliente da ordem encontrado:', clienteData.nome)
              setClientes(prev => [...prev, clienteData])
            }
          } catch (clienteError) {
            console.warn('❌ Cliente da ordem não pôde ser carregado:', clienteError.message)
            // Limpar o cliente_id se não conseguir carregar
            setFormData(prev => ({ ...prev, cliente_id: '' }))
          }
        }
      }
    } catch (err) {
      console.error('❌ Erro ao carregar clientes:', err)
      setError('Erro ao carregar clientes: ' + err.message)
    }
  }

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
    setError('')
  }

  // Gerenciar peças
  const adicionarPeca = () => {
    setPecas((prev) => [
      ...prev,
      {
        nome_peca: '',
        codigo_peca: '',
        quantidade: 1,
        valor_unitario: '',
        fornecedor: '',
        observacoes: '',
      },
    ])
  }

  const removerPeca = (index) => {
    setPecas((prev) => prev.filter((_, i) => i !== index))
  }

  const updatePeca = (index, field, value) => {
    setPecas((prev) =>
      prev.map((peca, i) => (i === index ? { ...peca, [field]: value } : peca))
    )
  }

  // Gerenciar serviços
  const adicionarServico = () => {
    setServicos((prev) => [
      ...prev,
      {
        descricao_servico: '',
        tempo_gasto: '',
        valor_servico: '',
        tecnico: '',
        observacoes: '',
      },
    ])
  }

  const removerServico = (index) => {
    setServicos((prev) => prev.filter((_, i) => i !== index))
  }

  const updateServico = (index, field, value) => {
    setServicos((prev) =>
      prev.map((servico, i) =>
        i === index ? { ...servico, [field]: value } : servico
      )
    )
  }

  // Upload de fotos
  const handleFotosChange = (event) => {
    const files = Array.from(event.target.files)

    if (fotos.length + files.length > 5) {
      setError('Máximo de 5 fotos permitidas')
      return
    }

    const fotosGrandes = files.filter((file) => file.size > 5 * 1024 * 1024)
    if (fotosGrandes.length > 0) {
      setError('Cada foto deve ter no máximo 5MB')
      return
    }

    setFotos((prev) => [...prev, ...files])
  }

  const removerFoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Calcular valores automaticamente
  const calcularValorTotal = () => {
    const valorPecas = pecas.reduce((total, peca) => {
      const valor =
        parseFloat(peca.valor_unitario || 0) * parseInt(peca.quantidade || 0)
      return total + valor
    }, 0)

    const valorServicos = servicos.reduce((total, servico) => {
      return total + parseFloat(servico.valor_servico || 0)
    }, 0)

    const valorMaoObra = parseFloat(formData.valor_mao_obra || 0)
    const desconto = parseFloat(formData.desconto || 0)

    const total = valorPecas + valorServicos + valorMaoObra - desconto

    setFormData((prev) => ({
      ...prev,
      valor_pecas: valorPecas.toFixed(2),
      valor_final: total.toFixed(2),
    }))
  }

  useEffect(() => {
    calcularValorTotal()
  }, [pecas, servicos, formData.valor_mao_obra, formData.desconto])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validações básicas
      if (!formData.cliente_id) {
        throw new Error('Cliente é obrigatório')
      }
      if (!formData.equipamento.trim()) {
        throw new Error('Equipamento é obrigatório')
      }
      if (!formData.defeito.trim()) {
        throw new Error('Descrição do defeito é obrigatória')
      }

      // Preparar dados para envio
      const dadosCompletos = {
        ...formData,
        pecas: pecas.filter((peca) => peca.nome_peca?.trim()), // Filtrar peças vazias
        servicos: servicos.filter((servico) =>
          servico.descricao_servico?.trim()
        ), // Filtrar serviços vazios
      }

      await onSave(dadosCompletos, fotos)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openPrintWindow = (html) => {
    const w = window.open('', 'print', 'width=900,height=700')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    // Aguarda render antes de imprimir
    w.onload = () => {
      try { w.focus(); } catch {}
      w.print()
    }
  }

  const handlePrint = () => {
    if (!ordem || !ordem.id) {
      setError('Salve a ordem antes de imprimir o comprovante.')
      return
    }
    const formatDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')
    const formatMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))
    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Comprovante OS #${ordem.id}</title>
          <style>
            body{font-family: Arial, sans-serif; color:#222; padding:24px}
            h1{margin:0 0 4px 0}
            h2{margin:16px 0 8px 0; font-size:16px}
            .muted{color:#666; font-size:12px}
            .box{border:1px solid #ddd; border-radius:8px; padding:16px; margin:12px 0}
            .row{display:flex; gap:16px}
            .col{flex:1}
            .tag{display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid #ccc; font-size:12px}
            .grid{display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px}
            .label{color:#666; font-size:12px}
            .value{font-weight:600}
            @media print { .no-print{ display:none } }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:right; margin-bottom:8px">
            <button onclick="window.print()">Imprimir</button>
          </div>
          <h1>SAYMON CELL</h1>
          <div class="muted">Assistência Técnica Especializada</div>
          <div class="box">
            <div class="row" style="align-items:center; justify-content:space-between">
              <div>
                <h2>Ordem de Serviço #${ordem.id}</h2>
                <div class="muted">Emitido em ${formatDate(new Date())}</div>
              </div>
              <div class="tag">Status: ${ordem.status}</div>
            </div>
            <div class="grid" style="margin-top:8px">
              <div><div class="label">Cliente</div><div class="value">${ordem.cliente_nome || '-'}</div></div>
              <div><div class="label">Telefone</div><div class="value">${ordem.cliente_telefone || '-'}</div></div>
              <div><div class="label">Entrada</div><div class="value">${formatDate(ordem.data_entrada)}</div></div>
              <div><div class="label">Técnico</div><div class="value">${ordem.tecnico_responsavel || '-'}</div></div>
              <div><div class="label">Equipamento</div><div class="value">${ordem.equipamento || '-'}</div></div>
              <div><div class="label">Marca/Modelo</div><div class="value">${[ordem.marca, ordem.modelo].filter(Boolean).join(' ') || '-'}</div></div>
              <div><div class="label">Nº Série</div><div class="value">${ordem.numero_serie || '-'}</div></div>
              <div><div class="label">Prioridade</div><div class="value">${ordem.prioridade || 'normal'}</div></div>
            </div>
            <div style="margin-top:12px">
              <div class="label">Defeito/Problema</div>
              <div>${ordem.defeito || '-'}</div>
            </div>
            ${ordem.diagnostico ? `<div style="margin-top:8px"><div class="label">Diagnóstico</div><div>${ordem.diagnostico}</div></div>` : ''}
            ${ordem.solucao ? `<div style="margin-top:8px"><div class="label">Solução</div><div>${ordem.solucao}</div></div>` : ''}
            <div class="row" style="margin-top:12px">
              <div class="col"><div class="label">Valor Orçamento</div><div class="value">${formatMoney(ordem.valor_orcamento)}</div></div>
              <div class="col"><div class="label">Valor Final</div><div class="value">${formatMoney(ordem.valor_final)}</div></div>
            </div>
          </div>
          <div class="muted">Assinatura do cliente: ______________________________________</div>
        </body>
      </html>
    `
    openPrintWindow(html)
  }

  const handlePrintLabel = () => {
    if (!ordem || !ordem.id) {
      setError('Salve a ordem antes de imprimir a etiqueta.')
      return
    }
    const formatDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')
    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Etiqueta OS #${ordem.id}</title>
          <style>
            body{font-family: Arial, sans-serif; color:#222; padding:16px}
            .label{width: 90mm; border: 2px solid #1976d2; border-radius: 8px; padding: 12px}
            .row{display:flex; justify-content:space-between; align-items:center}
            .big{font-size:20px; font-weight:700; color:#1976d2}
            .muted{color:#666; font-size:12px}
            .kv{margin-top:8px}
            .k{font-size:11px; color:#666}
            .v{font-size:13px; font-weight:600}
            @media print { .no-print{ display:none } }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:right; margin-bottom:8px">
            <button onclick="window.print()">Imprimir</button>
          </div>
          <div class="label">
            <div class="row">
              <div>
                <div class="big">SAYMON CELL</div>
                <div class="muted">Assistência Técnica</div>
              </div>
              <div class="big">#${ordem.id}</div>
            </div>
            <div class="kv">
              <div class="k">CLIENTE</div>
              <div class="v">${ordem.cliente_nome || '-'}</div>
            </div>
            <div class="kv">
              <div class="k">EQUIPAMENTO</div>
              <div class="v">${ordem.equipamento || '-'}</div>
            </div>
            ${ordem.marca || ordem.modelo ? `<div class="kv"><div class="k">MARCA/MODELO</div><div class="v">${[ordem.marca, ordem.modelo].filter(Boolean).join(' ')}</div></div>` : ''}
            ${ordem.numero_serie ? `<div class="kv"><div class="k">Nº SÉRIE</div><div class="v">${ordem.numero_serie}</div></div>` : ''}
            <div class="kv">
              <div class="k">ENTRADA</div>
              <div class="v">${formatDate(ordem.data_entrada)}</div>
            </div>
          </div>
        </body>
      </html>
    `
    openPrintWindow(html)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {ordem
              ? `Ordem #${ordem.id} - ${ordem.equipamento}`
              : 'Nova Ordem de Serviço'}
          </Typography>

          {ordem && (
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                variant="outlined"
              >
                Imprimir
              </Button>
              <Button
                size="small"
                startIcon={<LabelIcon />}
                onClick={handlePrintLabel}
                variant="outlined"
              >
                Etiqueta
              </Button>
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={tabAtiva}
          onChange={(e, newValue) => setTabAtiva(newValue)}
        >
          <Tab icon={<AssignmentIcon />} label="Dados Gerais" />
          <Tab icon={<BuildIcon />} label="Diagnóstico" />
          <Tab icon={<MoneyIcon />} label="Peças & Valores" />
          <Tab icon={<ImageIcon />} label="Fotos" />
          {ordem && <Tab icon={<HistoryIcon />} label="Histórico" />}
        </Tabs>

        <form onSubmit={handleSubmit}>
          {/* Aba 1: Dados Gerais */}
          <TabPanel value={tabAtiva} index={0}>
            <Grid container spacing={2}>
              {/* Cliente */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Cliente *</InputLabel>
                  <Select
                    value={formData.cliente_id}
                    onChange={handleChange('cliente_id')}
                    disabled={loading}
                    label="Cliente *"
                  >
                    {clientes.map((cliente) => (
                      <MenuItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.telefone}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Status e Prioridade */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={handleChange('status')}
                    disabled={loading}
                    label="Status"
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip
                          label={option.label}
                          color={option.color}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={formData.prioridade}
                    onChange={handleChange('prioridade')}
                    disabled={loading}
                    label="Prioridade"
                  >
                    {prioridadeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip
                          label={option.label}
                          color={option.color}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Equipamento */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Equipamento *"
                  value={formData.equipamento}
                  onChange={handleChange('equipamento')}
                  disabled={loading}
                  placeholder="Ex: iPhone 12, Samsung Galaxy..."
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Marca"
                  value={formData.marca}
                  onChange={handleChange('marca')}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Modelo"
                  value={formData.modelo}
                  onChange={handleChange('modelo')}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Número de Série"
                  value={formData.numero_serie}
                  onChange={handleChange('numero_serie')}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Data Prazo"
                  type="date"
                  value={formData.data_prazo}
                  onChange={handleChange('data_prazo')}
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Garantia (dias)"
                  type="number"
                  value={formData.garantia_dias}
                  onChange={handleChange('garantia_dias')}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Técnico Responsável"
                  value={formData.tecnico_responsavel}
                  onChange={handleChange('tecnico_responsavel')}
                  disabled={loading}
                />
              </Grid>

              {/* Defeito */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição do Defeito *"
                  multiline
                  rows={3}
                  value={formData.defeito}
                  onChange={handleChange('defeito')}
                  disabled={loading}
                  placeholder="Descreva o problema relatado pelo cliente..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações do Cliente"
                  multiline
                  rows={2}
                  value={formData.observacoes}
                  onChange={handleChange('observacoes')}
                  disabled={loading}
                  placeholder="Observações adicionais..."
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Aba 2: Diagnóstico */}
          <TabPanel value={tabAtiva} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Diagnóstico Técnico"
                  multiline
                  rows={4}
                  value={formData.diagnostico}
                  onChange={handleChange('diagnostico')}
                  disabled={loading}
                  placeholder="Diagnóstico detalhado do problema..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Solução Aplicada"
                  multiline
                  rows={4}
                  value={formData.solucao}
                  onChange={handleChange('solucao')}
                  disabled={loading}
                  placeholder="Descreva a solução implementada..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações Internas"
                  multiline
                  rows={3}
                  value={formData.observacoes_internas}
                  onChange={handleChange('observacoes_internas')}
                  disabled={loading}
                  placeholder="Observações para uso interno da equipe..."
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Aba 3: Peças & Valores */}
          <TabPanel value={tabAtiva} index={2}>
            <Grid container spacing={2}>
              {/* Seção de Peças */}
              <Grid item xs={12}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Peças Utilizadas</Typography>
                  <Button startIcon={<AddIcon />} onClick={adicionarPeca}>
                    Adicionar Peça
                  </Button>
                </Box>

                {pecas.map((peca, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Nome da Peça"
                            value={peca.nome_peca}
                            onChange={(e) =>
                              updatePeca(index, 'nome_peca', e.target.value)
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            fullWidth
                            label="Código"
                            value={peca.codigo_peca}
                            onChange={(e) =>
                              updatePeca(index, 'codigo_peca', e.target.value)
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            fullWidth
                            label="Qtd"
                            type="number"
                            value={peca.quantidade}
                            onChange={(e) =>
                              updatePeca(index, 'quantidade', e.target.value)
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            fullWidth
                            label="Valor Unit."
                            type="number"
                            value={peca.valor_unitario}
                            onChange={(e) =>
                              updatePeca(
                                index,
                                'valor_unitario',
                                e.target.value
                              )
                            }
                            size="small"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  R$
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={1}>
                          <Typography variant="body2">
                            R${' '}
                            {(
                              parseFloat(peca.valor_unitario || 0) *
                              parseInt(peca.quantidade || 0)
                            ).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={1}>
                          <IconButton
                            onClick={() => removerPeca(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Valores */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Orçamento"
                  type="number"
                  value={formData.valor_orcamento}
                  onChange={handleChange('valor_orcamento')}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Mão de Obra"
                  type="number"
                  value={formData.valor_mao_obra}
                  onChange={handleChange('valor_mao_obra')}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Peças"
                  type="number"
                  value={formData.valor_pecas}
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Desconto"
                  type="number"
                  value={formData.desconto}
                  onChange={handleChange('desconto')}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6" align="center">
                      Valor Total: R$ {formData.valor_final || '0.00'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Aba 4: Fotos */}
          <TabPanel value={tabAtiva} index={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box mb={2}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="upload-fotos"
                    multiple
                    type="file"
                    onChange={handleFotosChange}
                  />
                  <label htmlFor="upload-fotos">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{ py: 2 }}
                    >
                      Adicionar Fotos (máx. 5)
                    </Button>
                  </label>
                </Box>

                <Grid container spacing={2}>
                  {fotos.map((foto, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Card>
                        <Box position="relative">
                          <img
                            src={URL.createObjectURL(foto)}
                            alt={`Foto ${index + 1}`}
                            style={{
                              width: '100%',
                              height: 150,
                              objectFit: 'cover',
                            }}
                          />
                          <IconButton
                            onClick={() => removerFoto(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <CardContent>
                          <Typography variant="caption">{foto.name}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Aba 5: Histórico (apenas para ordens existentes) */}
          {ordem && (
            <TabPanel value={tabAtiva} index={4}>
              <Typography variant="h6" gutterBottom>
                Histórico da Ordem
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Funcionalidade em desenvolvimento...
              </Typography>
            </TabPanel>
          )}
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Salvando...' : ordem ? 'Atualizar' : 'Criar Ordem'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default OrdemModal
