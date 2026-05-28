/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Bell,
  Calendar
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Produto, Venda, ContaPagar, ContaReceber, Usuario } from "../types";

interface DashboardProps {
  products: Produto[];
  sales: Venda[];
  payables: ContaPagar[];
  receivables: ContaReceber[];
  onTriggerSimulation: () => void;
  currentUser?: Usuario;
}

export default function DashboardView({
  products,
  sales,
  payables,
  receivables,
  onTriggerSimulation,
  currentUser,
}: DashboardProps) {
  const [period, setPeriod] = useState<"dia" | "semana" | "mes" | "ano">("mes");

  // Dynamically obtain reference date to support simulated sales
  const referenceDate = useMemo(() => {
    if (sales.length === 0) return new Date("2026-05-27");
    const dates = sales.map(s => new Date(s.data).getTime());
    const maxDate = new Date(Math.max(...dates));
    const defaultDate = new Date("2026-05-27");
    return maxDate > defaultDate ? maxDate : defaultDate;
  }, [sales]);

  const referenceDateStr = useMemo(() => {
    return referenceDate.toISOString().split("T")[0];
  }, [referenceDate]);

  const getPeriodRange = useMemo(() => {
    const today = referenceDate;
    const todayStr = referenceDateStr;
    
    // Day: exactly todayStr
    // Week: todayStr minus 6 days to todayStr
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    
    // Month: first day of month to last day of month
    const monthStartStr = `${todayStr.slice(0, 7)}-01`;
    const tempDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthEndStr = tempDate.toISOString().split("T")[0];
    
    // Year: first day of year to last day of year
    const yearStartStr = `${today.getFullYear()}-01-01`;
    const yearEndStr = `${today.getFullYear()}-12-31`;
    
    return {
      todayStr,
      weekStartStr,
      monthStartStr,
      monthEndStr,
      yearStartStr,
      yearEndStr
    };
  }, [referenceDate, referenceDateStr]);

  const isInPeriod = (dateStr: string, pType: "dia" | "semana" | "mes" | "ano") => {
    if (!dateStr) return false;
    const d = dateStr.split("T")[0];
    const { todayStr, weekStartStr, monthStartStr, monthEndStr, yearStartStr, yearEndStr } = getPeriodRange;
    
    if (pType === "dia") {
      return d === todayStr;
    }
    if (pType === "semana") {
      return d >= weekStartStr && d <= todayStr;
    }
    if (pType === "mes") {
      return d >= monthStartStr && d <= monthEndStr;
    }
    if (pType === "ano") {
      return d >= yearStartStr && d <= yearEndStr;
    }
    return false;
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => isInPeriod(s.data, period));
  }, [sales, period, getPeriodRange]);

  const filteredPayables = useMemo(() => {
    return payables.filter(p => isInPeriod(p.dataVencimento, period));
  }, [payables, period, getPeriodRange]);

  // Math counters
  const totalInBox = useMemo(() => {
    // Current simulated drawer: sum of cash sales + received receivables - paid payables + starting key
    const totalSales = sales.reduce((sum, v) => sum + v.total, 0);
    const totalReceived = receivables.filter(r => r.status === "Recebido").reduce((sum, r) => sum + r.valor, 0);
    const totalPaid = payables.filter(p => p.status === "Pago").reduce((sum, p) => sum + p.valor, 0);
    return Math.max(0, 1500 + totalSales + totalReceived - totalPaid); // Starting float of R$1500
  }, [sales, receivables, payables]);

  const itemsInLowStock = useMemo(() => {
    return products.filter((p) => p.quantidade <= p.estoqueMinimo);
  }, [products]);

  const itemsExpiring = useMemo(() => {
    const today = referenceDate;
    return products.filter((p) => {
      const expDate = new Date(p.validade);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 15; // Expiring in next 15 days
    });
  }, [products, referenceDate]);

  // Math metrics for selected period (Dynamic faturamento & expenses & cogs & profit)
  const totalIncomes = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.total, 0);
  }, [filteredSales]);

  const totalExpenses = useMemo(() => {
    return filteredPayables.filter(p => p.status === "Pago").reduce((sum, p) => sum + p.valor, 0);
  }, [filteredPayables]);

  const computedCOGS = useMemo(() => {
    let cost = 0;
    filteredSales.forEach((v) => {
      v.itens.forEach((it) => {
        const prod = products.find((p) => p.id === it.produtoId);
        if (prod) {
          cost += prod.valorCompra * it.quantidade;
        } else {
          cost += it.valorTotal * 0.65;
        }
      });
    });
    return cost;
  }, [filteredSales, products]);

  const grossProfit = useMemo(() => {
    return Math.max(0, totalIncomes - computedCOGS);
  }, [totalIncomes, computedCOGS]);

  const netProfitAmount = useMemo(() => {
    return grossProfit - totalExpenses;
  }, [grossProfit, totalExpenses]);

  // 2. Transformed chart data based on selected period
  const flowChartData = useMemo(() => {
    const today = referenceDate;
    
    if (period === "dia") {
      // Group by hours of today
      const hours = [
        { label: "08h-10h", range: [8, 10] },
        { label: "10h-12h", range: [10, 12] },
        { label: "12h-14h", range: [12, 14] },
        { label: "14h-16h", range: [14, 16] },
        { label: "16h-18h", range: [16, 18] },
        { label: "18h-20h", range: [18, 20] },
        { label: "Pós 20h", range: [20, 24] }
      ];
      
      return hours.map(h => {
        const matchingSales = filteredSales.filter(s => {
          const sDate = new Date(s.data);
          const sHour = sDate.getHours();
          return sHour >= h.range[0] && sHour < h.range[1];
        });
        const income = matchingSales.reduce((sum, s) => sum + s.total, 0);
        
        // Distribute expense today for visualization if bills are paid on today
        const expense = filteredPayables
          .filter(p => p.status === "Pago")
          .reduce((sum, p) => sum + p.valor, 0) / hours.length;
          
        return {
          name: h.label,
          Entradas: Math.round(income),
          Saídas: Math.round(expense)
        };
      });
    }
    
    if (period === "semana") {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split("T")[0];
        
        const income = sales
          .filter(s => s.data.startsWith(dStr))
          .reduce((sum, s) => sum + s.total, 0);
          
        const expense = payables
          .filter(p => p.status === "Pago" && p.dataVencimento === dStr)
          .reduce((sum, p) => sum + p.valor, 0);
          
        const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        days.push({
          name: label,
          Entradas: Math.round(income),
          Saídas: Math.round(expense)
        });
      }
      return days;
    }
    
    if (period === "mes") {
      // Group current month in key milestones to keep charts super clean and responsive
      const daysToDisplay = [5, 10, 15, 20, 25, today.getDate()];
      const year = today.getFullYear();
      const month = today.getMonth();
      
      return daysToDisplay.map(dom => {
        const dStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${dom.toString().padStart(2, "0")}`;
        
        const income = sales
          .filter(s => s.data.startsWith(dStr))
          .reduce((sum, s) => sum + s.total, 0);
          
        const expense = payables
          .filter(p => p.status === "Pago" && p.dataVencimento === dStr)
          .reduce((sum, p) => sum + p.valor, 0);
          
        const baseIncome = dom === 5 ? 420 : dom === 10 ? 580 : dom === 15 ? 710 : dom === 20 ? 640 : dom === 25 ? 880 : 0;
        const baseExpense = dom === 5 ? 120 : dom === 10 ? 250 : dom === 15 ? 180 : dom === 20 ? 340 : dom === 25 ? 200 : 0;
        
        return {
          name: `${dom.toString().padStart(2, "0")}/05`,
          Entradas: Math.round(baseIncome + income),
          Saídas: Math.round(baseExpense + expense)
        };
      });
    }
    
    if (period === "ano") {
      // 12 Months
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const currentYear = today.getFullYear();
      
      return monthNames.map((name, idx) => {
        const monthPrefix = `${currentYear}-${(idx + 1).toString().padStart(2, "0")}`;
        
        const income = sales
          .filter(s => s.data.startsWith(monthPrefix))
          .reduce((sum, s) => sum + s.total, 0);
          
        const expense = payables
          .filter(p => p.status === "Pago" && p.dataVencimento.startsWith(monthPrefix))
          .reduce((sum, p) => sum + p.valor, 0);
          
        // Consistent seed values for preceding months layout to display beautifully
        const historicalSeeds: { [m: number]: { inc: number; exp: number } } = {
          0: { inc: 15100, exp: 9800 },
          1: { inc: 14200, exp: 9100 },
          2: { inc: 18900, exp: 12100 },
          3: { inc: 21500, exp: 14200 },
          4: { inc: 12000, exp: 7600 }
        };
        
        const seed = historicalSeeds[idx] || { inc: 0, exp: 0 };
        
        return {
          name,
          Entradas: Math.round(seed.inc + income),
          Saídas: Math.round(seed.exp + expense)
        };
      });
    }
    return [];
  }, [sales, payables, period, filteredSales, filteredPayables, referenceDate]);

  const bestSellersData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    filteredSales.forEach((v) => {
      v.itens.forEach((it) => {
        counts[it.nomeProduto] = (counts[it.nomeProduto] || 0) + it.quantidade;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.split(" ")[0] + " " + (name.split(" ")[1] || ""), Vendas: Number(value.toFixed(1)) }))
      .sort((a, b) => b.Vendas - a.Vendas)
      .slice(0, 5);
  }, [filteredSales]);

  const categoryDistribution = useMemo(() => {
    const catCounts: { [cat: string]: number } = {};
    products.forEach((p) => {
      catCounts[p.categoria] = (catCounts[p.categoria] || 0) + p.quantidade;
    });
    return Object.entries(catCounts).map(([name, value]) => ({
      name,
      value
    }));
  }, [products]);

  const COLORS = ["#FF6B00", "#3B82F6", "#22C55E", "#A855F7", "#EAB308", "#EC4899", "#14B8A6"];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1E293B] to-[#0F172A] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#FF6B00] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#FF6B00] tracking-wider uppercase font-mono bg-orange-500/10 px-2 py-0.5 rounded-full">
              Visão Inteligente Ativa
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Olá, {currentUser?.nome || "Jackson Oliveira"}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            O fluxo analítico está filtrado para o período selecionado de {period === "dia" ? "hoje" : period === "semana" ? "últimos 7 dias" : period === "mes" ? "mês corrente" : "ano corrente"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Period Filter Controls */}
          <div className="flex bg-black/45 border border-white/5 p-1 rounded-xl shrink-0">
            {(["dia", "semana", "mes", "ano"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  period === p
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {p === "dia" ? "Dia" : p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>

          <button
            onClick={onTriggerSimulation}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-orange-500/10"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            Simular Nova Venda
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium">Saldo de Caixa</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
              R$ {totalInBox.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+RS 1.5K fundo incluído</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {period === "dia" ? "Faturamento Hoje" : period === "semana" ? "Fat. na Semana" : period === "mes" ? "Fat. no Mês" : "Fat. no Ano"}
            </span>
            <div className="p-2 bg-orange-500/10 rounded-xl text-[#FF6B00]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
              R$ {totalIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#FF6B00] flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>Receitas de vendas</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {period === "dia" ? "Despesas Hoje" : period === "semana" ? "Despesas Semana" : period === "mes" ? "Despesas Mês" : "Despesas Ano"}
            </span>
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
              R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-1">
              <Calendar className="w-3 h-3" />
              <span>Contas pagas no ciclo</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {period === "dia" ? "Lucro Líquido Hoje" : period === "semana" ? "Lucro na Semana" : period === "mes" ? "Lucro no Mês" : "Lucro no Ano"}
            </span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-lg md:text-xl font-bold tracking-tight ${netProfitAmount < 0 ? "text-red-400" : "text-white"}`}>
              R$ {netProfitAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-blue-400 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>{totalIncomes > 0 ? ((netProfitAmount / totalIncomes) * 100).toFixed(1) : "0.0"}% margem líq.</span>
            </div>
          </div>
        </motion.div>

        {/* Card 5 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium">Estoque Baixo</span>
            <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
              {itemsInLowStock.length} {itemsInLowStock.length === 1 ? "produto" : "produtos"}
            </div>
            <div className="text-[10px] text-yellow-500 flex items-center gap-0.5 mt-1">
              <Bell className="w-3 h-3" />
              <span>Alerta de reposição</span>
            </div>
          </div>
        </motion.div>

        {/* Card 6 */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 relative group shadow-md"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-medium">Validade Alerta</span>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
              {itemsExpiring.length} {itemsExpiring.length === 1 ? "vencendo" : "vencendo"}
            </div>
            <div className="text-[10px] text-rose-400 flex items-center gap-0.5 mt-1">
              <AlertOctagon className="w-3 h-3" />
              <span>Ideal para liquidização</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart 1: Fluxo de Caixa */}
        <div className="xl:col-span-2 bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Fluxo de Caixa Operacional</h2>
              <p className="text-xs text-gray-400">Ingressos e saídas registradas nos últimos 7 dias comerciais</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-300 font-medium bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]" />
                Entradas (Vendas)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-300 font-medium bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                Saídas
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="Entradas" stroke="#FF6B00" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="Saídas" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Produtos mais vendidos */}
        <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl">
          <div>
            <h2 className="text-base font-semibold text-white">Top 5 Mais Vendidos</h2>
            <p className="text-xs text-gray-400 mb-6">Em volume total de itens escoados no PDV</p>
          </div>
          <div className="h-72 w-full">
            {bestSellersData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                Pouco fluxo comercial registrado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellersData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" horizontal={false} vertical={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} hide />
                  <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={10} width={80} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                  />
                  <Bar dataKey="Vendas" fill="#FF6B00" radius={[0, 8, 8, 0]} barSize={16}>
                    {bestSellersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#FF6B00" : "rgba(255,107,0,0.6)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Critical Stock List & Distribution Category */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Critical Low Stock list */}
        <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl xl:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alerta Crítico: Estoque e Validades
              </h2>
              <p className="text-xs text-gray-400">Produtos necessitando de atenção rápida no reposicionamento</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table id="warning-table" className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-2">Produto</th>
                  <th className="py-3 px-2">Categoria</th>
                  <th className="py-3 px-2">Saldo Atual</th>
                  <th className="py-3 px-2">Mínimo Exigido</th>
                  <th className="py-3 px-2">Validade</th>
                  <th className="py-3 px-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...itemsInLowStock, ...itemsExpiring].slice(0, 5).map((prod, idx) => {
                  const isLow = prod.quantidade <= prod.estoqueMinimo;
                  return (
                    <tr key={`${prod.id}-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 font-medium text-white">{prod.nome}</td>
                      <td className="py-3 px-2 text-gray-400">{prod.categoria}</td>
                      <td className="py-3 px-2">
                        <span className={`font-semibold ${isLow ? "text-yellow-500" : "text-gray-300"}`}>
                          {prod.quantidade} un
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-400">{prod.estoqueMinimo} un</td>
                      <td className="py-3 px-2 font-mono">
                        {new Date(prod.validade).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="inline-block text-[10px] bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/20 rounded-full px-2.5 py-0.5 font-medium">
                          {isLow ? "Solicitar Reposição" : "Promoção Já"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie: Category Distribution */}
        <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl">
          <div>
            <h2 className="text-base font-semibold text-white">Estocagem por Categoria</h2>
            <p className="text-xs text-gray-400 mb-6">Proporção volumétrica atual de itens ativos</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend in table format */}
            <div className="absolute text-center">
              <span className="text-3xl font-extrabold text-white font-sans">
                {products.reduce((sum, p) => sum + p.quantidade, 0)}
              </span>
              <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">itens estocados</p>
            </div>
          </div>
          {/* Quick legend list */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-gray-400">
            {categoryDistribution.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{entry.name}: {entry.value} un</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
