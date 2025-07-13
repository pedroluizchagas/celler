import React from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material'

export default function BotReports() {
  const reportData = [
    {
      date: '2025-06-24',
      interactions: 156,
      success: 132,
      failed: 24,
      rate: 84.6,
    },
    {
      date: '2025-06-23',
      interactions: 189,
      success: 162,
      failed: 27,
      rate: 85.7,
    },
    {
      date: '2025-06-22',
      interactions: 145,
      success: 119,
      failed: 26,
      rate: 82.1,
    },
    {
      date: '2025-06-21',
      interactions: 203,
      success: 178,
      failed: 25,
      rate: 87.7,
    },
  ]

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Relatório de Performance - Últimos 7 dias
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell align="right">Interações</TableCell>
                      <TableCell align="right">Sucessos</TableCell>
                      <TableCell align="right">Falhas</TableCell>
                      <TableCell align="right">Taxa de Sucesso</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>
                          {new Date(row.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell align="right">{row.interactions}</TableCell>
                        <TableCell align="right">{row.success}</TableCell>
                        <TableCell align="right">{row.failed}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${row.rate.toFixed(1)}%`}
                            color={
                              row.rate >= 85
                                ? 'success'
                                : row.rate >= 80
                                ? 'warning'
                                : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
