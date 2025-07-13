import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Adicionar classe preload para evitar transições durante carregamento
document.body.classList.add('preload')

// Remover classe preload após carregamento
window.addEventListener('load', () => {
  document.body.classList.remove('preload')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
