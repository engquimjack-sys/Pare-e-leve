/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Boxes,
  Briefcase,
  Users,
  PieChart as PieIcon,
  Settings as SettingsIcon,
  ShoppingCart,
  LogOut,
  Bell,
  Menu,
  ChevronRight,
  User,
  Activity,
  Award
} from "lucide-react";

// Types
import {
  Produto,
  Venda,
  ItemVenda,
  ContaPagar,
  ContaReceber,
  Fornecedor,
  Cliente,
  Usuario,
  CaixaSessao,
  MovimentacaoEstoque
} from "./types";

// Initial seed data
import {
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CLIENTS,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_PAYABLES,
  INITIAL_RECEIVABLES,
  INITIAL_MOVEMENTS,
  CURRENT_USER
} from "./initialData";

// Components
import LoginView from "./components/LoginView";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { pushLocalDataToSupabase, pullSupabaseToLocalStorage } from "./lib/supabaseSync";
import DashboardView from "./components/DashboardView";
import StockView from "./components/StockView";
import PDVView from "./components/PDVView";
import FinancialView from "./components/FinancialView";
import PeopleView from "./components/PeopleView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import SidebarCalculator from "./components/SidebarCalculator";

const STORAGE_KEY = "pare_leve_supermarket_v1";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "estoque" | "financeiro" | "pdv" | "pessoas" | "relatorios" | "configuracoes">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Controlled Stock Tab filters for linking when clicking notifications
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [stockFilterLow, setStockFilterLow] = useState(false);
  const [stockFilterExpiring, setStockFilterExpiring] = useState(false);

  // Live Toast Notifications queue system
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "warning" | "error" | "info"; title: string; message: string }[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const addToast = (title: string, message: string, type: "success" | "warning" | "error" | "info" = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Core ERP Tables state
  const [products, setProducts] = useState<Produto[]>([]);
  const [sales, setSales] = useState<Venda[]>([]);
  const [payables, setPayables] = useState<ContaPagar[]>([]);
  const [receivables, setReceivables] = useState<ContaReceber[]>([]);
  const [suppliers, setSuppliers] = useState<Fornecedor[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [movements, setMovements] = useState<MovimentacaoEstoque[]>([]);
  const [usersList, setUsersList] = useState<Usuario[]>([]);
  const [activeSession, setActiveSession] = useState<CaixaSessao | null>(null);

  // Load from local storage or seed
  useEffect(() => {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        setProducts(parsed.products || []);
        setSales(parsed.sales || []);
        setPayables(parsed.payables || []);
        setReceivables(parsed.receivables || []);
        setSuppliers(parsed.suppliers || []);
        setClients(parsed.clients || []);
        setMovements(parsed.movements || []);
        
        let loadedUsers = (parsed.usersList || []) as Usuario[];
        loadedUsers = loadedUsers.map((u) => {
          if (u.id === "usr-emp-1" || u.nome === "Camila Rodrigues") {
            return { ...u, id: "usr-emp-1", nome: "Keila Sena", email: "keila@pareeleve.com.br", regra: "Gerente" as const };
          }
          if (u.id === "user-active" || u.nome === "Jackson Q. Oliveira") {
            return { ...u, id: "user-active", nome: "Jackson Pereira", regra: "Administrador" as const };
          }
          return u;
        });
        setUsersList(loadedUsers);
        
        setActiveSession(parsed.activeSession || null);
        if (parsed.currentUser) {
          let updatedCurrentUser = parsed.currentUser as Usuario;
          if (updatedCurrentUser.id === "usr-emp-1" || updatedCurrentUser.nome === "Camila Rodrigues") {
            updatedCurrentUser = { ...updatedCurrentUser, id: "usr-emp-1", nome: "Keila Sena", email: "keila@pareeleve.com.br", regra: "Gerente" as const };
          }
          if (updatedCurrentUser.id === "user-active" || updatedCurrentUser.nome === "Jackson Q. Oliveira") {
            updatedCurrentUser = { ...updatedCurrentUser, id: "user-active", nome: "Jackson Pereira", regra: "Administrador" as const };
          }
          setCurrentUser(updatedCurrentUser);
        }
      } catch (err) {
        console.error("Failed to parse storage, loading seed:", err);
        loadDefaultSeed();
      }
    } else {
      loadDefaultSeed();
    }
  }, []);

  // Compute critical stock alerts dynamically
  const criticalStockAlerts = React.useMemo(() => {
    return products
      .filter((p) => p.quantidade <= p.estoqueMinimo)
      .map((p) => {
        const percent = p.quantidade === 0 ? 0 : Math.round((p.quantidade / p.estoqueMinimo) * 100);
        return {
          id: `stock-${p.id}`,
          produtoId: p.id,
          nome: p.nome,
          tipo: "estoque" as const,
          titulo: p.quantidade === 0 ? "⚠️ Estoque ESGOTADO" : "⚠️ Estoque Crítico",
          mensagem: p.quantidade === 0 
            ? `O item "${p.nome}" esgotou completamente!` 
            : `Apenas ${p.quantidade} un. disponíveis de "${p.nome}" (mínimo de segurança: ${p.estoqueMinimo} un.).`,
          nivel: p.quantidade === 0 ? "grave" as const : "alerta" as const,
          valorAtual: p.quantidade,
          valorMinimo: p.estoqueMinimo,
          percent
        };
      });
  }, [products]);

  // Compute near expiration or expired products dynamically
  const expirationAlerts = React.useMemo(() => {
    const today = new Date("2026-05-27");
    return products
      .map((p) => {
        const expDate = new Date(p.validade);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { p, diffDays };
      })
      .filter(({ diffDays }) => diffDays <= 30) // Expiring in 30 days or less, or already expired
      .map(({ p, diffDays }) => {
        const isExpired = diffDays < 0;
        const formattedValid = new Date(p.validade).toLocaleDateString("pt-BR");
        return {
          id: `val-${p.id}`,
          produtoId: p.id,
          nome: p.nome,
          tipo: "validade" as const,
          titulo: isExpired ? "🚨 Produto VENCIDO" : "⏰ Vencendo em Breve",
          mensagem: isExpired
            ? `Lote de "${p.nome}" está cadastrado como VENCIDO desde ${formattedValid}. Retire do estoque!`
            : `Lote de "${p.nome}" vence em ${diffDays} dias (${formattedValid}). Planeje promoção ou queima de estoque.`,
          nivel: isExpired ? "vencido" as const : diffDays <= 7 ? "grave" as const : "alerta" as const,
          diffDays,
          validade: p.validade
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [products]);

  // Total active alerts count
  const activeAlertsCount = criticalStockAlerts.length + expirationAlerts.length;

  // Startup toast reporting active warning states
  useEffect(() => {
    if (currentUser && products.length > 0) {
      const today = new Date("2026-05-27");
      const expiredCount = products.filter(p => new Date(p.validade).getTime() < today.getTime()).length;
      const nearExpCount = products.filter(p => {
        const diff = new Date(p.validade).getTime() - today.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 15;
      }).length;
      const criticalCount = products.filter(p => p.quantidade <= p.estoqueMinimo).length;

      if (expiredCount > 0 || nearExpCount > 0 || criticalCount > 0) {
        const timer = setTimeout(() => {
          addToast(
            "📍 Alertas do Painel Gerencial",
            `Encontrados: ${criticalCount} produtos abaixo do estoque mínimo, ${expiredCount} vencidos e ${nearExpCount} vencendo nos próximos 15 dias. Clique no sino de notificações para auditar.`,
            expiredCount > 0 ? "error" : "warning"
          );
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Supabase background pull state and handlers
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);

  const handlePullFromSupabase = async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, message: "Supabase não está configurado. Insira as chaves nas variáveis de ambiente." };
    }
    setSupabaseSyncing(true);
    try {
      const data = await pullSupabaseToLocalStorage();
      if (!data) throw new Error("Erro ao compilar resposta do Supabase PostgreSQL.");

      // Manual pull empty-database safety guard
      const isRemoteEmpty = !data.products || data.products.length === 0;
      if (isRemoteEmpty) {
        throw new Error("O seu banco de dados remoto Supabase está vazio de produtos. Use a opção 'Enviar para Nuvem (Push)' antes de fazer o 'Pull' para carregar a nuvem com os produtos locais e evitar perda de tela.");
      }

      setProducts(data.products);
      setSales(data.sales);
      setPayables(data.payables);
      setReceivables(data.receivables);
      setSuppliers(data.suppliers);
      setClients(data.clients);
      setMovements(data.movements);
      setUsersList(data.usersList);
      setActiveSession(data.activeSession);

      // Save to localStorage so offline cache is synchronous
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      addToast("Sucesso", "Dados importados do Supabase e sincronizados com sucesso!", "success");
      return { success: true, message: "Baixado com sucesso!" };
    } catch (err: any) {
      console.error(err);
      addToast("Erro", err.message || "Erro desconhecido.", "error");
      return { success: false, message: err.message || "Erro desconhecido.", details: err.message || "Erro desconhecido." };
    } finally {
      setSupabaseSyncing(false);
    }
  };

  const handlePushToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, message: "Supabase não está configurado." };
    }
    setSupabaseSyncing(true);
    try {
      const stateObject = {
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
      const res = await pushLocalDataToSupabase(stateObject);
      if (res.success) {
        addToast("Sincronização", "Dados de LocalStorage enviados para o Supabase PostgreSQL!", "success");
      } else {
        addToast("Erro de Sincronização", res.message, "error");
      }
      return res;
    } catch (err: any) {
      console.error(err);
      addToast("Erro Supabase", err.message || "Erro ao conectar.", "error");
      return { success: false, message: err.message || "Erro de rede" };
    } finally {
      setSupabaseSyncing(false);
    }
  };

  // Safe soft auto-pull on launch if Supabase configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const softSyncStart = async () => {
        try {
          const res = await pullSupabaseToLocalStorage();
          if (res) {
            // Guard: If the remote database has no products, it is considered empty (e.g. newly created schema)
            const isRemoteEmpty = !res.products || res.products.length === 0;
            
            if (isRemoteEmpty) {
              console.log("Banco de dados do Supabase está conectado mas vazio. Analisando dados locais para semeadura...");
              const localRaw = localStorage.getItem(STORAGE_KEY);
              if (localRaw) {
                const parsed = JSON.parse(localRaw);
                const hasLocalData = parsed.products && parsed.products.length > 0;
                
                if (hasLocalData) {
                  console.log("Semeando banco de dados vazio do Supabase com o estado local ativo...");
                  addToast("Sincronização Inicial", "Detectamos que o seu Supabase está sem produtos. Sincronizando dados locais para a nuvem de forma segura...", "info");
                  
                  // Push local data to Supabase
                  const pushRes = await pushLocalDataToSupabase(parsed);
                  if (pushRes.success) {
                    addToast("Sincronização Nuvem", "Dados locais importados e salvos na nuvem do Supabase PostgreSQL com sucesso!", "success");
                  } else {
                    console.error("Falha ao semear banco remote:", pushRes.message);
                    addToast("Erro no Envio para Nuvem", pushRes.message + (pushRes.details ? ` \n\n${pushRes.details}` : ""), "error");
                  }
                  return;
                }
              }
              return;
            }

            // If the remote database has real data, proceed to load it and keep local copy updated
            setProducts(res.products);
            setSales(res.sales);
            setPayables(res.payables);
            setReceivables(res.receivables);
            setSuppliers(res.suppliers);
            setClients(res.clients);
            setMovements(res.movements);
            setUsersList(res.usersList);
            setActiveSession(res.activeSession);

            // Keep offline cache synchronized
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
            addToast("Sincronização Nuvem", "Conectado ao Supabase PostgreSQL! Dados atualizados gerados em tempo real.", "success");
          }
        } catch (err: any) {
          console.log("Supabase softSync auto start skipped (using LocalStorage fallback):", err.message);
        }
      };
      softSyncStart();
    }
  }, []);

  // Save changes to local storage helper
  const saveToStorage = (updates: {
    products?: Produto[];
    sales?: Venda[];
    payables?: ContaPagar[];
    receivables?: ContaReceber[];
    suppliers?: Fornecedor[];
    clients?: Cliente[];
    movements?: MovimentacaoEstoque[];
    usersList?: Usuario[];
    activeSession?: CaixaSessao | null;
    currentUser?: Usuario | null;
  }) => {
    // Merge with current state
    const currentSerialized = {
      products: updates.products !== undefined ? updates.products : products,
      sales: updates.sales !== undefined ? updates.sales : sales,
      payables: updates.payables !== undefined ? updates.payables : payables,
      receivables: updates.receivables !== undefined ? updates.receivables : receivables,
      suppliers: updates.suppliers !== undefined ? updates.suppliers : suppliers,
      clients: updates.clients !== undefined ? updates.clients : clients,
      movements: updates.movements !== undefined ? updates.movements : movements,
      usersList: updates.usersList !== undefined ? updates.usersList : usersList,
      activeSession: updates.activeSession !== undefined ? updates.activeSession : activeSession,
      currentUser: updates.currentUser !== undefined ? updates.currentUser : currentUser
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSerialized));

    // Async background sync with Supabase if connection exists
    if (isSupabaseConfigured()) {
      pushLocalDataToSupabase(currentSerialized).catch((err) => {
        console.error("Supabase live background sync error:", err);
      });
    }
  };

  const loadDefaultSeed = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setPayables(INITIAL_PAYABLES);
    setReceivables(INITIAL_RECEIVABLES);
    setSuppliers(INITIAL_SUPPLIERS);
    setClients(INITIAL_CLIENTS);
    setMovements(INITIAL_MOVEMENTS);
    setUsersList([CURRENT_USER, { id: "usr-emp-1", nome: "Keila Sena", email: "keila@pareeleve.com.br", regra: "Gerente", ativo: true }]);
    setActiveSession(null);

    // Save initial seed structure
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: INITIAL_PRODUCTS,
      sales: INITIAL_SALES,
      payables: INITIAL_PAYABLES,
      receivables: INITIAL_RECEIVABLES,
      suppliers: INITIAL_SUPPLIERS,
      clients: INITIAL_CLIENTS,
      movements: INITIAL_MOVEMENTS,
      usersList: [CURRENT_USER, { id: "usr-emp-1", nome: "Keila Sena", email: "keila@pareeleve.com.br", regra: "Gerente", ativo: true }],
      activeSession: null,
      currentUser: null
    }));
  };

  // State mutations actions passed down to children
  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    if (user.regra === "Operador" || user.regra === "Operador de Caixa") {
      setActiveTab("pdv");
    }
    saveToStorage({ currentUser: user });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("dashboard");
    saveToStorage({ currentUser: null });
  };

  useEffect(() => {
    if (currentUser) {
      const isOperatorUser = currentUser.regra === "Operador" || currentUser.regra === "Operador de Caixa";
      if (isOperatorUser && activeTab !== "pdv") {
        setActiveTab("pdv");
      }
    }
  }, [currentUser, activeTab]);

  // 1. ADD / EDIT / DELETE Products (Estoque)
  const handleAddProduct = (newProd: Omit<Produto, "id">) => {
    const prod: Produto = {
      ...newProd,
      id: `prod-${Date.now()}`
    };
    const updated = [prod, ...products];
    setProducts(updated);

    // Track movement logic
    const mov: MovimentacaoEstoque = {
      id: `mov-${Date.now()}`,
      produtoId: prod.id,
      nomeProduto: prod.nome,
      tipo: "Entrada",
      quantidade: prod.quantidade,
      data: new Date().toISOString().split("T")[0],
      motivo: "Cadastro de estoque inicial"
    };
    const updatedMovs = [mov, ...movements];
    setMovements(updatedMovs);

    saveToStorage({ products: updated, movements: updatedMovs });
  };

  const handleEditProduct = (editedProd: Produto) => {
    const updated = products.map((p) => (p.id === editedProd.id ? editedProd : p));
    setProducts(updated);
    saveToStorage({ products: updated });
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveToStorage({ products: updated });
  };

  const handleAdjustStock = (productId: string, amount: number, tipo: "Entrada" | "Saída" | "Ajuste", motivo: string) => {
    const pIndex = products.findIndex((p) => p.id === productId);
    if (pIndex === -1) return;

    const prod = products[pIndex];
    const updatedProds = [...products];
    const newQty = Math.max(0, prod.quantidade + amount);

    if (newQty <= prod.estoqueMinimo && prod.quantidade > prod.estoqueMinimo) {
      addToast(
        "⚠️ Estoque Crítico Reduzido",
        `Alerta: "${prod.nome}" entrou em nível crítico (${newQty} un. em estoque, mínimo recomendado: ${prod.estoqueMinimo}).`,
        "error"
      );
    } else if (newQty > prod.estoqueMinimo && prod.quantidade <= prod.estoqueMinimo) {
      addToast(
        "🎉 Estoque Regularizado",
        `Sucesso: Estoque de "${prod.nome}" foi regularizado para ${newQty} un.`,
        "success"
      );
    }

    updatedProds[pIndex] = {
      ...prod,
      quantidade: newQty
    };
    setProducts(updatedProds);

    const mov: MovimentacaoEstoque = {
      id: `mov-${Date.now()}`,
      produtoId: prod.id,
      nomeProduto: prod.nome,
      tipo,
      quantidade: amount,
      data: new Date().toISOString().split("T")[0],
      motivo
    };
    const updatedMovs = [mov, ...movements];
    setMovements(updatedMovs);

    saveToStorage({ products: updatedProds, movements: updatedMovs });
  };

  // 2. CASH DRAWER / POS SESSION CONTROLS (PDV)
  const handleOpenSession = (valorInicial: number) => {
    const sessao: CaixaSessao = {
      id: `sessao-${Date.now()}`,
      status: "Aberto",
      dataAbertura: new Date().toISOString(),
      valorInicial,
      vendasTotais: 0,
      operadorId: currentUser?.id || "user-active",
      entradasDormidas: 0
    };
    setActiveSession(sessao);
    saveToStorage({ activeSession: sessao });
  };

  const handleCloseSession = () => {
    if (!activeSession) return;
    const finalVal = activeSession.valorInicial + activeSession.entradasDormidas;
    const fechado: CaixaSessao = {
      ...activeSession,
      status: "Fechado",
      dataFechamento: new Date().toISOString(),
      valorFinal: finalVal
    };

    setActiveSession(null);
    saveToStorage({ activeSession: null });
    alert(`Expediente encerrado!\nFundo inicial: R$ ${activeSession.valorInicial}\nFaturamento do Turno: R$ ${activeSession.entradasDormidas}\nTotal em Caixa de fechamento: R$ ${finalVal}`);
  };

  // Complete a Checkout of PDV
  const handleCommitVenda = (vendaNoId: Omit<Venda, "id">) => {
    const vendaId = `ven-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    const venda: Venda = {
      ...vendaNoId,
      id: vendaId
    };

    // 1. Add to sales list
    const updatedSales = [venda, ...sales];
    setSales(updatedSales);

    // 2. Subtract quantities from active products and alert if critical stock is reached
    venda.itens.forEach((it) => {
      const originalProd = products.find((p) => p.id === it.produtoId);
      if (originalProd) {
        const nextQty = Math.max(0, originalProd.quantidade - it.quantidade);
        if (nextQty <= originalProd.estoqueMinimo && originalProd.quantidade > originalProd.estoqueMinimo) {
          addToast(
            "⚠️ Estoque Crítico Atingido",
            `Atenção: O produto "${originalProd.nome}" atingiu o estoque mínimo de segurança! Restam apenas ${nextQty} unidades.`,
            "error"
          );
        }
      }
    });

    const updatedProducts = products.map((prod) => {
      const soldItem = venda.itens.find((it) => it.produtoId === prod.id);
      if (soldItem) {
        return {
          ...prod,
          quantidade: Math.max(0, prod.quantidade - soldItem.quantidade)
        };
      }
      return prod;
    });
    setProducts(updatedProducts);

    // 3. Track stock movements for each item
    let nextMovs = [...movements];
    venda.itens.forEach((it) => {
      const mov: MovimentacaoEstoque = {
        id: `mov-${it.produtoId}-${Date.now()}`,
        produtoId: it.produtoId,
        nomeProduto: it.nomeProduto,
        tipo: "Saída",
        quantidade: -it.quantidade,
        data: new Date().toISOString().split("T")[0],
        motivo: `Venda cupom PDV: ${vendaId}`
      };
      nextMovs = [mov, ...nextMovs];
    });
    setMovements(nextMovs);

    // 4. Update fidelity points/cashback of connected client
    let updatedClients = [...clients];
    if (venda.clienteId) {
      const cIndex = clients.findIndex((c) => c.id === venda.clienteId);
      if (cIndex > -1) {
        const cli = clients[cIndex];
        const pointGained = Math.floor(venda.total / 10);
        const cashbackGained = parseFloat((venda.total * 0.05).toFixed(2)); // 5% cashback reward
        updatedClients[cIndex] = {
          ...cli,
          fidelidadePontos: cli.fidelidadePontos + pointGained,
          cashbackAcumulado: cli.cashbackAcumulado + cashbackGained,
          historicoComprasCount: cli.historicoComprasCount + 1
        };
        setClients(updatedClients);
      }
    }

    // 5. If PIX/Card, add to Receivables list immediately as "Recebido", if cash then goes to drawer and updates cash drawer
    let nextReceivables = [...receivables];
    let nextPayables = [...payables];
    let nextSession = activeSession ? { ...activeSession } : null;

    if (venda.formaPagamento === "Dinheiro" && nextSession) {
      nextSession.entradasDormidas = parseFloat((nextSession.entradasDormidas + venda.total).toFixed(2));
      nextSession.vendasTotais += 1;
      setActiveSession(nextSession);
    } else {
      if (nextSession) {
        nextSession.vendasTotais += 1;
        setActiveSession(nextSession);
      }
      // Add a receivable marked as already received immediately or pending for paylater
      const rec: ContaReceber = {
        id: `cr-${Date.now()}`,
        descricao: venda.formaPagamento === "Paylater" ? `Venda a Prazo (Paylater) Cupom: ${vendaId}` : `Venda PDV faturamento: ${vendaId}`,
        valor: venda.total,
        clienteId: venda.clienteId,
        clienteNome: venda.clienteNome || "Consumidor Avulso",
        dataVencimento: venda.formaPagamento === "Paylater" ? (venda.paylaterDueDate || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
        status: venda.formaPagamento === "Paylater" ? "Pendente" : "Recebido",
        formaRecebimento: "Crediário",
        dataCompra: venda.formaPagamento === "Paylater" ? (venda.paylaterPurchaseDate || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
        itens: venda.itens
      };
      nextReceivables = [rec, ...nextReceivables];
      setReceivables(nextReceivables);
    }

    saveToStorage({
      sales: updatedSales,
      products: updatedProducts,
      movements: nextMovs,
      clients: updatedClients,
      activeSession: nextSession,
      receivables: nextReceivables
    });
  };

  // 3. FINANCIAL INTERACTIONS (Pagar / Receber)
  const handleAddPayable = (item: Omit<ContaPagar, "id">) => {
    const np: ContaPagar = {
      ...item,
      id: `cp-${Date.now()}`
    };
    const updated = [np, ...payables];
    setPayables(updated);
    saveToStorage({ payables: updated });
  };

  const handleAddReceivable = (item: Omit<ContaReceber, "id">) => {
    const nr: ContaReceber = {
      ...item,
      id: `cr-${Date.now()}`
    };
    const updated = [nr, ...receivables];
    setReceivables(updated);
    saveToStorage({ receivables: updated });
  };

  const handlePayBill = (id: string) => {
    const updated = payables.map((p) => (p.id === id ? { ...p, status: "Pago" as const } : p));
    setPayables(updated);
    saveToStorage({ payables: updated });
  };

  const handleReceiveBill = (id: string) => {
    const updated = receivables.map((r) => (r.id === id ? { ...r, status: "Recebido" as const } : r));
    setReceivables(updated);
    saveToStorage({ receivables: updated });
  };

  // 4. PEOPLE INTERACTIONS (Clientes & Fornecedores)
  const handleAddClient = (client: Omit<Cliente, "id">) => {
    const nc: Cliente = {
      ...client,
      id: `cli-${Date.now()}`
    };
    const updated = [nc, ...clients];
    setClients(updated);
    saveToStorage({ clients: updated });
  };

  const handleDeleteClient = (id: string) => {
    const updated = clients.filter((c) => c.id !== id);
    setClients(updated);
    saveToStorage({ clients: updated });
  };

  const handleUpdateClient = (id: string, updatedCli: Cliente) => {
    const updated = clients.map((c) => (c.id === id ? updatedCli : c));
    setClients(updated);
    saveToStorage({ clients: updated });
  };

  const handleAddSupplier = (supplier: Omit<Fornecedor, "id">) => {
    const ns: Fornecedor = {
      ...supplier,
      id: `forn-${Date.now()}`
    };
    const updated = [ns, ...suppliers];
    setSuppliers(updated);
    saveToStorage({ suppliers: updated });
  };

  const handleDeleteSupplier = (id: string) => {
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    saveToStorage({ suppliers: updated });
  };

  const handleUpdateSupplier = (id: string, updatedSup: Fornecedor) => {
    const updated = suppliers.map((s) => (s.id === id ? updatedSup : s));
    setSuppliers(updated);
    saveToStorage({ suppliers: updated });
  };

  // 5. SETTINGS PEOPLE INJECTORS
  const handleAddUser = (user: Omit<Usuario, "id">) => {
    const nu: Usuario = {
      ...user,
      id: `usr-${Date.now()}`
    };
    const updated = [...usersList, nu];
    setUsersList(updated);
    saveToStorage({ usersList: updated });
  };

  const handleDeleteUser = (id: string) => {
    const updated = usersList.filter((u) => u.id !== id);
    setUsersList(updated);
    saveToStorage({ usersList: updated });
  };

  // Action: Trigger simulation of a random customer buying in real time
  const handleTriggerSimulatedVenda = () => {
    if (!activeSession) {
      alert("Atenção: Por favor, abra o Caixa (PDV) antes para registrar a simulação.");
      return;
    }
    // Select 1 to 3 random products that have stock
    const availableStock = products.filter((p) => p.quantidade > 2);
    if (availableStock.length === 0) {
      alert("Nenhum produto com estoque ativo no supermercado.");
      return;
    }

    const itemsToBuy: Omit<ItemVenda, "id">[] = [];
    const numItems = Math.floor(1 + Math.random() * 3);
    let sub = 0;

    for (let i = 0; i < numItems; i++) {
      const randProd = availableStock[Math.floor(Math.random() * availableStock.length)];
      if (itemsToBuy.some((it) => it.produtoId === randProd.id)) continue;

      const qty = Math.floor(1 + Math.random() * 2);
      const totalIt = parseFloat((qty * randProd.valorVenda).toFixed(2));
      itemsToBuy.push({
        produtoId: randProd.id,
        nomeProduto: randProd.nome,
        quantidade: qty,
        valorUnitario: randProd.valorVenda,
        valorTotal: totalIt
      });
      sub += totalIt;
    }

    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const ways: Venda["formaPagamento"][] = ["PIX", "Crédito", "Débito", "Dinheiro"];
    const randWay = ways[Math.floor(Math.random() * ways.length)];

    const checkoutVenda: Omit<Venda, "id"> = {
      data: new Date().toISOString(),
      itens: itemsToBuy.map((it, idx) => ({ ...it, id: `itv-${idx}-${Date.now()}` })),
      subtotal: sub,
      desconto: 0,
      total: sub,
      formaPagamento: randWay,
      clienteId: randomClient?.id,
      clienteNome: randomClient?.nome
    };

    handleCommitVenda(checkoutVenda);
    alert(`[Simulador Ativo]: Nova Compra efetuada por ${checkoutVenda.clienteNome || "Consumidor Anônimo"} totalizando R$ ${checkoutVenda.total.toFixed(2)} (${randWay})!`);
  };

  // Switch views render helper
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            products={products}
            sales={sales}
            payables={payables}
            receivables={receivables}
            onTriggerSimulation={handleTriggerSimulatedVenda}
            currentUser={currentUser || undefined}
          />
        );
      case "estoque":
        return (
          <StockView
            products={products}
            suppliers={suppliers}
            recentSales={sales}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            searchTerm={stockSearchTerm}
            onSearchTermChange={setStockSearchTerm}
            filterLowStock={stockFilterLow}
            onFilterLowStockChange={setStockFilterLow}
            filterExpiring={stockFilterExpiring}
            onFilterExpiringChange={setStockFilterExpiring}
          />
        );
      case "financeiro":
        return (
          <FinancialView
            payables={payables}
            receivables={receivables}
            suppliers={suppliers}
            clients={clients}
            onAddPayable={handleAddPayable}
            onAddReceivable={handleAddReceivable}
            onPayBill={handlePayBill}
            onReceiveBill={handleReceiveBill}
            products={products}
            sales={sales}
          />
        );
      case "pdv":
        return (
          <PDVView
            products={products}
            clients={clients}
            activeSession={activeSession}
            currentUser={currentUser}
            onOpenSession={handleOpenSession}
            onCloseSession={handleCloseSession}
            onCommitVenda={handleCommitVenda}
          />
        );
      case "pessoas":
        return (
          <PeopleView
            clients={clients}
            suppliers={suppliers}
            onAddClient={handleAddClient}
            onAddSupplier={handleAddSupplier}
            onDeleteClient={handleDeleteClient}
            onDeleteSupplier={handleDeleteSupplier}
            onUpdateClient={handleUpdateClient}
            onUpdateSupplier={handleUpdateSupplier}
            currentUserRole={currentUser?.regra}
          />
        );
      case "relatorios":
        return (
          <ReportsView
            products={products}
            sales={sales}
            payables={payables}
            receivables={receivables}
          />
        );
      case "configuracoes":
        return (
          <SettingsView
            currentUser={currentUser!}
            usersList={usersList}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onPushToSupabase={handlePushToSupabase}
            onPullFromSupabase={handlePullFromSupabase}
            supabaseSyncing={supabaseSyncing}
          />
        );
      default:
        return <div className="text-white">View em desenvolvimento.</div>;
    }
  };

  // Render Login overlay if user not logged
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} usersList={usersList} />;
  }

  // Sidebar navigation array list
  const isOperator = currentUser?.regra === "Operador" || currentUser?.regra === "Operador de Caixa";
  const navItems = ([
    { label: "Dashboard", id: "dashboard", icon: LayoutDashboard },
    { label: "Estoque", id: "estoque", icon: Boxes },
    { label: "Financeiro", id: "financeiro", icon: Briefcase },
    { label: "PDV (Fr. Caixa)", id: "pdv", icon: ShoppingCart },
    { label: "Clientes / Forn.", id: "pessoas", icon: Users },
    { label: "Análise / Relatórios", id: "relatorios", icon: PieIcon },
    { label: "Configurações", id: "configuracoes", icon: SettingsIcon },
  ] as const).filter(item => {
    if (isOperator) {
      return item.id === "pdv";
    }
    return true;
  });

  return (
    <div id="app-wrapper" className="min-h-screen bg-[#090D16] text-gray-100 flex font-sans overflow-x-hidden">
      {/* 1. Sidebar Panel */}
      {!isOperator && (
        <aside
          className={`bg-[#0F172A] border-r border-white/5 transition-all duration-300 z-30 flex flex-col justify-between shrink-0 ${sidebarOpen ? "w-64" : "w-20"}`}
        >
          <div>
            {/* Logo Brand */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between h-16 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#FF6B00] to-orange-400 rounded-xl flex items-center justify-center shadow-md shrink-0">
                  <ShoppingCart className="w-5 h-5 text-white font-bold" />
                </div>
                {sidebarOpen && (
                  <span className="font-bold text-white text-sm tracking-tight whitespace-nowrap">
                    Pare e Leve <span className="text-gray-400 font-normal">SaaS</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white p-1 bg-white/5 rounded-lg active:scale-95 transition-all hidden md:block"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation link tags */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl text-left text-xs font-semibold relative transition-all group ${isActive ? "bg-[#FF6B00] text-white shadow-lg shadow-orange-500/10" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white transition-colors"}`} />
                    {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                    {isActive && !sidebarOpen && (
                      <span className="absolute left-1 w-1.5 h-6 bg-white rounded-r-md" />
                    )}
                  </button>
                );
              })}
            </nav>
            <SidebarCalculator collapsed={!sidebarOpen} />
          </div>

          {/* User profile dropdown and exit */}
          <div className="p-3 border-t border-white/5 space-y-2">
            {sidebarOpen ? (
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center border border-[#FF6B00]/30 shrink-0">
                    <User className="w-4 h-4 text-[#FF6B00]" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-white truncate">{currentUser.nome}</div>
                    <div className="text-[9px] text-gray-500 truncate">{currentUser.regra}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg shrink-0"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 text-gray-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all"
                title="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>
      )}

      {/* 2. Main Content Right Panel */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* Top Header Navigation HUD */}
        <header className="h-16 bg-[#0F172A] border-b border-white/5 px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            {!isOperator && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white p-1.5 bg-white/5 rounded-xl md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="text-xs text-gray-400 font-mono hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>SPED Ativo • Auto-Auditoria Conectada</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick alert notifications indicator */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 rounded-xl border transition-all relative ${
                  notificationsOpen
                    ? "bg-white/10 border-[#FF6B00]/40 text-white"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                }`}
                title="Alertas de Estoque & Validade"
              >
                <Bell className="w-4 h-4" />
                {activeAlertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B00] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center animate-pulse">
                    {activeAlertsCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown Panel */}
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    {/* Backdrop to dismiss popover when clicking off */}
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 sm:w-[380px] bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-left"
                    >
                      {/* Dropdown Header */}
                      <div className="p-4 border-b border-white/5 bg-[#1E293B]/45 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-[#FF6B00]" />
                          <h3 className="font-bold text-xs text-white">Central de Alertas</h3>
                        </div>
                        {activeAlertsCount > 0 ? (
                          <span className="text-[10px] bg-[#FF6B00]/15 text-[#FF6B00] py-0.5 px-2 rounded-full font-mono font-bold">
                            {activeAlertsCount} Alertas Ativos
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 py-0.5 px-2 rounded-full font-bold">
                            Tudo Ok!
                          </span>
                        )}
                      </div>

                      {/* Dropdown Alerts List Scroll Area */}
                      <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                        {activeAlertsCount === 0 ? (
                          <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl">🎉</span>
                            <span className="text-xs font-semibold text-white">Excelente! Tudo em Ordem</span>
                            <span className="text-[10px] text-gray-500">Nenhum produto encontra-se abaixo do estoque crítico ou vencido!</span>
                          </div>
                        ) : (
                          <>
                            {/* Critical Stock alerts */}
                            {criticalStockAlerts.map((alert) => (
                              <div key={alert.id} className="p-3.5 hover:bg-white/5 transition-colors text-xs flex gap-2.5">
                                <span className="text-lg mt-0.5 shrink-0">⚠️</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-200 flex justify-between gap-1">
                                    <span className="truncate">{alert.nome}</span>
                                    <span className="text-[10px] text-yellow-500 font-mono shrink-0 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                      {alert.valorAtual} un.
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                    {alert.mensagem}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setStockSearchTerm(alert.nome);
                                      setStockFilterLow(true);
                                      setStockFilterExpiring(false);
                                      setActiveTab("estoque");
                                      setNotificationsOpen(false);
                                      addToast(
                                        "🔍 Filtrando Estoque",
                                        `Localizando "${alert.nome}" para reabastecimento.`,
                                        "info"
                                      );
                                    }}
                                    className="mt-2 text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
                                  >
                                    Regularizar Estoque →
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Expiration Date alerts */}
                            {expirationAlerts.map((alert) => (
                              <div key={alert.id} className="p-3.5 hover:bg-white/5 transition-colors text-xs flex gap-2.5">
                                <span className="text-lg mt-0.5 shrink-0">
                                  {alert.nivel === "vencido" ? "🚨" : "⏰"}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-200 flex justify-between gap-1">
                                    <span className="truncate">{alert.nome}</span>
                                    <span className={`text-[10px] font-mono shrink-0 font-bold px-1.5 py-0.5 rounded ${
                                      alert.nivel === "vencido"
                                        ? "text-red-400 bg-red-400/15 animate-pulse"
                                        : alert.nivel === "grave"
                                          ? "text-rose-400 bg-rose-400/10"
                                          : "text-amber-400 bg-amber-400/10"
                                    }`}>
                                      {alert.nivel === "vencido" ? "VENCIDO" : `${alert.diffDays} d`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                    {alert.mensagem}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setStockSearchTerm(alert.nome);
                                      setStockFilterLow(false);
                                      setStockFilterExpiring(true);
                                      setActiveTab("estoque");
                                      setNotificationsOpen(false);
                                      addToast(
                                        "🔍 Filtrando Validades",
                                        `Localizando lotes vencendo do produto "${alert.nome}".`,
                                        "info"
                                      );
                                    }}
                                    className="mt-2 text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
                                  >
                                    Olhar Lotes →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-gray-300 font-mono hidden sm:inline-block">Filial 01</span>
              <div className="flex items-center gap-2.5 bg-white/5 pl-2.5 pr-3 py-1.5 rounded-xl border border-white/5">
                <div className="w-6.5 h-6.5 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold font-sans">
                  PL
                </div>
                <div className="text-left hidden xs:block">
                  <div className="text-[10px] font-bold text-white leading-none">{currentUser.nome}</div>
                  <div className="text-[8px] text-gray-400 font-mono mt-0.5">{currentUser.regra}</div>
                </div>
                {isOperator && (
                  <button
                    onClick={handleLogout}
                    className="p-1 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg ml-1 transition-all"
                    title="Sair do Caixa"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 p-6 z-10 overflow-y-auto bg-[#090D16]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Toast Notifications Overlay */}
      <div className="fixed top-5 right-5 z-50 space-y-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-sm ${
                t.type === "success"
                  ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                  : t.type === "error"
                    ? "bg-rose-950/90 border-rose-500/30 text-rose-200"
                    : t.type === "warning"
                      ? "bg-[#271d0c]/90 border-amber-500/30 text-amber-200"
                      : "bg-[#0F172A]/95 border-blue-500/30 text-blue-200"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {t.type === "success" && <span className="text-sm">✅</span>}
                {t.type === "error" && <span className="text-sm">🛑</span>}
                {t.type === "warning" && <span className="text-sm">⚠️</span>}
                {t.type === "info" && <span className="text-sm">ℹ️</span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-bold text-white tracking-wide">{t.title}</div>
                <div className="text-[10px] mt-1 leading-relaxed opacity-90">{t.message}</div>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-white/40 hover:text-white text-xs px-1 shrink-0 font-bold cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
