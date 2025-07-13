import React from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { Category as CategoryIcon } from '@mui/icons-material'

const CategoriasList = ({ onCategoriaChange }) => {
  return (
    <Box>
      <Alert severity="info" icon={<CategoryIcon />}>
        <Typography variant="h6" gutterBottom>
          Gestão de Categorias
        </Typography>
        <Typography variant="body2">
          Esta funcionalidade está em desenvolvimento. As categorias são criadas
          automaticamente no sistema.
        </Typography>
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            <strong>Categorias disponíveis:</strong>
          </Typography>
          <ul>
            <li>📱 Displays - Telas e displays para smartphones</li>
            <li>🔋 Baterias - Baterias para celulares e tablets</li>
            <li>🔌 Conectores - Conectores de carga e fones</li>
            <li>🔧 Placas - Placas-mãe e componentes eletrônicos</li>
            <li>🛡️ Capas - Capas e películas protetoras</li>
            <li>🎧 Fones - Fones de ouvido e acessórios de áudio</li>
            <li>⚡ Carregadores - Carregadores e cabos USB</li>
            <li>🔨 Ferramentas - Ferramentas para reparo</li>
          </ul>
        </Box>
      </Alert>
    </Box>
  )
}

export default CategoriasList
