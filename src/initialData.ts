/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Categoria, Fornecedor, Cliente, Produto, Venda, ContaPagar, ContaReceber, MovimentacaoEstoque, Usuario } from "./types";

export const INITIAL_CATEGORIES: Categoria[] = [
  { id: "cat-1", nome: "Mercearia", slug: "mercearia" },
  { id: "cat-2", nome: "Hortifrúti", slug: "hortifruti" },
  { id: "cat-3", nome: "Laticínios & Frios", slug: "laticinios" },
  { id: "cat-4", nome: "Açougue", slug: "acougue" },
  { id: "cat-5", nome: "Bebidas", slug: "bebidas" },
  { id: "cat-6", nome: "Higiene & Limpeza", slug: "higiene-limpeza" },
  { id: "cat-7", nome: "Padaria", slug: "padaria" }
];

export const INITIAL_SUPPLIERS: Fornecedor[] = [
  {
    id: "forn-1",
    nome: "Distribuidora de Alimentos União Ltda",
    cnpj: "12.345.678/0001-90",
    contato: "Carlos Mendes",
    telefone: "(11) 98877-6655",
    email: "comercial@uniaodistri.com.br",
    endereco: "Av. Industrial, 1420 - São Paulo, SP",
    contasAPagarCount: 2
  },
  {
    id: "forn-2",
    nome: "Hortifrúti Fazenda Verde S/A",
    cnpj: "98.765.432/0001-10",
    contato: "Dona Maria Augusta",
    telefone: "(19) 97766-5544",
    email: "fazenda@verdehorti.com",
    endereco: "Rodovia SP-340, Km 120 - Mogi Mirim, SP",
    contasAPagarCount: 1
  },
  {
    id: "forn-3",
    nome: "Mega Cervejas & Refrigerantes S/A",
    cnpj: "45.890.123/0002-44",
    contato: "Luciano Barbosa",
    telefone: "(21) 99223-4411",
    email: "pedidos@megabebibas.com",
    endereco: "Rua do Porto, 450 - Rio de Janeiro, RJ",
    contasAPagarCount: 3
  },
  {
    id: "forn-4",
    nome: "Laticínios Alvorada S/A",
    cnpj: "05.111.222/0001-50",
    contato: "Renato Souza",
    telefone: "(31) 3245-6700",
    email: "vendas@laticinioalvorada.com",
    endereco: "Rodovia das Alterosas, Km 8 - Belo Horizonte, MG",
    contasAPagarCount: 1
  }
];

export const INITIAL_CLIENTS: Cliente[] = [
  {
    id: "cli-1",
    nome: "Alexandre Pires",
    cpf: "111.222.333-44",
    telefone: "(11) 99888-7766",
    email: "alexandre@gmail.com",
    fidelidadePontos: 340,
    cashbackAcumulado: 12.50,
    limiteCredito: 500.00,
    historicoComprasCount: 12
  },
  {
    id: "cli-2",
    nome: "Camila Rodrigues Silva",
    cpf: "222.333.444-55",
    telefone: "(11) 99777-6655",
    email: "camila.silva@outlook.com",
    fidelidadePontos: 820,
    cashbackAcumulado: 45.90,
    limiteCredito: 1000.00,
    historicoComprasCount: 28
  },
  {
    id: "cli-3",
    nome: "Marcos Aurelio de Souza",
    cpf: "333.444.555-66",
    telefone: "(11) 99111-2233",
    email: "marquinhos.souza@yahoo.com.br",
    fidelidadePontos: 150,
    cashbackAcumulado: 4.20,
    limiteCredito: 300.00,
    historicoComprasCount: 5
  },
  {
    id: "cli-4",
    nome: "Fernanda Lima de Oliveira",
    cpf: "444.555.666-77",
    telefone: "(11) 98765-4321",
    email: "fernanda.lima@gourmet.net",
    fidelidadePontos: 1120,
    cashbackAcumulado: 89.10,
    limiteCredito: 1500.00,
    historicoComprasCount: 42
  }
];

