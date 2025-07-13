# 📦 Sistema de Gestão de Estoque - Saymon Cell

## 🚀 **Funcionalidades Implementadas**

### ✅ **1. Gestão de Produtos**

- **Cadastro completo** de produtos (peças + acessórios)
- **Códigos de barras** e códigos internos únicos
- **Categorização** por tipo de produto
- **Controle de preços** (custo, venda, margem de lucro)
- **Localização física** no estoque
- **Status ativo/inativo**

### ✅ **2. Controle de Estoque**

- **Estoque atual, mínimo e máximo** configuráveis
- **Movimentações automáticas** (entrada/saída/ajuste/perda)
- **Histórico completo** de movimentações
- **Rastreabilidade** por usuário e data
- **Integração com ordens de serviço** e vendas

### ✅ **3. Sistema de Alertas**

- **Estoque baixo**: quando atinge o mínimo
- **Estoque zero**: quando não há produtos
- **Estoque alto**: quando excede o máximo
- **Interface visual** com notificações
- **Resolução manual** de alertas

### ✅ **4. Vendas Diretas**

- **Vendas não vinculadas** a ordens de serviço
- **Múltiplos itens** por venda
- **Tipos de pagamento** (dinheiro, cartão, PIX, fiado)
- **Sistema de desconto**
- **Baixa automática** no estoque
- **Relatórios de vendas**

### ✅ **5. Categorias e Organização**

- **Categorias personalizadas** com ícones
- **Fornecedores** (implementação futura)
- **Localização física** dos produtos
- **Filtros avançados** de busca

---

## 🏗️ **Estrutura do Banco de Dados**

### **Tabelas Principais**

#### `categorias`

```sql
id, nome, descricao, icone, ativo, created_at, updated_at
```

#### `produtos`

```sql
id, nome, descricao, codigo_barras, codigo_interno, categoria_id,
fornecedor_id, tipo, preco_custo, preco_venda, margem_lucro,
estoque_atual, estoque_minimo, estoque_maximo, localizacao,
observacoes, ativo, created_at, updated_at
```

#### `movimentacoes_estoque`

```sql
id, produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
preco_unitario, valor_total, motivo, referencia_id, referencia_tipo,
observacoes, usuario, data_movimentacao
```

#### `vendas`

```sql
id, cliente_id, numero_venda, tipo_pagamento, desconto, valor_total,
observacoes, data_venda, created_at
```

#### `venda_itens`

```sql
id, venda_id, produto_id, quantidade, preco_unitario, preco_total
```

#### `alertas_estoque`

```sql
id, produto_id, tipo, ativo, data_alerta, data_resolvido
```

---

## 🔧 **API Endpoints**

### **Produtos**

```
GET    /api/produtos              # Listar produtos
POST   /api/produtos              # Criar produto
GET    /api/produtos/:id          # Buscar por ID
PUT    /api/produtos/:id          # Atualizar produto
GET    /api/produtos/codigo/:cod  # Buscar por código
POST   /api/produtos/:id/movimentar # Movimentar estoque
GET    /api/produtos/alertas      # Listar alertas
PUT    /api/produtos/alertas/:id/resolver # Resolver alerta
```

### **Categorias**

```
GET    /api/categorias            # Listar categorias
POST   /api/categorias            # Criar categoria
GET    /api/categorias/:id        # Buscar por ID
PUT    /api/categorias/:id        # Atualizar categoria
DELETE /api/categorias/:id        # Desativar categoria
```

### **Vendas**

```
GET    /api/vendas                # Listar vendas
POST   /api/vendas                # Criar venda
GET    /api/vendas/:id            # Buscar por ID
GET    /api/vendas/relatorio      # Relatórios
```

---

## 🎨 **Interface Frontend**

### **Página Principal**: `/estoque`

- **6 Abas principais**:
  1. **Produtos** - Gestão de produtos
  2. **Categorias** - Gestão de categorias
  3. **Vendas** - Sistema de vendas diretas
  4. **Movimentações** - Histórico de movimentações
  5. **Alertas** - Alertas de estoque
  6. **Scanner** - Leitor de QR Code/código de barras

### **Componentes Principais**

