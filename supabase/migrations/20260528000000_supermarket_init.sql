-- 
-- CREATE TABLE SCHEMAS FOR PARE & LEVE SUPERMARKET ENGINE
-- Migration generated on 2026-05-28
-- 

-- 1. Tab: Usuários (System & Operator Accounts)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255),
    regra VARCHAR(50) DEFAULT 'Operador' CHECK (regra IN ('Administrador', 'Gerente', 'Operador', 'Operador de Caixa')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tab: Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tab: Fornecedores (Suppliers)
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id TEXT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(25) UNIQUE NOT NULL,
    contato VARCHAR(100),
    telefone VARCHAR(25),
    email VARCHAR(150),
    endereco TEXT,
    contas_a_pagar_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tab: Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(20) UNIQUE,
    telefone VARCHAR(25),
    email VARCHAR(150),
    fidelidade_pontos INT DEFAULT 0,
    cashback_acumulado NUMERIC(10, 2) DEFAULT 0.00,
    limite_credito NUMERIC(10, 2) DEFAULT 0.00,
    historico_compras_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tab: Produtos (Central Stock Catalog)
CREATE TABLE IF NOT EXISTS public.produtos (
    id TEXT PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    quantidade INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 0,
    valor_compra NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_venda NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    validade DATE NOT NULL,
    fornecedor_id TEXT REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    foto_url TEXT,
    demanda_ia VARCHAR(20) DEFAULT 'Média' CHECK (demanda_ia IN ('Alta', 'Média', 'Baixa')),
    sugestao_compra_ia INT DEFAULT NULL,
    justificativa_ia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tab: Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
    id TEXT PRIMARY KEY,
    data TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(30) CHECK (forma_pagamento IN ('Dinheiro', 'Crédito', 'Débito', 'PIX')),
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tab: Itens da Venda (Transaction line items)
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id TEXT PRIMARY KEY,
    venda_id TEXT REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id TEXT REFERENCES public.produtos(id) ON DELETE SET NULL,
    nome_produto VARCHAR(150) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(10, 2) NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tab: Caixa Sessões (POS drawer state tracking)
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
    id TEXT PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'Fechado' CHECK (status IN ('Aberto', 'Fechado')),
    data_abertura TIMESTAMPTZ NOT NULL,
    data_fechamento TIMESTAMPTZ,
    valor_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_final NUMERIC(10, 2),
    vendas_totais INT DEFAULT 0,
    operador_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    entradas_dormidas NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tab: Movimentações do Estoque (Auditing log for stock)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id TEXT PRIMARY KEY,
    produto_id TEXT REFERENCES public.produtos(id) ON DELETE CASCADE,
    nome_produto VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada', 'Saída', 'Ajuste')),
    quantidade INT NOT NULL,
    data TIMESTAMPTZ DEFAULT NOW(),
    motivo VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tab: Contas a Pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar (
    id TEXT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    fornecedor_id TEXT REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    fornecedor_nome VARCHAR(150),
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago')),
    categoria_gasto VARCHAR(50) NOT NULL CHECK (categoria_gasto IN ('Compras', 'Energia', 'Água', 'Internet', 'Funcionários', 'Impostos', 'Limpeza', 'Outros')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tab: Contas a Receber
CREATE TABLE IF NOT EXISTS public.contas_receber (
    id TEXT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(150),
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Recebido')),
    forma_recebimento VARCHAR(30) NOT NULL CHECK (forma_recebimento IN ('Mensalidade', 'Crediário', 'Fidelidade', 'Outro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


--
-- CREATE INDEXES FOR CRITICAL QUERY FIELDS
--
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON public.movimentacoes_estoque(data);


-- DISABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES TO MATCH CLIENT-SIDE ANONYMOUS CRUD PERMISSIONS
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber DISABLE ROW LEVEL SECURITY;


--
-- SEED INITIAL CONFIGURATION & RECOVERY DATA
--

-- Initial Users (from src/initialData.ts and user-active context)
INSERT INTO public.usuarios (id, nome, email, senha, regra, ativo)
VALUES 
('user-active', 'Jackson Pereira', 'jackson@pareeleve.com.br', '123456', 'Administrador', true),
('usr-emp-1', 'Keila Sena', 'keila@pareeleve.com.br', '123456', 'Gerente', true)
ON CONFLICT (id) DO NOTHING;

-- Initial Categories
INSERT INTO public.categorias (id, nome, slug)
VALUES
('cat-1', 'Mercearia', 'mercearia'),
('cat-2', 'Hortifrúti', 'hortifruti'),
('cat-3', 'Laticínios & Frios', 'laticinios'),
('cat-4', 'Açougue', 'acougue'),
('cat-5', 'Bebidas', 'bebidas'),
('cat-6', 'Higiene & Limpeza', 'higiene-limpeza'),
('cat-7', 'Padaria', 'padaria')
ON CONFLICT (id) DO NOTHING;

-- Initial Suppliers
INSERT INTO public.fornecedores (id, nome, cnpj, contato, telefone, email, endereco, contas_a_pagar_count)
VALUES
('forn-1', 'Distribuidora de Alimentos União Ltda', '12.345.678/0001-90', 'Carlos Mendes', '(11) 98877-6655', 'comercial@uniaodistri.com.br', 'Av. Industrial, 1420 - São Paulo, SP', 2),
('forn-2', 'Hortifrúti Fazenda Verde S/A', '98.765.432/0001-10', 'Dona Maria Augusta', '(19) 97766-5544', 'fazenda@verdehorti.com', 'Rodovia SP-340, Km 120 - Mogi Mirim, SP', 1),
('forn-3', 'Mega Cervejas & Refrigerantes S/A', '45.890.123/0002-44', 'Luciano Barbosa', '(21) 99223-4411', 'pedidos@megabebibas.com', 'Rua do Porto, 450 - Rio de Janeiro, RJ', 3),
('forn-4', 'Laticínios Alvorada S/A', '05.111.222/0001-50', 'Renato Souza', '(31) 3245-6700', 'vendas@laticinioalvorada.com', 'Rodovia das Alterosas, Km 8 - Belo Horizonte, MG', 1)
ON CONFLICT (id) DO NOTHING;

-- Initial Clients
INSERT INTO public.clientes (id, nome, cpf, telefone, email, fidelidade_pontos, cashback_acumulado, limite_credito, historico_compras_count)
VALUES
('cli-1', 'Alexandre Pires', '111.222.333-44', '(11) 99888-7766', 'alexandre@gmail.com', 340, 12.50, 500.00, 12),
('cli-2', 'Camila Rodrigues Silva', '222.333.444-55', '(11) 99777-6655', 'camila.silva@outlook.com', 820, 45.90, 1000.00, 28),
('cli-3', 'Marcos Aurelio de Souza', '333.444.555-66', '(11) 99111-2233', 'marquinhos.souza@yahoo.com.br', 150, 4.20, 300.00, 5),
('cli-4', 'Fernanda Lima de Oliveira', '444.555.666-77', '(11) 98765-4321', 'fernanda.lima@gourmet.net', 1120, 89.10, 1500.00, 42)
ON CONFLICT (id) DO NOTHING;

-- Initial Products
INSERT INTO public.produtos (id, codigo_barras, nome, categoria, marca, quantidade, estoque_minimo, valor_compra, valor_venda, validade, fornecedor_id, foto_url, demanda_ia, sugestao_compra_ia, justificativa_ia)
VALUES
('prod-1', '7891000100101', 'Arroz Extra Tipo 1 Integrale 5kg', 'Mercearia', 'Prato Fino', 45, 15, 18.50, 27.90, '2027-02-15', 'forn-1', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', NULL, NULL),
('prod-2', '7891000100200', 'Feijão Carioca Especial 1kg', 'Mercearia', 'Dona Benta', 12, 15, 4.80, 7.99, '2026-11-20', 'forn-1', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', NULL, NULL),
('prod-3', '7891000100309', 'Óleo de Soja Purificado 900ml', 'Mercearia', 'Liza', 3, 20, 5.10, 8.45, '2026-09-10', 'forn-1', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Alta', 25, 'Estoque atual (3) está crítico perante as vendas mensais constantes.'),
('prod-4', '7892000200102', 'Banana Nanica Climatizada (kg)', 'Hortifrúti', 'Do Pomar', 32, 10, 2.20, 4.99, '2026-06-03', 'forn-2', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Alta', NULL, NULL),
('prod-5', '7892000200201', 'Tomate Italiano de Estufa (kg)', 'Hortifrúti', 'Do Pomar', 8, 15, 3.50, 6.80, '2026-06-02', 'forn-2', 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', 20, 'Nível atual em 8 kg, abaixo do mínimo estipulado de 15 kg para atender compras de final de semana.'),
('prod-6', '7893000300103', 'Leite Integral UHT Caixa 1L', 'Laticínios & Frios', 'Elegê', 120, 30, 2.90, 4.89, '2026-08-30', 'forn-4', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', NULL, NULL),
('prod-7', '7893000300202', 'Manteiga com Sal Pote 500g', 'Laticínios & Frios', 'Aviação', 15, 12, 14.20, 21.90, '2026-07-25', 'forn-4', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', NULL, NULL),
('prod-8', '7893000300301', 'Queijo Presunto Fatiado (Bandeja 300g)', 'Laticínios & Frios', 'Seara', 5, 15, 7.80, 13.90, '2026-06-05', 'forn-4', 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Média', 15, 'Data de validade próxima, sugerida venda em combo antes de repor em massa.'),
('prod-9', '7894000400104', 'Cerveja Lager Puro Malte Lata 350ml', 'Bebidas', 'Heineken', 240, 50, 3.10, 5.25, '2026-12-15', 'forn-3', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Alta', NULL, NULL),
('prod-10', '7894000400203', 'Refrigerante de Cola Garrafa 2L', 'Bebidas', 'Coca-Cola', 18, 24, 6.20, 9.89, '2026-10-30', 'forn-3', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Alta', 30, 'Venda de pacotes retornáveis com alta rotação recomendada.'),
('prod-11', '7895000500105', 'Sabão em Pó Alta Performance 1.6kg', 'Higiene & Limpeza', 'Omo', 22, 10, 12.40, 19.99, '2028-01-10', 'forn-1', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Baixa', NULL, NULL),
('prod-12', '7895000500204', 'Detergente Líquido Neutro 500ml', 'Higiene & Limpeza', 'Ypê', 85, 20, 1.10, 2.39, '2027-08-20', 'forn-1', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 'Baixa', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Initial Contas a Pagar (Bills payable)
INSERT INTO public.contas_pagar (id, descricao, valor, fornecedor_id, fornecedor_nome, data_vencimento, status, categoria_gasto)
VALUES
('cp-1', 'Compra de Lote Heineken 10 CX', 744.00, 'forn-3', 'Mega Cervejas & Refrigerantes S/A', '2026-06-05', 'Pendente', 'Compras'),
('cp-2', 'Reposição Hortifrúti Semanal', 450.00, 'forn-2', 'Hortifrúti Fazenda Verde S/A', '2026-06-02', 'Pago', 'Compras'),
('cp-3', 'Fatura de Energia Elétrica - Enel', 1850.20, NULL, NULL, '2026-06-10', 'Pendente', 'Energia'),
('cp-4', 'Serviço de Link Dedicado Internet', 350.00, NULL, NULL, '2026-06-08', 'Pendente', 'Internet'),
('cp-5', 'Prestador Monitoramento de Alarmes', 220.00, NULL, NULL, '2026-06-05', 'Pendente', 'Outros')
ON CONFLICT (id) DO NOTHING;

-- Initial Contas a Receber (Bills receivable)
INSERT INTO public.contas_receber (id, descricao, valor, cliente_id, cliente_nome, data_vencimento, status, forma_recebimento)
VALUES
('cr-1', 'Crediário Especial Junho', 150.00, 'cli-1', 'Alexandre Pires', '2026-06-15', 'Pendente', 'Crediário'),
('cr-2', 'Fidelidade Combo Buffet Evento', 420.00, 'cli-4', 'Fernanda Lima de Oliveira', '2026-06-20', 'Pendente', 'Fidelidade'),
('cr-3', 'Mensalidade Assinatura Clube Prime', 49.90, 'cli-2', 'Camila Rodrigues Silva', '2026-06-10', 'Recebido', 'Mensalidade'),
('cr-4', 'Mensalidade Assinatura Clube Prime', 49.90, 'cli-1', 'Alexandre Pires', '2026-06-10', 'Pendente', 'Mensalidade')
ON CONFLICT (id) DO NOTHING;
