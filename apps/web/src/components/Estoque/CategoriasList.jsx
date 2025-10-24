import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Alert,
  Grid,
  TextField,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Category as CategoryIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { produtoService } from '../../services/produtoService'

const CategoriasList = () => {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [nova, setNova] = useState({ nome: '', icone: '', descricao: '' })
  const [editando, setEditando] = useState(null)

  const carregar = async () => {
    try {
      setLoading(true)
      const list = await produtoService.listarCategorias()
      setCategorias(Array.isArray(list) ? list : [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const criar = async () => {
    if (!nova.nome.trim()) return setErro('Nome é obrigatório')
    try {
      await produtoService.criarCategoria({ nome: nova.nome.trim(), icone: nova.icone || null, descricao: nova.descricao || null, ativo: true })
      setNova({ nome: '', icone: '', descricao: '' })
      carregar()
    } catch (e) {
      setErro(e.message || 'Erro ao criar categoria')
    }
  }

  const salvarEdicao = async () => {
    if (!editando?.nome?.trim()) return setErro('Nome é obrigatório')
    try {
      await produtoService.atualizarCategoria(editando.id, { nome: editando.nome.trim(), icone: editando.icone || null, descricao: editando.descricao || null })
      setEditando(null)
      carregar()
    } catch (e) {
      setErro(e.message || 'Erro ao atualizar categoria')
    }
  }

  const desativar = async (id) => {
    try {
      await produtoService.desativarCategoria(id)
      carregar()
    } catch (e) {
      setErro(e.message || 'Erro ao desativar categoria')
    }
  }

  return (
    <Box>
      <Alert severity="info" icon={<CategoryIcon />} sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Gestão de Categorias
        </Typography>
        <Typography variant="body2">
          Crie, edite e desative categorias para organizar seus produtos.
        </Typography>
      </Alert>

      {erro && (
        <Alert severity="error" onClose={() => setErro('')} sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {/* Nova categoria */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField label="Nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Ícone (emoji opcional)" value={nova.icone} onChange={(e) => setNova({ ...nova, icone: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField label="Descrição" value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={12}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={criar} disabled={loading}>
              Nova Categoria
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista */}
      <Grid container spacing={2}>
        {categorias.map((cat) => (
          <Grid item xs={12} md={6} key={cat.id}>
            <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">{cat.icone ? `${cat.icone} ` : ''}{cat.nome}</Typography>
                {cat.descricao && (
                  <Typography variant="body2" color="textSecondary">{cat.descricao}</Typography>
                )}
              </Box>
              <Box>
                <IconButton color="primary" onClick={() => setEditando({ ...cat })}>
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={() => desativar(cat.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog editar */}
      <Dialog open={!!editando} onClose={() => setEditando(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Categoria</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Nome" value={editando?.nome || ''} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Ícone" value={editando?.icone || ''} onChange={(e) => setEditando({ ...editando, icone: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descrição" value={editando?.descricao || ''} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} fullWidth multiline rows={3} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditando(null)}>Cancelar</Button>
          <Button variant="contained" onClick={salvarEdicao} disabled={loading}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CategoriasList
