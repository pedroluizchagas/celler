import { z } from 'zod'

export const STATUS_INPUTS = [
  'recebido',
  'em_analise',
  'em análise',
  'aguardando_pecas',
  'aguardando peças',
  'em_reparo',
  'pronto',
  'entregue',
  'cancelado',
]

export const PRIORIDADES = ['baixa', 'normal', 'alta', 'urgente']

const nullableString = z.string().trim().min(1).optional().or(z.literal('').transform(() => undefined)).or(z.null()).optional()

export const OrderCreateSchema = z.object({
  cliente_id: z.number().int().positive(),
  equipamento: z.string().trim().min(1, 'Equipamento é obrigatório'),
  problema: z.string().trim().min(1, 'Defeito/Problema é obrigatório'),
  status: z.string().trim().optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  marca: nullableString,
  modelo: nullableString,
  numero_serie: nullableString,
  tecnico_responsavel: nullableString,
  diagnostico: nullableString,
  solucao: nullableString,
  valor_orcamento: z.number().nonnegative().nullable().optional(),
  valor_final: z.number().nonnegative().nullable().optional(),
  pecas: z.array(z.any()).optional(),
  servicos: z.array(z.any()).optional(),
  observacoes: z.string().optional().nullable(),
})

export const OrderUpdateSchema = OrderCreateSchema.partial().extend({
  cliente_id: z.number().int().positive().optional(),
})

export const OrderStatusSchema = z.object({
  status: z.string().trim().refine((v) => STATUS_INPUTS.includes(v.toLowerCase()), 'Status inválido'),
  observacoes: z.string().optional().nullable(),
})

export const ProductCreateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  codigo_barras: z.string().optional().nullable(),
  codigo_interno: z.string().optional().nullable(),
  categoria_id: z.number().int().positive().optional().nullable(),
  fornecedor_id: z.number().int().positive().optional().nullable(),
  tipo: z.enum(['peca', 'acessorio', 'servico']).default('peca'),
  preco_custo: z.number().min(0).default(0),
  preco_venda: z.number().min(0).default(0),
  margem_lucro: z.number().min(0).default(0),
  estoque_atual: z.number().int().min(0).default(0),
  estoque_minimo: z.number().int().min(0).default(0),
  estoque_maximo: z.number().int().min(0).default(0),
  localizacao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export const ProductUpdateSchema = ProductCreateSchema.partial()

export const MovimentacaoSchema = z.object({
  tipo: z.enum(['entrada', 'saida', 'venda', 'ajuste', 'perda', 'uso_os', 'estoque_inicial']).default('ajuste'),
  quantidade: z.number().int().positive('Quantidade deve ser maior que zero'),
  motivo: z.string().trim().min(1, 'Motivo é obrigatório'),
  preco_unitario: z.number().min(0).nullable().optional(),
  observacoes: z.string().optional().nullable(),
})

export function formatZodError(error) {
  try {
    const flat = error.flatten()
    const fieldErrors = Object.entries(flat.fieldErrors || {})
      .flatMap(([path, msgs]) => (msgs || []).map((message) => ({ path, message })))
    const formErrors = (flat.formErrors || []).map((message) => ({ path: '_form', message }))
    return [...fieldErrors, ...formErrors]
  } catch {
    return [{ path: '_form', message: 'Dados inválidos' }]
  }
}

export const VendaItemSchema = z.object({
  produto_id: z.number().int().positive(),
  quantidade: z.number().int().positive(),
  preco_unitario: z.number().min(0),
})

export const VendaCreateSchema = z.object({
  cliente_id: z.number().int().positive().nullable().optional(),
  tipo_pagamento: z.enum(['dinheiro', 'cartao', 'pix', 'outro']).default('dinheiro'),
  desconto: z.number().min(0).default(0),
  observacoes: z.string().optional().nullable(),
  itens: z.array(VendaItemSchema).min(1, 'Informe ao menos um item'),
})
