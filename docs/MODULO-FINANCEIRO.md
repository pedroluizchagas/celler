# 💰 Módulo Financeiro

## 🎯 Funcionalidades

#### 📊 **Banco de Dados**

- **5 tabelas** criadas:
  - `categorias_financeiras` - Categorias de receitas e despesas
  - `contas_pagar` - Contas a pagar 
  - `contas_receber` - Contas a receber 
  - `fluxo_caixa` - Movimentações financeiras
  - `metas_financeiras` - Metas financeiras 

#### 🎛️ **Controller (financeiroController.js)**

- `listarFluxoCaixa()` - Lista movimentações com filtros e paginação
- `adicionarMovimentacao()` - Adiciona movimentação manual
- `resumoFluxoCaixa()` - Resumo financeiro por período
- `dashboardFinanceiro()` - Dashboard com saldo atual
- `listarCategorias()` - Lista categorias financeiras
- `criarCategoria()` - Cria nova categoria financeira

#### 🛣️ **Rotas (/api/financeiro/)**

```
GET  /fluxo-caixa          - Listar movimentações
POST /fluxo-caixa          - Adicionar movimentação
GET  /fluxo-caixa/resumo   - Resumo do fluxo
GET  /dashboard            - Dashboard financeiro
GET  /categorias           - Listar categorias
POST /categorias           - Criar categoria
```

#### 📈 **Dados Iniciais**

- **10 categorias financeiras**
  - **Receitas**: Vendas de Produtos, Serviços Técnicos, Outras Receitas
  - **Despesas**: Compra de Estoque, Aluguel, Energia, Internet, Ferramentas, Marketing, Outras

### 2. **Frontend (React + Material-UI)**

#### 📄 **Páginas Principais**

- `/financeiro` - Página principal do módulo com abas

#### 🗂️ **Componentes Criados**

- **FluxoCaixaTab.jsx** - Aba completa com filtros, tabela e modal
- **ContasPagarTab.jsx** - Placeholder para desenvolvimento futuro
- **ContasReceberTab.jsx** - Placeholder para desenvolvimento futuro
- **RelatoriosTab.jsx** - Relatórios com resumo rápido

#### 🔧 **Service (financeiroService.js)**

- Comunicação completa com API
- Métodos utilitários (formatação de moeda, datas)
- Validações e tratamento de erros

#### 📱 **Interface**

- **Menu lateral** atualizado com item "Financeiro"
- **Design moderno** seguindo padrão do sistema
- **Cards informativos** com saldo atual, entradas e saídas
- **Filtros avançados** por tipo, categoria, período e descrição
- **Modal responsivo** para adicionar movimentações

## 🚀 Funcionalidades

1. **Dashboard Financeiro** - Saldo atual em tempo real
2. **Categorias Financeiras** - Sistema completo de categorização
3. **Fluxo de Caixa** - Adicionar e visualizar movimentações
4. **Filtros Avançados** - Buscar por período, tipo, categoria
5. **Interface Moderna** - Cards informativos e tabelas responsivas

### 🔄 **Em Desenvolvimento**

1. **Contas a Pagar** - Gestão de vencimentos e pagamentos
2. **Contas a Receber** - Controle de recebimentos
3. **Relatórios** - Exportação e gráficos detalhados
4. **Integração** - Automação com vendas e ordens de serviço


### **Categorias Financeiras**


## 🎨 Interface Visual

### **Cards do Dashboard**

- **Saldo Atual** - Verde se positivo, vermelho se negativo
- **Total de Entradas** - Sempre verde com ícone de crescimento
- **Total de Saídas** - Sempre vermelho com ícone de queda

### **Tabela de Movimentações**

- **Data** formatada em pt-BR
- **Tipo** com chips coloridos (Entrada/Saída)
- **Categoria** com ícone e nome
- **Valor** colorido conforme tipo (+/-)
- **Ações** para editar (em desenvolvimento)

### **Modal de Nova Movimentação**

- **Tipo** - Seleção entre Entrada/Saída
- **Valor** - Campo numérico com R$
- **Categoria** - Filtrada por tipo selecionado
- **Descrição** - Campo texto multilinha
- **Data** - Seletor de data

## 🛠️ Como Usar

1. **Acesse** `/financeiro` no sistema
2. **Visualize** o saldo atual nos cards superiores
3. **Adicione** nova movimentação clicando no botão "+Nova Movimentação"
4. **Filtre** as movimentações usando os campos de filtro
5. **Navegue** pelas abas para diferentes funcionalidades

#

## 📝 Notas Técnicas

- **Banco**: Supabase
- **API**: RESTful com validações robustas
- **Frontend**: React com hooks e Material-UI
- **Logs**: Sistema de auditoria integrado
- **Responsivo**: Interface adaptável para mobile/desktop

