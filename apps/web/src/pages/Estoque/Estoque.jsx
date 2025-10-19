import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Badge,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  QrCodeScanner as QrCodeScannerIcon,
} from '@mui/icons-material'
import { produtoService } from '../../services/produtoService'
import ProdutosList from '../../components/Estoque/ProdutosList'
import ProdutoModal from '../../components/Estoque/ProdutoModal'
import CategoriasList from '../../components/Estoque/CategoriasList'
import MovimentacaoModal from '../../components/Estoque/MovimentacaoModal'
import AlertasEstoque from '../../components/Estoque/AlertasEstoque'
import QRCodeScanner from '../../components/Estoque/QRCodeScanner'

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`estoque-tabpanel-${index}`}
    aria-labelledby={`estoque-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
)

const Estoque = () => {
  // Estados principais
  const [tabAtiva, setTabAtiva] = useState(0)
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [alertas, setAlertas] = useState([])
  const [estatisticas, setEstatisticas] = useState(null)
  const [loading, setLoading] = useState(true)

  // Estados dos modais
  const [produtoModal, setProdutoModal] = useState({
    aberto: false,
    produto: null,
    modo: 'criar',
  })
  const [movimentacaoModal, setMovimentacaoModal] = useState({
    aberto: false,
    produto: null,
  })

  // Estados de feedback
  const [snackbar, setSnackbar] = useState({
    aberto: false,
    mensagem: '',
    tipo: 'success',
  })

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Carregar dados em paralelo
      const [produtosRes, categoriasRes, alertasRes, estatisticasRes] =
        await Promise.all([
          produtoService.listar(),
          produtoService.listarCategorias(),
          produtoService.listarAlertas(),
          produtoService.buscarEstatisticas(),
        ])

      setProdutos(produtosRes)
      setCategorias(categoriasRes)
      setAlertas(alertasRes)
      setEstatisticas(estatisticasRes)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      mostrarSnackbar('Erro ao carregar dados do estoque', 'error')
    } finally {
      setLoading(false)
    }
  }

  const mostrarSnackbar = (mensagem, tipo = 'success') => {
    setSnackbar({ aberto: true, mensagem, tipo })
  }

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, aberto: false })
  }

  // Handlers dos produtos
  const handleNovoProduto = () => {
    setProdutoModal({ aberto: true, produto: null, modo: 'criar' })
  }

  const handleEditarProduto = (produto) => {
    setProdutoModal({ aberto: true, produto, modo: 'editar' })
  }

  const handleVisualizarProduto = (produto) => {
    setProdutoModal({ aberto: true, produto, modo: 'visualizar' })
  }

  const handleSalvarProduto = async (dadosProduto) => {
    try {
      if (produtoModal.modo === 'criar') {
        await produtoService.criar(dadosProduto)
        mostrarSnackbar('Produto cadastrado com sucesso!')
      } else if (produtoModal.modo === 'editar') {
        await produtoService.atualizar(produtoModal.produto.id, dadosProduto)
        mostrarSnackbar('Produto atualizado com sucesso!')
      }

      setProdutoModal({ aberto: false, produto: null, modo: 'criar' })
      carregarDados() // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar produto:', error)

      const message = error?.message || 'Erro ao salvar produto'
      const detailsList = Array.isArray(error?.details)
        ? error.details.map((detail) => {
            const field = Array.isArray(detail.path) ? detail.path.join('.') : detail.path
            return field ? `${field}: ${detail.message}` : detail.message
          })
        : []
      const composed = detailsList.length
        ? `${message} (${detailsList.join(', ')})`
        : message

      mostrarSnackbar(`Erro ao salvar produto: ${composed}`, 'error')
      throw error
    }
  }

  // Handlers de movimentação
  const handleMovimentarEstoque = (produto) => {
    setMovimentacaoModal({ aberto: true, produto })
  }

  const handleSalvarMovimentacao = async (dadosMovimentacao) => {
    try {
      await produtoService.movimentarEstoque(
        movimentacaoModal.produto.id,
        dadosMovimentacao
      )
      mostrarSnackbar('Movimentação registrada com sucesso!')

      setMovimentacaoModal({ aberto: false, produto: null })
      carregarDados() // Recarregar dados
    } catch (error) {
      console.error('Erro ao movimentar estoque:', error)
      mostrarSnackbar(
        'Erro ao movimentar estoque: ' + (error.message || 'Erro desconhecido'),
        'error'
      )
    }
  }

  // Calcular contadores para badges (usando estatísticas da API quando disponível)
  const contadores = {
    alertas: alertas.length,
    semEstoque:
      estatisticas?.resumo?.sem_estoque ||
      produtos.filter((p) => p.estoque_atual === 0).length,
    estoqueBaixo:
      estatisticas?.resumo?.estoque_baixo ||
      produtos.filter(
        (p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo
      ).length,
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" gutterBottom>
            Gestão de Estoque
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Controle completo do seu estoque de peças e acessórios
          </Typography>
        </Box>

        {/* Alertas importantes */}
        {contadores.semEstoque > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Atenção!</strong> {contadores.semEstoque} produto(s) sem
            estoque. Verifique a aba "Alertas" para mais detalhes.
          </Alert>
        )}

        {contadores.estoqueBaixo > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Aviso!</strong> {contadores.estoqueBaixo} produto(s) com
            estoque baixo. Considere fazer reposição em breve.
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={tabAtiva}
            onChange={(e, newValue) => setTabAtiva(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<InventoryIcon />}
              label="Produtos"
              id="estoque-tab-0"
              aria-controls="estoque-tabpanel-0"
            />
            <Tab
              icon={<CategoryIcon />}
              label="Categorias"
              id="estoque-tab-1"
              aria-controls="estoque-tabpanel-1"
            />
            <Tab
              icon={
                <Badge badgeContent={contadores.alertas} color="error">
                  <WarningIcon />
                </Badge>
              }
              label="Alertas"
              id="estoque-tab-2"
              aria-controls="estoque-tabpanel-2"
            />
            <Tab
              icon={<QrCodeScannerIcon />}
              label="Scanner"
              id="estoque-tab-3"
              aria-controls="estoque-tabpanel-3"
            />
          </Tabs>
        </Box>

        {/* Conteúdo das Tabs */}
        <TabPanel value={tabAtiva} index={0}>
          {/* Informações sobre funcionalidades integradas */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              💡 <strong>Dicas:</strong> Para realizar vendas, use o{' '}
              <strong>PDV</strong>. Para ver o histórico de movimentações de um
              produto, clique no botão <strong>"Histórico"</strong>
              em cada produto da lista abaixo.
            </Typography>
          </Alert>

          <ProdutosList
            produtos={produtos}
            categorias={categorias}
            estatisticas={estatisticas}
            loading={loading}
            onProdutoClick={handleVisualizarProduto}
            onEditarClick={handleEditarProduto}
            onMovimentarClick={handleMovimentarEstoque}
            onNovoProduto={handleNovoProduto}
          />
        </TabPanel>

        <TabPanel value={tabAtiva} index={1}>
          <CategoriasList />
        </TabPanel>

        <TabPanel value={tabAtiva} index={2}>
          <AlertasEstoque alertas={alertas} />
        </TabPanel>

        <TabPanel value={tabAtiva} index={3}>
          <QRCodeScanner />
        </TabPanel>

        {/* Modais */}
        <ProdutoModal
          open={produtoModal.aberto}
          produto={produtoModal.produto}
          modo={produtoModal.modo}
          onClose={() =>
            setProdutoModal({ aberto: false, produto: null, modo: 'criar' })
          }
          onSave={handleSalvarProduto}
        />

        <MovimentacaoModal
          open={movimentacaoModal.aberto}
          produto={movimentacaoModal.produto}
          onClose={() => setMovimentacaoModal({ aberto: false, produto: null })}
          onSave={handleSalvarMovimentacao}
        />

        {/* Snackbar para feedback */}
        <Snackbar
          open={snackbar.aberto}
          autoHideDuration={6000}
          onClose={fecharSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={fecharSnackbar}
            severity={snackbar.tipo}
            sx={{ width: '100%' }}
          >
            {snackbar.mensagem}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  )
}

export default Estoque
