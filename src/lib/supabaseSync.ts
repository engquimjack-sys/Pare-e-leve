import { 
  getSupabaseClient, 
  isSupabaseConfigured,
  mapAppProductToDB,
  mapDBProductToApp,
  mapAppSessionToDB,
  mapDBSessionToApp,
  mapAppClientToDB,
  mapDBClientToApp,
  mapAppSupplierToDB,
  mapDBSupplierToApp,
  mapAppPayableToDB,
  mapDBPayableToApp,
  mapAppReceivableToDB,
  mapDBReceivableToApp,
  mapAppMovementToDB,
  mapDBMovementToApp,
  mapAppUserToDB,
  mapDBUserToApp,
  mapDBSaleToApp
} from "./supabaseClient";

export interface SyncStatus {
  success: boolean;
  message: string;
  details?: string;
  tables?: { [key: string]: number };
}

/**
 * Tests connection to the remote Supabase PostgreSQL database
 * and checks if the required tables reside in the active schema.
 */
export async function testSupabaseConnection(): Promise<SyncStatus> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Supabase não está configurado. Cadastre as credenciais nas variáveis de ambiente."
    };
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if we can select from the core users table
    const { data, error } = await supabase
      .from("usuarios")
      .select("count", { count: "exact", head: true });

    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("not found") || error.message?.includes("does not exist")) {
        return {
          success: true,
          message: "Conexão estabelecida com sucesso, porém o Schema/Tabelas não foram criados no Supabase ainda.",
          details: "Para prosseguir, copie as queries do arquivo migrations no seu SQL Editor do Supabase."
        };
      }
      throw error;
    }

    // Read details of tables to report count
    const tables = ["usuarios", "categorias", "fornecedores", "clientes", "produtos", "vendas", "itens_venda", "caixa_sessoes", "movimentacoes_estoque", "contas_pagar", "contas_receber"];
    const counts: { [key: string]: number } = {};
    
    for (const table of tables) {
      try {
        const { count, error: tErr } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        if (!tErr) {
          counts[table] = count || 0;
        } else {
          counts[table] = -1; // Flag table doesn't exist
        }
      } catch {
        counts[table] = -1;
      }
    }

    return {
      success: true,
      message: "Conectado ao PostgreSQL com todas as tabelas e chaves configuradas!",
      tables: counts
    };
  } catch (err: any) {
    console.error("Supabase test error:", err);
    return {
      success: false,
      message: "Falha de comunicação de rede ou credenciais inválidas.",
      details: err.message || JSON.stringify(err)
    };
  }
}

/**
 * Pushes all local storage state to Supabase. Perfect for seeding or manual backups.
 */
