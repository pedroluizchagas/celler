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

function OrdemModal({ open, onClose, ordem = null, onSave }) {
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
      const response = await clienteService.listar()
      setClientes(response.data || [])
    } catch (err) {
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

    if (fotos.length + files.length > 10) {
      setError('Máximo de 10 fotos permitidas')
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

  const handlePrint = () => {
    // TODO: Implementar impressão
    console.log('Imprimir ordem:', ordem?.id)
  }

  const handlePrintLabel = () => {
    // TODO: Implementar impressão de etiqueta
    console.log('Imprimir etiqueta:', ordem?.id)
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
                      Adicionar Fotos (máx. 10)
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