export const INITIAL_PRODUCTS: Produto[] = [
  {
    id: "prod-1",
    codigoBarras: "7891000100101",
    nome: "Arroz Extra Tipo 1 Integrale 5kg",
    categoria: "Mercearia",
    marca: "Prato Fino",
    quantidade: 45,
    estoqueMinimo: 15,
    valorCompra: 18.50,
    valorVenda: 27.90,
    validade: "2027-02-15",
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-2",
    codigoBarras: "7891000100200",
    nome: "Feijão Carioca Especial 1kg",
    categoria: "Mercearia",
    marca: "Dona Benta",
    quantidade: 12, // Baixo estoque (Estoque mínimo is 15)
    estoqueMinimo: 15,
    valorCompra: 4.80,
    valorVenda: 7.99,
    validade: "2026-11-20",
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-3",
    codigoBarras: "7891000100309",
    nome: "Óleo de Soja Purificado 900ml",
    categoria: "Mercearia",
    marca: "Liza",
    quantidade: 3, // Perigo crítico!
    estoqueMinimo: 20,
    valorCompra: 5.10,
    valorVenda: 8.45,
    validade: "2026-09-10",
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-4",
    codigoBarras: "7892000200102",
    nome: "Banana Nanica Climatizada (kg)",
    categoria: "Hortifrúti",
    marca: "Do Pomar",
    quantidade: 32,
    estoqueMinimo: 10,
    valorCompra: 2.20,
    valorVenda: 4.99,
    validade: "2026-06-03", // Curta validade!
    fornecedorId: "forn-2",
    fotoUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-5",
    codigoBarras: "7892000200201",
    nome: "Tomate Italiano Selecionado (kg)",
    categoria: "Hortifrúti",
    marca: "Do Pomar",
    quantidade: 8, // Baixo Estoque
    estoqueMinimo: 12,
    valorCompra: 4.50,
    valorVenda: 8.90,
    validade: "2026-06-02",
    fornecedorId: "forn-2",
    fotoUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-6",
    codigoBarras: "7893000300103",
    nome: "Leite Integral UHT Caixa 1L",
    categoria: "Laticínios & Frios",
    marca: "Itambé",
    quantidade: 120,
    estoqueMinimo: 30,
    valorCompra: 3.10,
    valorVenda: 5.49,
    validade: "2026-10-18",
    fornecedorId: "forn-4",
    fotoUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-7",
    codigoBarras: "7893000300202",
    nome: "Queijo Muçarela Fatiado 150g",
    categoria: "Laticínios & Frios",
    marca: "Sadia",
    quantidade: 14,
    estoqueMinimo: 15,
    valorCompra: 6.90,
    valorVenda: 11.80,
    validade: "2026-06-15", // Próximo da validade
    fornecedorId: "forn-4",
    fotoUrl: "https://images.unsplash.com/photo-1528256846555-8090bec72c65?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-8",
    codigoBarras: "7894000400104",
    nome: "Contra Filé Bovino Premium Friboi (kg)",
    categoria: "Açougue",
    marca: "Friboi",
    quantidade: 18,
    estoqueMinimo: 8,
    valorCompra: 28.90,
    valorVenda: 45.90,
    validade: "2026-06-05", // Fresco
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-9",
    codigoBarras: "7895000500105",
    nome: "Refrigerante de Cola Garrafa 2L",
    categoria: "Bebidas",
    marca: "Coca-Cola",
    quantidade: 85,
    estoqueMinimo: 24,
    valorCompra: 4.80,
    valorVenda: 8.99,
    validade: "2026-12-10",
    fornecedorId: "forn-3",
    fotoUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-10",
    codigoBarras: "7895000500204",
    nome: "Cerveja Pilsen Lata 350ml",
    categoria: "Bebidas",
    marca: "Amstel",
    quantidade: 240,
    estoqueMinimo: 48,
    valorCompra: 2.15,
    valorVenda: 3.89,
    validade: "2026-12-30",
    fornecedorId: "forn-3",
    fotoUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-11",
    codigoBarras: "7896000600106",
    nome: "Detergente Líquido Neutro 500ml",
    categoria: "Higiene & Limpeza",
    marca: "Ipê",
    quantidade: 60,
    estoqueMinimo: 15,
    valorCompra: 1.20,
    valorVenda: 2.35,
    validade: "2028-01-01",
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "prod-12",
    codigoBarras: "7897000700107",
    nome: "Pão de Forma Tradicional Supreme",
    categoria: "Padaria",
    marca: "Panco",
    quantidade: 16,
    estoqueMinimo: 8,
    valorCompra: 4.20,
    valorVenda: 7.49,
    validade: "2026-06-04", // Curta validade!
    fornecedorId: "forn-1",
    fotoUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  }
];