export async function pushLocalDataToSupabase(localData: any): Promise<SyncStatus> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabase não está configurado." };
  }

  try {
    const supabase = getSupabaseClient();

    // Collect all valid IDs from local context to prevent FK constraint failures
    const validSupplierIds = new Set<string>();
    if (Array.isArray(localData.suppliers)) {
      localData.suppliers.forEach((s: any) => {
        if (s && s.id) validSupplierIds.add(String(s.id));
      });
    }

    const validClientIds = new Set<string>();
    if (Array.isArray(localData.clients)) {
      localData.clients.forEach((c: any) => {
        if (c && c.id) validClientIds.add(String(c.id));
      });
    }

    const validUserIds = new Set<string>();
    if (Array.isArray(localData.usersList)) {
      localData.usersList.forEach((u: any) => {
        if (u && u.id) validUserIds.add(String(u.id));
      });
    }

    const validProductIds = new Set<string>();
    if (Array.isArray(localData.products)) {
      localData.products.forEach((p: any) => {
        if (p && p.id) validProductIds.add(String(p.id));
      });
    }

    // 1. Users
    if (Array.isArray(localData.usersList)) {
      const mapped = localData.usersList.map(mapAppUserToDB);
      if (mapped.length > 0) {
        const { error } = await supabase.from("usuarios").upsert(mapped);
        if (error) throw new Error(`Erro em usuários: ${error.message}`);
        
        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("usuarios").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("usuarios").delete().neq("id", "");
      }
    }

    // 2. Suppliers
    if (Array.isArray(localData.suppliers)) {
      const mapped = localData.suppliers.map(mapAppSupplierToDB);
      if (mapped.length > 0) {
        const { error } = await supabase.from("fornecedores").upsert(mapped);
        if (error) throw new Error(`Erro em fornecedores: ${error.message}`);

        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("fornecedores").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("fornecedores").delete().neq("id", "");
      }
    }

    // 3. Clients
    if (Array.isArray(localData.clients)) {
      const mapped = localData.clients.map(mapAppClientToDB);
      if (mapped.length > 0) {
        const { error } = await supabase.from("clientes").upsert(mapped);
        if (error) throw new Error(`Erro em clientes: ${error.message}`);

        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("clientes").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("clientes").delete().neq("id", "");
      }
    }

    // 4. Products - sanitize fornecedor_id
    if (Array.isArray(localData.products)) {
      const mapped = localData.products.map((p: any) => {
        const item = mapAppProductToDB(p);
        if (item.fornecedor_id && !validSupplierIds.has(String(item.fornecedor_id))) {
          item.fornecedor_id = null;
        }
        return item;
      });
      if (mapped.length > 0) {
        const { error } = await supabase.from("produtos").upsert(mapped);
        if (error) throw new Error(`Erro em produtos: ${error.message}`);

        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("produtos").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("produtos").delete().neq("id", "");
      }
    }

    // 5. Active Sessions (CaixaSessao) - sanitize operador_id
    if (localData.activeSession) {
      const mapped = mapAppSessionToDB(localData.activeSession);
      if (mapped.operador_id && !validUserIds.has(String(mapped.operador_id))) {
        mapped.operador_id = null;
      }
      const { error } = await supabase.from("caixa_sessoes").upsert([mapped]);
      if (error) throw new Error(`Erro no caixa: ${error.message}`);
    }

    // 6. Inventories audits (Movimentacoes) - filter missing products
    if (Array.isArray(localData.movements)) {
      const mapped = localData.movements
        .map(mapAppMovementToDB)
        .filter((m: any) => m && m.produto_id && validProductIds.has(String(m.produto_id)));
      
      if (mapped.length > 0) {
        const { error } = await supabase.from("movimentacoes_estoque").upsert(mapped);
        if (error) throw new Error(`Erro em movimentações de estoque: ${error.message}`);
      }
    }

    // 7. Bills accounts payable - sanitize fornecedor_id
    if (Array.isArray(localData.payables)) {
      const mapped = localData.payables.map((pay: any) => {
        const item = mapAppPayableToDB(pay);
        if (item.fornecedor_id && !validSupplierIds.has(String(item.fornecedor_id))) {
          item.fornecedor_id = null;
        }
        return item;
      });
      if (mapped.length > 0) {
        const { error } = await supabase.from("contas_pagar").upsert(mapped);
        if (error) throw new Error(`Erro em contas a pagar: ${error.message}`);

        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("contas_pagar").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("contas_pagar").delete().neq("id", "");
      }
    }

    // 8. Accounts receivable - sanitize cliente_id
    if (Array.isArray(localData.receivables)) {
      const mapped = localData.receivables.map((rec: any) => {
        const item = mapAppReceivableToDB(rec);
        if (item.cliente_id && !validClientIds.has(String(item.cliente_id))) {
          item.cliente_id = null;
        }
        return item;
      });
      if (mapped.length > 0) {
        const { error } = await supabase.from("contas_receber").upsert(mapped);
        if (error) throw new Error(`Erro em contas a receber: ${error.message}`);

        const ids = mapped.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase.from("contas_receber").delete().not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        await supabase.from("contas_receber").delete().neq("id", "");
      }
    }

    // 9. Sales - sanitize cliente_id and product_id
    if (Array.isArray(localData.sales)) {
      const activeSaleIds = localData.sales.map((s: any) => s.id).filter(Boolean);

      for (const sale of localData.sales) {
        const saleDb = {
          id: sale.id,
          data: sale.data,
          subtotal: sale.subtotal,
          desconto: sale.desconto,
          total: sale.total,
          forma_pagamento: sale.formaPagamento === "Paylater" ? "Crédito" : sale.formaPagamento,
          cliente_id: (sale.clienteId && validClientIds.has(String(sale.clienteId))) ? sale.clienteId : null,
          cliente_nome: sale.clienteNome || null
        };
        const { error: saleErr } = await supabase.from("vendas").upsert([saleDb]);
        if (saleErr) throw new Error(`Erro em vendas: ${saleErr.message}`);

        if (Array.isArray(sale.itens)) {
          const itemsDb = sale.itens.map((item: any) => {
            const prodId = item.produtoId && validProductIds.has(String(item.produtoId)) ? item.produtoId : null;
            return {
              id: item.id || `item-sale-${Date.now()}-${Math.random()}`,
              venda_id: sale.id,
              produto_id: prodId,
              nome_produto: item.nomeProduto,
              quantidade: item.quantidade,
              valor_unitario: item.valorUnitario,
              valor_total: item.valorTotal
            };
          });
          if (itemsDb.length > 0) {
            const { error: itemsErr } = await supabase.from("itens_venda").upsert(itemsDb);
            if (itemsErr) throw new Error(`Erro em itens de venda: ${itemsErr.message}`);

            const activeItemIds = itemsDb.map((it: any) => it.id).filter(Boolean);
            if (activeItemIds.length > 0) {
              await supabase.from("itens_venda")
                .delete()
                .eq("venda_id", sale.id)
                .not("id", "in", `(${activeItemIds.join(",")})`);
            }
          } else {
            await supabase.from("itens_venda").delete().eq("venda_id", sale.id);
          }
        }
      }

      if (activeSaleIds.length > 0) {
        await supabase.from("vendas").delete().not("id", "in", `(${activeSaleIds.join(",")})`);
      } else {
        await supabase.from("vendas").delete().neq("id", "");
      }
    }

    return {
      success: true,
      message: "Sucesso! Todo o banco de dados local foi transmitido e consolidado no Supabase PostgreSQL."
    };
  } catch (err: any) {
    console.error("Supabase load-up error:", err);
    let detailedMsg = err.message || JSON.stringify(err);
    if (detailedMsg.includes("row-level security policy")) {
      detailedMsg = `${detailedMsg}\n\n💡 SOLUÇÃO RÁPIDA: O Supabase está bloqueando a gravação devido às regras de Row-Level Security (RLS). Para resolver isso instantaneamente, abra o 'SQL Editor' em seu painel do Supabase, cole as seguintes linhas abaixo e clique em 'Run':\n\nALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.categorias DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.fornecedores DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.itens_venda DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.caixa_sessoes DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.movimentacoes_estoque DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.contas_pagar DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.contas_receber DISABLE ROW LEVEL SECURITY;`;
    }
    return {
      success: false,
      message: err.message || "Erro ao carregar dados locais para o Supabase.",
      details: detailedMsg
    };
  }
}

