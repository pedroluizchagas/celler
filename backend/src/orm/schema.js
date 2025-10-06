/**
 * Tipos de schema para uso nos repositórios (sem dependências externas).
 * Estes tipos espelham as colunas principais do banco (Supabase/Postgres).
 * Se/Quando adotarmos Drizzle/Kysely, este arquivo pode ser substituído pelos
 * modelos gerados mantendo os mesmos nomes de tipos exportados.
 */

/** @typedef {Object} Produto
 * @property {number} id
 * @property {string} nome
 * @property {('peca'|'servico')} tipo
 * @property {number} preco_custo
 * @property {number} preco_venda
 * @property {number} margem_lucro
 * @property {number} estoque_atual
 * @property {number} estoque_minimo
 * @property {number} estoque_maximo
 * @property {number|null} [categoria_id]
 * @property {number|null} [fornecedor_id]
 * @property {string|null} [descricao]
 * @property {string|null} [codigo_barras]
 * @property {string|null} [codigo_interno]
 * @property {string|null} [localizacao]
 * @property {boolean} ativo
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/** @typedef {Object} NewProduto
 * @property {string} nome
 * @property {('peca'|'servico')} [tipo]
 * @property {number} [preco_custo]
 * @property {number} [preco_venda]
 * @property {number} [margem_lucro]
 * @property {number} [estoque_atual]
 * @property {number} [estoque_minimo]
 * @property {number} [estoque_maximo]
 * @property {number|null} [categoria_id]
 * @property {number|null} [fornecedor_id]
 * @property {string|null} [descricao]
 * @property {string|null} [codigo_barras]
 * @property {string|null} [codigo_interno]
 * @property {string|null} [localizacao]
 * @property {boolean} [ativo]
 */

/** @typedef {Object} Cliente
 * @property {number} id
 * @property {string} nome
 * @property {string} telefone
 * @property {string|null} [email]
 * @property {string|null} [endereco]
 * @property {string|null} [observacoes]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/** @typedef {Object} Ordem
 * @property {number} id
 * @property {string} equipamento
 * @property {string} defeito_relatado
 * @property {string} status
 * @property {string|null} [prioridade]
 * @property {string} [data_entrada]
 * @property {number|null} [valor_final]
 * @property {number|null} [cliente_id]
 */

module.exports = {}

