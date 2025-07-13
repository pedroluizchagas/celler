import React from 'react'
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material'

const AlertasEstoque = ({ alertas = [] }) => {
  const getAlertIcon = (tipo) => {
    switch (tipo) {
      case 'estoque_zero':
        return <ErrorIcon color="error" />
      case 'estoque_baixo':
        return <WarningIcon color="warning" />
      default:
        return <InfoIcon color="info" />
    }
  }

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'estoque_zero':
        return 'error'
      case 'estoque_baixo':
        return 'warning'
      default:
        return 'info'
    }
  }

  return (
    <Box>
      <Alert severity="info" icon={<WarningIcon />}>
        <Typography variant="h6" gutterBottom>
          Alertas de Estoque
        </Typography>
        <Typography variant="body2" paragraph>
          {alertas.length === 0
            ? 'Nenhum alerta de estoque no momento. Todos os produtos estão com níveis adequados.'
            : `${alertas.length} alerta(s) de estoque encontrado(s).`}
        </Typography>

        {alertas.length > 0 && (
          <List dense>
            {alertas.map((alerta, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>{getAlertIcon(alerta.tipo)}</ListItemIcon>
                <ListItemText
                  primary={alerta.produto_nome}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {alerta.mensagem}
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          size="small"
                          color={getAlertColor(alerta.tipo)}
                          label={
                            alerta.tipo === 'estoque_zero'
                              ? 'SEM ESTOQUE'
                              : 'ESTOQUE BAIXO'
                          }
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            <strong>Configurações de alerta:</strong>
          </Typography>
          <ul>
            <li>🔴 Estoque Zero - Produto sem estoque disponível</li>
            <li>🟡 Estoque Baixo - Produto abaixo do estoque mínimo</li>
            <li>📊 Os alertas são atualizados automaticamente</li>
          </ul>
        </Box>
      </Alert>
    </Box>
  )
}

export default AlertasEstoque