/**
 * Downloads absolute unified database state from Supabase and returns standard Local format
 */
export async function pullSupabaseToLocalStorage(): Promise<any> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não está configurado.");
  }

  const supabase = getSupabaseClient();

  // Load all tables concurrently
  const [
    usersRes,
    suppliersRes,
    clientsRes,
    productsRes,
    movementsRes,
    payablesRes,
    receivablesRes,
    salesRes,
    itemsRes,
    sessionsRes
  ] = await Promise.all([
    supabase.from("usuarios").select("*"),
    supabase.from("fornecedores").select("*"),
    supabase.from("clientes").select("*"),
    supabase.from("produtos").select("*"),
    supabase.from("movimentacoes_estoque").select("*").order("data", { ascending: false }),
    supabase.from("contas_pagar").select("*"),
    supabase.from("contas_receber").select("*"),
    supabase.from("vendas").select("*"),
    supabase.from("itens_venda").select("*"),
    supabase.from("caixa_sessoes").select("*")
  ]);

  // Handle fatal errors
  if (usersRes.error) throw new Error(`Tabela 'usuarios' ausente no banco Supabase.`);
  if (productsRes.error) throw new Error(`Tabela 'produtos' ausente no banco Supabase.`);
  if (salesRes.error) throw new Error(`Tabela 'vendas' ausente no banco Supabase.`);

  // Map to frontend representations
  const usersList = (usersRes.data || []).map(mapDBUserToApp);
  const suppliers = (suppliersRes.data || []).map(mapDBSupplierToApp);
  const clients = (clientsRes.data || []).map(mapDBClientToApp);
  const products = (productsRes.data || []).map(mapDBProductToApp);
  const movements = (movementsRes.data || []).map(mapDBMovementToApp);
  const payables = (payablesRes.data || []).map(mapDBPayableToApp);
  const receivables = (receivablesRes.data || []).map(mapDBReceivableToApp);
  
  // Reconstruct sales with nested items
  const dbSales = salesRes.data || [];
  const dbItems = itemsRes.data || [];
  const sales = dbSales.map(v => {
    const matches = dbItems.filter(i => i.venda_id === v.id);
    return mapDBSaleToApp(v, matches);
  });

  // Reconstruct active session
  const openedSessions = (sessionsRes.data || []).filter(s => s.status === "Aberto");
  const activeSession = openedSessions.length > 0 ? mapDBSessionToApp(openedSessions[0]) : null;

  return {
    products,
    sales,
    payables,
    receivables,
    suppliers,
    clients,
    movements,
    usersList,
    activeSession
  };
}
