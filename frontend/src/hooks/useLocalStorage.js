import { useState, useEffect } from 'react'

/**
 * Hook personalizado para gerenciar dados no localStorage
 * @param {string} key - Chave do localStorage
 * @param {any} initialValue - Valor inicial
 * @returns {[any, function]} - [valor, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Função para obter valor do localStorage
  const getStoredValue = () => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Erro ao ler localStorage para chave "${key}":`, error)
      return initialValue
    }
  }

  const [storedValue, setStoredValue] = useState(getStoredValue)

  // Função para atualizar o valor
  const setValue = (value) => {
    try {
      // Permitir que value seja uma função como useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value

      setStoredValue(valueToStore)

      // Salvar no localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore))

      // Disparar evento customizado para sincronizar entre abas
      window.dispatchEvent(
        new CustomEvent('localStorage', {
          detail: { key, value: valueToStore },
        })
      )
    } catch (error) {
      console.warn(`Erro ao salvar no localStorage para chave "${key}":`, error)
    }
  }

  // Escutar mudanças no localStorage (sincronização entre abas)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        setStoredValue(getStoredValue())
      }
    }

    const handleCustomStorageChange = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorage', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorage', handleCustomStorageChange)
    }
  }, [key])

  return [storedValue, setValue]
}