export const INITIAL_SALES: Venda[] = [
  {
    id: "ven-1",
    data: "2026-05-27T10:14:00.000Z",
    itens: [
      { id: "iv-1", produtoId: "prod-1", nomeProduto: "Arroz Extra Tipo 1 Integrale 5kg", quantidade: 1, valorUnitario: 27.90, valorTotal: 27.90 },
      { id: "iv-2", produtoId: "prod-2", nomeProduto: "Feijão Carioca Especial 1kg", quantidade: 2, valorUnitario: 7.99, valorTotal: 15.98 },
      { id: "iv-3", produtoId: "prod-9", nomeProduto: "Refrigerante de Cola Garrafa 2L", quantidade: 1, valorUnitario: 8.99, valorTotal: 8.99 }
    ],
    subtotal: 52.87,
    desconto: 2.87,
    total: 50.00,
    formaPagamento: "PIX",
    clienteId: "cli-1",
    clienteNome: "Alexandre Pires"
  },
  {
    id: "ven-2",
    data: "2026-05-27T11:45:00.000Z",
    itens: [
      { id: "iv-4", produtoId: "prod-8", nomeProduto: "Contra Filé Bovino Premium Friboi (kg)", quantidade: 1.5, valorUnitario: 45.90, valorTotal: 68.85 },
      { id: "iv-5", produtoId: "prod-10", nomeProduto: "Cerveja Pilsen Lata 350ml", quantidade: 12, valorUnitario: 3.89, valorTotal: 46.68 }
    ],
    subtotal: 115.53,
    desconto: 0.00,
    total: 115.53,
    formaPagamento: "Crédito",
    clienteId: "cli-2",
    clienteNome: "Camila Rodrigues Silva"
  },
  {
    id: "ven-3",
    data: "2026-05-27T14:22:00.000Z",
    itens: [
      { id: "iv-6", produtoId: "prod-6", nomeProduto: "Leite Integral UHT Caixa 1L", quantidade: 6, valorUnitario: 5.49, valorTotal: 32.94 },
      { id: "iv-7", produtoId: "prod-12", nomeProduto: "Pão de Forma Tradicional Supreme", quantidade: 1, valorUnitario: 7.49, valorTotal: 7.49 }
    ],
    subtotal: 40.43,
    desconto: 0.43,
    total: 40.00,
    formaPagamento: "Dinheiro"
  },
  {
    id: "ven-4",
    data: "2026-05-26T16:30:00.000Z",
    itens: [
      { id: "iv-8", produtoId: "prod-3", nomeProduto: "Óleo de Soja Purificado 900ml", quantidade: 2, valorUnitario: 8.45, valorTotal: 16.90 },
      { id: "iv-9", produtoId: "prod-5", nomeProduto: "Tomate Italiano Selecionado (kg)", quantidade: 1.8, valorUnitario: 8.90, valorTotal: 16.02 },
      { id: "iv-10", produtoId: "prod-11", nomeProduto: "Detergente Líquido Neutro 500ml", quantidade: 3, valorUnitario: 2.35, valorTotal: 7.05 }
    ],
    subtotal: 39.97,
    desconto: 0.00,
    total: 39.97,
    formaPagamento: "Débito",
    clienteId: "cli-4",
    clienteNome: "Fernanda Lima de Oliveira"
  }
];

