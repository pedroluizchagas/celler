const supabaseManager = require("../../utils/supabase");

async function criarProduto(data) {
  const toNull = v => (v === undefined ? null : v);
  const payload = {
    nome: data.nome,
    descricao: toNull(data.descricao),
    codigo_barras: toNull(data.codigo_barras),
    codigo_interno: toNull(data.codigo_interno),
    categoria_id: toNull(data.categoria_id),
    tipo: data.tipo ?? "peca",
    preco_custo: data.preco_custo ?? 0,
    preco_venda: data.preco_venda ?? 0,
    margem_lucro: data.margem_lucro ?? 0,
    estoque_atual: data.estoque_atual ?? 0,
    estoque_minimo: data.estoque_minimo ?? 0,
    estoque_maximo: data.estoque_maximo ?? 0,
    localizacao: toNull(data.localizacao),
    ativo: data.ativo ?? true
  };

  const result = await supabaseManager.insert("produtos", payload);
  return result[0];
}

module.exports = { criarProduto };