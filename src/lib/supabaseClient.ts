import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" &&
    supabaseUrl.trim().length > 0 &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim().length > 0
  );
};

export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não está configurado. Cadastre as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações para ativar."
    );
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
};

/**
 * Helper mapping standard snake_case from DB into camelCase in TypeScript React App
 */
export const mapDBProductToApp = (db: any) => ({
  id: db.id,
  codigoBarras: db.codigo_barras,
  nome: db.nome,
  categoria: db.categoria,
  marca: db.marca,
  quantidade: db.quantidade,
  estoqueMinimo: db.estoque_minimo,
  valorCompra: Number(db.valor_compra),
  valorVenda: Number(db.valor_venda),
  validade: db.validade,
  fornecedorId: db.fornecedor_id,
  fotoUrl: db.foto_url,
  demandaIA: db.demanda_ia,
  sugestaoCompraIA: db.sugestao_compra_ia,
  justificativaIA: db.justificativa_ia
});

export const mapAppProductToDB = (app: any) => ({
  id: app.id,
  codigo_barras: app.codigoBarras,
  nome: app.nome,
  categoria: app.categoria,
  marca: app.marca,
  quantidade: app.quantidade,
  estoque_minimo: app.estoqueMinimo,
  valor_compra: app.valorCompra,
  valor_venda: app.valorVenda,
  validade: app.validade,
  fornecedor_id: app.fornecedorId,
  foto_url: app.fotoUrl,
  demanda_ia: app.demandaIA,
  sugestao_compra_ia: app.sugestaoCompraIA,
  justificativa_ia: app.justificativaIA
});

export const mapDBSaleToApp = (dbVal: any, dbItems: any[]) => ({
  id: dbVal.id,
  data: dbVal.data,
  subtotal: Number(dbVal.subtotal),
  desconto: Number(dbVal.desconto),
  total: Number(dbVal.total),
  formaPagamento: dbVal.forma_pagamento,
  clienteId: dbVal.cliente_id,
  clienteNome: dbVal.cliente_nome,
  itens: (dbItems || []).map(item => ({
    id: item.id,
    produtoId: item.produto_id,
    nomeProduto: item.nome_produto,
    quantidade: item.quantidade,
    valorUnitario: Number(item.valor_unitario),
    valorTotal: Number(item.valor_total)
  }))
});

export const mapDBSessionToApp = (db: any) => ({
  id: db.id,
  status: db.status,
  dataAbertura: db.data_abertura,
  dataFechamento: db.data_fechamento || undefined,
  valorInicial: Number(db.valor_inicial),
  valorFinal: db.valor_final !== undefined && db.valor_final !== null ? Number(db.valor_final) : undefined,
  vendasTotais: db.vendas_totais || 0,
  operadorId: db.operador_id,
  entradasDormidas: db.entradas_dormidas ? Number(db.entradas_dormidas) : 0
});

export const mapAppSessionToDB = (s: any) => ({
  id: s.id,
  status: s.status,
  data_abertura: s.dataAbertura,
  data_fechamento: s.dataFechamento || null,
  valor_inicial: s.valorInicial,
  valor_final: s.valorFinal !== undefined ? s.valorFinal : null,
  vendas_totais: s.vendasTotais,
  operador_id: s.operadorId,
  entradas_dormidas: s.entradasDormidas || 0
});

export const mapDBClientToApp = (db: any) => ({
  id: db.id,
  nome: db.nome,
  cpf: db.cpf,
  telefone: db.telefone,
  email: db.email,
  fidelidadePontos: db.fidelidade_pontos || 0,
  cashbackAcumulado: Number(db.cashback_acumulado || 0),
  limiteCredito: Number(db.limite_credito || 0),
  historicoComprasCount: db.historico_compras_count || 0
});

export const mapAppClientToDB = (app: any) => ({
  id: app.id,
  nome: app.nome,
  cpf: app.cpf,
  telefone: app.telefone,
  email: app.email,
  fidelidade_pontos: app.fidelidadePontos,
  cashback_acumulado: app.cashbackAcumulado,
  limite_credito: app.limiteCredito,
  historico_compras_count: app.historicoComprasCount
});

export const mapDBSupplierToApp = (db: any) => ({
  id: db.id,
  nome: db.nome,
  cnpj: db.cnpj,
  contato: db.contato,
  telefone: db.telefone,
  email: db.email,
  endereco: db.endereco,
  contasAPagarCount: db.contas_a_pagar_count || 0
});

export const mapAppSupplierToDB = (app: any) => ({
  id: app.id,
  nome: app.nome,
  cnpj: app.cnpj,
  contato: app.contato,
  telefone: app.telefone,
  email: app.email,
  endereco: app.endereco,
  contas_a_pagar_count: app.contasAPagarCount
});

export const mapDBPayableToApp = (db: any) => ({
  id: db.id,
  descricao: db.descricao,
  valor: Number(db.valor),
  fornecedorId: db.fornecedor_id,
  fornecedorNome: db.fornecedor_nome,
  dataVencimento: db.data_vencimento,
  status: db.status,
  categoriaGasto: db.categoria_gasto
});

export const mapAppPayableToDB = (p: any) => ({
  id: p.id,
  descricao: p.descricao,
  valor: p.valor,
  fornecedor_id: p.fornecedorId || null,
  fornecedor_nome: p.fornecedorNome || null,
  data_vencimento: p.dataVencimento,
  status: p.status,
  categoria_gasto: p.categoriaGasto
});

export const mapDBReceivableToApp = (db: any) => ({
  id: db.id,
  descricao: db.descricao,
  valor: Number(db.valor),
  clienteId: db.cliente_id,
  clienteNome: db.cliente_nome,
  dataVencimento: db.data_vencimento,
  status: db.status,
  formaRecebimento: db.forma_recebimento
});

export const mapAppReceivableToDB = (r: any) => ({
  id: r.id,
  descricao: r.descricao,
  valor: r.valor,
  cliente_id: r.clienteId || null,
  cliente_nome: r.clienteNome || null,
  data_vencimento: r.dataVencimento,
  status: r.status,
  forma_recebimento: r.formaRecebimento
});

export const mapDBMovementToApp = (db: any) => ({
  id: db.id,
  produtoId: db.produto_id,
  nomeProduto: db.nome_produto,
  tipo: db.tipo,
  quantidade: db.quantidade,
  data: db.data,
  motivo: db.motivo
});

export const mapAppMovementToDB = (m: any) => ({
  id: m.id,
  produto_id: m.produtoId,
  nome_produto: m.nomeProduto,
  tipo: m.tipo,
  quantidade: m.quantidade,
  data: m.data,
  motivo: m.motivo
});

export const mapDBUserToApp = (db: any) => ({
  id: db.id,
  nome: db.nome,
  email: db.email,
  regra: db.regra,
  ativo: db.ativo
});

export const mapAppUserToDB = (u: any) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  regra: u.regra,
  ativo: u.ativo,
  senha: u.senha || "123456"
});
