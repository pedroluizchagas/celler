-- Script para testar Foreign Keys
-- Execute este script no Supabase SQL Editor para verificar se as foreign keys estão funcionando

-- 1. Testar inserção de categoria
INSERT INTO categorias (nome, descricao) VALUES ('Eletrônicos', 'Produtos eletrônicos em geral');

-- 2. Testar inserção de produto com foreign key para categoria
INSERT INTO produtos (nome, categoria_id, preco, estoque_atual, estoque_minimo) 
VALUES ('Smartphone', 1, 999.99, 10, 5);

-- 3. Testar inserção de cliente
INSERT INTO clientes (nome, telefone, email, observacoes) 
VALUES ('João Silva', '11999999999', 'joao@email.com', 'Cliente teste');

-- 4. Testar inserção de ordem com foreign key para cliente
INSERT INTO ordens (cliente_id, equipamento, defeito_relatado, status) 
VALUES (1, 'Smartphone Samsung', 'Tela quebrada', 'aguardando');

-- 5. Testar inserção de peça na ordem com foreign keys
INSERT INTO ordem_pecas (ordem_id, produto_id, quantidade, preco_unitario) 
VALUES (1, 1, 1, 150.00);

-- 6. Verificar se os dados foram inseridos corretamente com JOINs
SELECT 
    o.id as ordem_id,
    c.nome as cliente_nome,
    o.equipamento,
    o.status,
    op.quantidade,
    p.nome as peca_nome,
    cat.nome as categoria_nome
FROM ordens o
JOIN clientes c ON o.cliente_id = c.id
LEFT JOIN ordem_pecas op ON o.id = op.ordem_id
LEFT JOIN produtos p ON op.produto_id = p.id
LEFT JOIN categorias cat ON p.categoria_id = cat.id;

-- 7. Testar constraint de foreign key (deve falhar)
-- Descomente a linha abaixo para testar se a foreign key está funcionando
-- INSERT INTO produtos (nome, categoria_id, preco, estoque_atual, estoque_minimo) VALUES ('Teste', 999, 10.00, 1, 1);

-- 8. Limpar dados de teste (opcional)
-- DELETE FROM ordem_pecas WHERE ordem_id = 1;
-- DELETE FROM ordens WHERE id = 1;
-- DELETE FROM produtos WHERE id = 1;
-- DELETE FROM categorias WHERE id = 1;
-- DELETE FROM clientes WHERE id = 1;