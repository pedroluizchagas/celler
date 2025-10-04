-- Script para adicionar a coluna observacoes na tabela clientes
-- Execute este SQL no Supabase SQL Editor

-- Adicionar coluna observacoes se não existir
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Verificar se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;