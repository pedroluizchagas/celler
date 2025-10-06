const { z } = require('zod')

const toNullishString = (value) => {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  }

  return value
}

const toNullishNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return value
}

const nullableString = () =>
  z
    .preprocess(toNullishString, z.string().trim().nullable())
    .transform((value) => value ?? null)

const nullablePositiveInt = () =>
  z
    .preprocess(
      toNullishNumber,
      z.coerce.number().int().positive().nullable()
    )
    .transform((value) => value ?? null)

const ProdutoSchema = z.object({
  nome: z
    .string({ required_error: 'nome eh obrigatorio' })
    .trim()
    .min(1, 'nome eh obrigatorio'),
  descricao: nullableString(),
  codigo_barras: nullableString(),
  codigo_interno: nullableString(),
  categoria_id: nullablePositiveInt(),
  fornecedor_id: nullablePositiveInt(),
  tipo: z.enum(['peca', 'servico']).default('peca'),
  preco_custo: z.coerce.number().min(0).default(0),
  preco_venda: z.coerce.number().min(0).default(0),
  margem_lucro: z.coerce.number().min(0).default(0),
  estoque_atual: z.coerce.number().int().min(0).default(0),
  estoque_minimo: z.coerce.number().int().min(0).default(0),
  estoque_maximo: z.coerce.number().int().min(0).default(0),
  localizacao: nullableString(),
  ativo: z.coerce.boolean().default(true),
})

module.exports = { ProdutoSchema }
