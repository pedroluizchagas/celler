import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext'
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
// WhatsApp e Bot IA removidos do sistema
import ThemeDemo from './components/ThemeDemo/ThemeDemo'

// Componente interno que usa o contexto
function AppContent() {
  const { isDarkMode } = useThemeMode()
  const theme = createSaymonCellTheme(isDarkMode)

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
            {/* WhatsApp e Bot IA removidos do sistema */}
            <Route path="/backup" element={<Backup />} />
            <Route path="/theme-demo" element={<ThemeDemo />} />
          </Routes>
        </Layout>
      </Router>
    </MuiThemeProvider>
  )
}

// Componente principal que fornece o contexto
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
