import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import React, { useEffect, useMemo, useState } from 'react'
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { createSaymonCellTheme } from './theme/theme'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Clientes from './pages/Clientes/Clientes'
import Ordens from './pages/Ordens/Ordens'
import Backup from './pages/Backup/Backup'
import Estoque from './pages/Estoque/Estoque'
import PDV from './pages/PDV/PDV'
import Vendas from './pages/Vendas/Vendas'
import Financeiro from './pages/Financeiro/Financeiro'
import Perfil from './pages/Perfil/Perfil'

// Componente interno que usa o contexto
function AppContent() {
  const { isDarkMode } = useThemeMode()
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => {
    const handler = () => setThemeVersion((v) => v + 1)
    window.addEventListener('celler:customization-changed', handler)
    return () => window.removeEventListener('celler:customization-changed', handler)
  }, [])

  const theme = createSaymonCellTheme(isDarkMode)

  // Atualiza variáveis CSS de acento (vermelho) para uso em CSS/SX
  useEffect(() => {
    const root = document.documentElement
    const toRgb = (hex) => {
      const m = (hex || '').match(/^#?([0-9a-fA-F]{6})$/)
      if (!m) return '255, 0, 0'
      const v = m[1]
      const r = parseInt(v.slice(0, 2), 16)
      const g = parseInt(v.slice(2, 4), 16)
      const b = parseInt(v.slice(4, 6), 16)
      return `${r}, ${g}, ${b}`
    }
    const main = theme.palette.primary.main
    const neon = theme.palette.primary.light
    root.style.setProperty('--saymon-red', main)
    root.style.setProperty('--saymon-red-neon', neon)
    root.style.setProperty('--accent-rgb', toRgb(main))
    root.style.setProperty('--accent-neon-rgb', toRgb(neon))
  }, [theme])

  // Atualiza o título da aba com o nome da marca personalizado
  useEffect(() => {
    const applyTitle = () => {
      try {
        const saved = window.localStorage.getItem('celler.customization')
        const cfg = saved ? JSON.parse(saved) : null
        const brand = (cfg?.brandName || '').toString().trim() || 'Usuário'
        document.title = `${brand} - Assistência Técnica`
      } catch {
        document.title = 'Usuário - Assistência Técnica'
      }
    }
    applyTitle()
    const onCustomize = () => applyTitle()
    window.addEventListener('celler:customization-changed', onCustomize)
    return () => window.removeEventListener('celler:customization-changed', onCustomize)
  }, [])

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/ordens" element={<Ordens />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/theme-demo" element={<Navigate to="/perfil" replace />} />
          </Routes>
        </Layout>
      </Router>
    </MuiThemeProvider>
  )
}

// Componente principal que fornece o contexto
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
