/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  regra: "Administrador" | "Gerente" | "Operador" | "Operador de Caixa";
  ativo: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  endereco: string;
  contasAPagarCount: number;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  fidelidadePontos: number;
  cashbackAcumulado: number;
  limiteCredito: number;
  historicoComprasCount: number;
}

export interface Produto {
  id: string;
  codigoBarras: string;
  nome: string;
  categoria: string;
  marca: string;
  quantidade: number;
  estoqueMinimo: number;
  valorCompra: number;
  valorVenda: number;
  validade: string; // ISO date YYYY-MM-DD
  fornecedorId: string;
  fotoUrl?: string;
  demandaIA?: "Alta" | "Média" | "Baixa";
  sugestaoCompraIA?: number;
  justificativaIA?: string;
}

export interface ItemVenda {
  id: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Venda {
  id: string;
  data: string; // ISO String
  itens: ItemVenda[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento: "Dinheiro" | "Crédito" | "Débito" | "PIX";
  clienteId?: string;
  clienteNome?: string;
}

export interface CaixaSessao {
  id: string;
  status: "Aberto" | "Fechado";
  dataAbertura: string;
  dataFechamento?: string;
  valorInicial: number;
  valorFinal?: number;
  vendasTotais: number;
  operadorId: string;
  entradasDormidas: number; // For cash payments simulated in desk
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  nomeProduto: string;
  tipo: "Entrada" | "Saída" | "Ajuste";
  quantidade: number;
  data: string;
  motivo: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  fornecedorId?: string;
  fornecedorNome?: string;
  dataVencimento: string;
  status: "Pendente" | "Pago";
  categoriaGasto: "Compras" | "Energia" | "Água" | "Internet" | "Funcionários" | "Impostos" | "Limpeza" | "Outros";
}

export interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  clienteId?: string;
  clienteNome?: string;
  dataVencimento: string;
  status: "Pendente" | "Recebido";
  formaRecebimento: "Mensalidade" | "Crediário" | "Fidelidade" | "Outro";
}