export const INITIAL_PAYABLES: ContaPagar[] = [
  { id: "cp-1", descricao: "Fatura Compra Distribuidora União", valor: 1450.00, fornecedorId: "forn-1", fornecedorNome: "Distribuidora de Alimentos União Ltda", dataVencimento: "2026-06-10", status: "Pendente", categoriaGasto: "Compras" },
  { id: "cp-2", descricao: "Conta de Energia Elétrica Enel", valor: 850.30, dataVencimento: "2026-06-05", status: "Pendente", categoriaGasto: "Energia" },
  { id: "cp-3", descricao: "Abastecimento Hortifrúti Fazenda", valor: 420.00, fornecedorId: "forn-2", fornecedorNome: "Hortifrúti Fazenda Verde S/A", dataVencimento: "2026-05-30", status: "Pendente", categoriaGasto: "Compras" },
  { id: "cp-4", descricao: "Fatura Mensal Bebidas Ambev", valor: 1890.00, fornecedorId: "forn-3", fornecedorNome: "Mega Cervejas & Refrigerantes S/A", dataVencimento: "2026-06-15", status: "Pendente", categoriaGasto: "Compras" },
  { id: "cp-5", descricao: "Abono Sabesp Água Comercial", valor: 180.40, dataVencimento: "2026-05-25", status: "Pago", categoriaGasto: "Água" },
  { id: "cp-6", descricao: "Internet Banda Larga Fibra Link", valor: 120.00, dataVencimento: "2026-05-20", status: "Pago", categoriaGasto: "Internet" }
];

export const INITIAL_RECEIVABLES: ContaReceber[] = [
  { id: "cr-1", descricao: "Recebimento Cliente Mensalidade Glicério", valor: 150.00, clienteId: "cli-2", clienteNome: "Camila Rodrigues Silva", dataVencimento: "2026-06-05", status: "Pendente", formaRecebimento: "Crediário" },
  { id: "cr-2", descricao: "Crediário Convênio Empresa Viva", valor: 450.00, dataVencimento: "2026-06-10", status: "Pendente", formaRecebimento: "Mensalidade" },
  { id: "cr-3", descricao: "Ajuste de Cashback Convênio Pan", valor: 25.00, clienteId: "cli-4", clienteNome: "Fernanda Lima de Oliveira", dataVencimento: "2026-05-25", status: "Recebido", formaRecebimento: "Fidelidade" }
];

export const INITIAL_MOVEMENTS: MovimentacaoEstoque[] = [
  { id: "mov-1", produtoId: "prod-1", nomeProduto: "Arroz Extra Tipo 1 Integrale 5kg", tipo: "Entrada", quantidade: 50, data: "2026-05-20", motivo: "Compra de estoque (Forn: União)" },
  { id: "mov-2", produtoId: "prod-2", nomeProduto: "Feijão Carioca Especial 1kg", tipo: "Entrada", quantidade: 20, data: "2026-05-20", motivo: "Compra de estoque (Forn: União)" },
  { id: "mov-3", produtoId: "prod-3", nomeProduto: "Óleo de Soja Purificado 900ml", tipo: "Saída", quantidade: 2, data: "2026-05-26", motivo: "Venda (PDV cupom: ven-4)" },
  { id: "mov-4", produtoId: "prod-4", nomeProduto: "Banana Nanica Climatizada (kg)", tipo: "Ajuste", quantidade: -4, data: "2026-05-25", motivo: "Ajuste por descarte (frutas maduras)" }
];

export const CURRENT_USER: Usuario = {
  id: "user-active",
  nome: "Jackson Pereira",
  email: "engquimjack@gmail.com",
  regra: "Administrador",
  ativo: true
};