- `ProdutosList` - Lista de produtos com filtros
- `ProdutoModal` - Modal para criar/editar produtos
- `MovimentacaoModal` - Modal para movimentar estoque
- `VendaModal` - Modal para vendas diretas
- `AlertasEstoque` - Lista de alertas ativos
- `QRCodeScanner` - Scanner de códigos

---

## 📊 **Dados Iniciais**

### **8 Categorias Padrão**

1. 📱 **Displays** - Telas e displays
2. 🔋 **Baterias** - Baterias para celulares
3. 🔌 **Conectores** - Conectores de carga e fones
4. 🔧 **Placas** - Componentes eletrônicos
5. 🛡️ **Capas** - Capas e películas protetoras
6. 🎧 **Fones** - Acessórios de áudio
7. ⚡ **Carregadores** - Carregadores e cabos
8. 🔨 **Ferramentas** - Ferramentas para reparo

### **10 Produtos de Exemplo**

- **Peças de reparo**: Displays, baterias, conectores
- **Acessórios**: Capas, películas, fones, carregadores
- **Diferentes situações**: Estoque normal, baixo e zero
- **Códigos de barras** nos acessórios
- **Localização física** definida

---

## 🔄 **Fluxo de Movimentações**

### **Tipos de Movimentação**

1. **Entrada** - Compras, recebimentos
2. **Saída** - Vendas, uso em OS
3. **Ajuste** - Correções de estoque
4. **Perda** - Produtos danificados/perdidos

### **Triggers Automáticos**

- **Venda direta** → Saída automática
- **Uso em OS** → Saída com referência
- **Estoque baixo** → Alerta automático
- **Estoque zero** → Alerta crítico

---

## 🚀 **Próximas Funcionalidades**

### **🔮 Em Desenvolvimento**

- [ ] **Scanner QR Code/Código de Barras** funcional
- [ ] **Relatórios avançados** de movimentação
- [ ] **Integração com fornecedores**
- [ ] **Compras automatizadas**
- [ ] **Inventário periódico**

### **🎯 Funcionalidades Futuras**

- [ ] **App móvel** para scanner
- [ ] **Códigos de barras** personalizados
- [ ] **Previsão de demanda**
- [ ] **Multi-loja** (se necessário)
- [ ] **Integração com e-commerce**

---

## 🔒 **Segurança e Auditoria**

### **Logs Implementados**

- ✅ **Criação de produtos** → Auditoria
- ✅ **Movimentações de estoque** → Log completo
- ✅ **Vendas realizadas** → Registro detalhado
- ✅ **Alterações críticas** → Rastreamento

### **Validações**

- ✅ **Estoque suficiente** para vendas
- ✅ **Códigos únicos** (barras + interno)
- ✅ **Preços consistentes**
- ✅ **Categorias ativas**

---

## 💡 **Como Usar**

### **1. Acessar o Sistema**

```
http://localhost:5173/estoque
```

### **2. Cadastrar Produtos**

1. Aba "Produtos" → Botão "Novo Produto"
2. Preencher informações básicas
3. Definir estoque mínimo/máximo
4. Salvar

### **3. Movimentar Estoque**

1. Localizar produto na lista
2. Botão "Movimentar" → Escolher tipo
3. Informar quantidade e motivo
4. Confirmar movimentação

### **4. Realizar Venda**

1. Aba "Vendas" → "Nova Venda"
2. Adicionar produtos à venda
3. Escolher forma de pagamento
4. Aplicar desconto (se necessário)
5. Finalizar venda

### **5. Monitorar Alertas**

1. Aba "Alertas" → Ver produtos críticos
2. Resolver alertas manualmente
3. Reabastecer estoque conforme necessário

---

## 🎉 **Benefícios Implementados**

### **✅ Para o Negócio**

- **Controle total** do estoque
- **Redução de perdas** por falta de controle
- **Otimização de compras** com alertas
- **Relatórios precisos** de vendas
- **Maior eficiência** operacional

### **✅ Para o Usuário**

- **Interface intuitiva** e responsiva
- **Busca rápida** por códigos
- **Alertas visuais** importantes
- **Histórico completo** de movimentações
- **Integração total** com OS existente

---

**© 2025 Saymon Cell - Sistema de Gestão de Estoque Integrado**
