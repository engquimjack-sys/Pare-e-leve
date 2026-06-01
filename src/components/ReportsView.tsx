/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Printer,
  TrendingUp,
  Award,
  AlertOctagon,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Clock,
  ArrowRight,
  Search,
  ChevronRight,
  CreditCard,
  X,
  FileSpreadsheet,
  Check,
  Trash2
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
  ComposedChart,
  Line
} from "recharts";
import { Produto, Venda, ContaPagar, ContaReceber } from "../types";

interface ReportsProps {
  products: Produto[];
  sales: Venda[];
  payables: ContaPagar[];
  receivables: ContaReceber[];
  currentUserRole?: string;
  onDeleteSale?: (saleId: string) => void;
}

export default function ReportsView({
  products,
  sales,
  payables,
  receivables,
  currentUserRole,
  onDeleteSale,
}: ReportsProps) {
  const [selectedReport, setSelectedReport] = useState<"vendas" | "margens" | "vencimentos" | "historico">("vendas");
  const [reportPeriod, setReportPeriod] = useState<"dia" | "semana" | "mes" | "ano" | "todos">("mes");

  // Custom states for modal safe deletions and warnings without iframe constraints
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Sales History View States
  const [historyYearFilter, setHistoryYearFilter] = useState<string>("2026");
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("Todos");
  const [historyDayFilter, setHistoryDayFilter] = useState<string>("Todos");
  const [historySearchTerm, setHistorySearchTerm] = useState<string>("");
  const [historyActiveViewType, setHistoryActiveViewType] = useState<"grupo-dia" | "grupo-mes" | "grupo-ano" | "todas-vendas">("todas-vendas");
  const [selectedDetailedSale, setSelectedDetailedSale] = useState<Venda | null>(null);

  // Dynamically calculate reference date to support simulated and current sales periods
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
    // Week: todayStr minus 6 days
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

  const isInPeriod = (dateStr: string, pType: typeof reportPeriod) => {
    if (pType === "todos") return true;
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
    return sales.filter(s => isInPeriod(s.data, reportPeriod));
  }, [sales, reportPeriod, getPeriodRange]);

  const filteredPayables = useMemo(() => {
    return payables.filter(p => isInPeriod(p.dataVencimento, reportPeriod));
  }, [payables, reportPeriod, getPeriodRange]);

  // Math variables
  const totalSalesVolume = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.total, 0);
  }, [filteredSales]);

  const totalCOGS = useMemo(() => {
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

  // Net Profit: Revenue minus COGS minus paid expenses inside the period
  const netProfit = useMemo(() => {
    const expenses = filteredPayables.filter(p => p.status === "Pago").reduce((sum, p) => sum + p.valor, 0);
    return totalSalesVolume - totalCOGS - expenses;
  }, [totalSalesVolume, totalCOGS, filteredPayables]);

  const averageTicket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalSalesVolume / filteredSales.length;
  }, [filteredSales, totalSalesVolume]);

  const itemsExpiringCount = useMemo(() => {
    const today = referenceDate;
    return products.filter((p) => {
      const expDate = new Date(p.validade);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30; // 30 days window
    }).length;
  }, [products, referenceDate]);

  // May 2026 monthly calculations for the Semestral Trend Chart
  const monthlyTotalSales = useMemo(() => {
    return sales.filter(s => isInPeriod(s.data, "mes")).reduce((sum, s) => sum + s.total, 0);
  }, [sales, getPeriodRange]);

  const monthlyCOGS = useMemo(() => {
    let cost = 0;
    sales.filter(s => isInPeriod(s.data, "mes")).forEach((v) => {
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
  }, [sales, products, getPeriodRange]);

  const monthlyTotalExpenses = useMemo(() => {
    return payables.filter(p => p.status === "Pago" && isInPeriod(p.dataVencimento, "mes")).reduce((sum, p) => sum + p.valor, 0);
  }, [payables, getPeriodRange]);

  const monthlyNetProfit = useMemo(() => {
    return monthlyTotalSales - monthlyCOGS - monthlyTotalExpenses;
  }, [monthlyTotalSales, monthlyCOGS, monthlyTotalExpenses]);

  // Chart data
  const monthlyTimeline = useMemo(() => {
    return [
      { name: "Dez", Vendas: 12400, Lucro: 4100 },
      { name: "Jan", Vendas: 15100, Lucro: 5200 },
      { name: "Fev", Vendas: 14200, Lucro: 4900 },
      { name: "Mar", Vendas: 18900, Lucro: 6800 },
      { name: "Abr", Vendas: 21500, Lucro: 7300 },
      { name: "Mai", Vendas: Math.round(23000 + monthlyTotalSales), Lucro: Math.max(0, Math.round(8000 + monthlyNetProfit)) }
    ];
  }, [monthlyTotalSales, monthlyNetProfit]);

  const categoryMarginData = useMemo(() => {
    const catMap: { [cat: string]: { revenue: number; cost: number } } = {};
    products.forEach((p) => {
      catMap[p.categoria] = catMap[p.categoria] || { revenue: 0, cost: 0 };
    });

    filteredSales.forEach((v) => {
      v.itens.forEach((it) => {
        const prod = products.find((p) => p.id === it.produtoId);
        if (prod) {
          catMap[prod.categoria] = catMap[prod.categoria] || { revenue: 0, cost: 0 };
          catMap[prod.categoria].revenue += it.valorTotal;
          catMap[prod.categoria].cost += prod.valorCompra * it.quantidade;
        }
      });
    });

    return Object.entries(catMap).map(([cat, val]) => {
      const profit = Math.max(0, val.revenue - val.cost);
      const margem = val.revenue > 0 ? parseFloat(((profit / val.revenue) * 100).toFixed(1)) : 30;
      return {
        name: cat,
        Receita: Number(val.revenue.toFixed(1)),
        Lucro: Number(profit.toFixed(1)),
        Margem: margem
      };
    }).filter(item => item.Receita > 0);
  }, [filteredSales, products]);

  // Sales History Memo Calculations
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    sales.forEach(s => {
      try {
        const y = new Date(s.data).getFullYear().toString();
        if (y && y !== "NaN") years.add(y);
      } catch (e) {}
    });
    years.add("2026");
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const MONTHS_LIST = useMemo(() => [
    { value: "Todos", label: "Todos os Meses" },
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ], []);

  const filteredHistorySales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = new Date(s.data);
      if (isNaN(saleDate.getTime())) return false;

      const y = saleDate.getFullYear().toString();
      const m = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const d = saleDate.getDate().toString().padStart(2, "0");

      if (historyYearFilter !== "Todos" && y !== historyYearFilter) return false;
      if (historyMonthFilter !== "Todos" && m !== historyMonthFilter) return false;
      if (historyDayFilter !== "Todos" && d !== historyDayFilter) return false;

      if (historySearchTerm.trim()) {
        const term = historySearchTerm.toLowerCase();
        const matchesClient = s.clienteNome?.toLowerCase().includes(term);
        const matchesId = s.id.toLowerCase().includes(term);
        const matchesForma = s.formaPagamento.toLowerCase().includes(term);
        const matchesItems = s.itens.some(item => item.nomeProduto.toLowerCase().includes(term));
        if (!matchesClient && !matchesId && !matchesForma && !matchesItems) return false;
      }

      return true;
    });
  }, [sales, historyYearFilter, historyMonthFilter, historyDayFilter, historySearchTerm]);

  const salesGroupedByDay = useMemo(() => {
    const groups: { [dateStr: string]: { date: string; total: number; count: number; itemsCount: number; average: number } } = {};
    
    sales.forEach((s) => {
      const dObj = new Date(s.data);
      if (isNaN(dObj.getTime())) return;
      const y = dObj.getFullYear().toString();
      const m = (dObj.getMonth() + 1).toString().padStart(2, "0");
      const dateStr = s.data.split("T")[0]; // YYYY-MM-DD

      if (historyYearFilter !== "Todos" && y !== historyYearFilter) return;
      if (historyMonthFilter !== "Todos" && m !== historyMonthFilter) return;

      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, total: 0, count: 0, itemsCount: 0, average: 0 };
      }
      groups[dateStr].total += s.total;
      groups[dateStr].count += 1;
      groups[dateStr].itemsCount += s.itens.reduce((sum, item) => sum + item.quantidade, 0);
    });

    return Object.values(groups).map(g => ({
      ...g,
      average: g.count > 0 ? g.total / g.count : 0
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, historyYearFilter, historyMonthFilter]);

  const salesGroupedByMonth = useMemo(() => {
    const groups: { [monthStr: string]: { month: string; year: string; total: number; count: number; itemsCount: number; average: number } } = {};

    sales.forEach((s) => {
      const dObj = new Date(s.data);
      if (isNaN(dObj.getTime())) return;
      const y = dObj.getFullYear().toString();
      const m = (dObj.getMonth() + 1).toString().padStart(2, "0");
      const monthStr = `${y}-${m}`;

      if (historyYearFilter !== "Todos" && y !== historyYearFilter) return;

      if (!groups[monthStr]) {
        groups[monthStr] = { month: m, year: y, total: 0, count: 0, itemsCount: 0, average: 0 };
      }
      groups[monthStr].total += s.total;
      groups[monthStr].count += 1;
      groups[monthStr].itemsCount += s.itens.reduce((sum, item) => sum + item.quantidade, 0);
    });

    const monthLabelsMap: { [key: string]: string } = {
      "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril", "05": "Maio", "06": "Junho",
      "07": "Julho", "08": "Agosto", "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };

    return Object.values(groups).map(g => ({
      ...g,
      label: `${monthLabelsMap[g.month] || g.month} de ${g.year}`,
      average: g.count > 0 ? g.total / g.count : 0
    })).sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`));
  }, [sales, historyYearFilter]);

  const salesGroupedByYear = useMemo(() => {
    const groups: { [year: string]: { year: string; total: number; count: number; itemsCount: number; average: number } } = {};

    sales.forEach((s) => {
      const dObj = new Date(s.data);
      if (isNaN(dObj.getTime())) return;
      const y = dObj.getFullYear().toString();

      if (!groups[y]) {
        groups[y] = { year: y, total: 0, count: 0, itemsCount: 0, average: 0 };
      }
      groups[y].total += s.total;
      groups[y].count += 1;
      groups[y].itemsCount += s.itens.reduce((sum, item) => sum + item.quantidade, 0);
    });

    return Object.values(groups).map(g => ({
      ...g,
      average: g.count > 0 ? g.total / g.count : 0
    })).sort((a, b) => b.year.localeCompare(a.year));
  }, [sales]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Bloqueador de pop-ups ativo! Por favor, autorize a abertura de pop-ups para imprimir o relatório.");
      return;
    }

    const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (dStr: string) => new Date(dStr).toLocaleDateString("pt-BR");
    const todayLabel = new Date().toLocaleDateString("pt-BR");

    let title = "";
    let contentHtml = "";

    if (selectedReport === "vendas") {
      title = "Relatório de Vendas e Saúde Operacional";
      contentHtml = `
        <div class="metrics">
          <div class="card">
            <h4>Faturamento Operacional</h4>
            <div class="val">${fmt(totalSalesVolume)}</div>
            <p>Período: ${reportPeriod.toUpperCase()}</p>
          </div>
          <div class="card">
            <h4>Custo de Mercadoria (C.M.V.)</h4>
            <div class="val">${fmt(totalCOGS)}</div>
            <p>CMV Médio: ${totalSalesVolume > 0 ? ((totalCOGS / totalSalesVolume) * 100).toFixed(1) : "0.0"}%</p>
          </div>
          <div class="card">
            <h4>Resultado Operacional Líquido</h4>
            <div class="val" style="color: ${netProfit >= 0 ? '#16a34a' : '#dc2626'};">${fmt(netProfit)}</div>
            <p>Margem Líquida: ${totalSalesVolume > 0 ? ((netProfit / totalSalesVolume) * 100).toFixed(1) : "0.0"}%</p>
          </div>
          <div class="card">
            <h4>Ticket Médio por Cupom</h4>
            <div class="val">${fmt(averageTicket)}</div>
            <p>Cupons Emitidos: ${filteredSales.length}</p>
          </div>
        </div>

        <h3>Detalhamento das Vendas Registradas</h3>
        <table class="table">
          <thead>
            <tr>
              <th>ID da Venda</th>
              <th>Data/Hora</th>
              <th>Operador</th>
              <th>CPF Cliente</th>
              <th style="text-align: right;">Total Itens</th>
              <th style="text-align: right;">Valor Acumulado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(v => `
              <tr>
                <td style="font-family: monospace;">${v.id}</td>
                <td>${new Date(v.data).toLocaleString("pt-BR")}</td>
                <td>${v.operador || "Jackson Pereira"}</td>
                <td style="font-family: monospace;">${v.cpfCliente || "Consumidor Geral"}</td>
                <td style="text-align: right;">${v.itens.reduce((sum, i) => sum + i.quantidade, 0)} un</td>
                <td style="text-align: right; font-weight: bold; font-family: monospace;">${fmt(v.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (selectedReport === "historico") {
      title = "Histórico Detalhado de Vendas (Filtrado)";
      const selMonthLabel = historyMonthFilter === "Todos" ? "Todos os Meses" : (MONTHS_LIST.find(m => m.value === historyMonthFilter)?.label || historyMonthFilter);
      contentHtml = `
        <p>Abaixo consta a listagem das vendas detalhadas realizadas, conforme os filtros operacionais selecionados:</p>
        <p><strong>Filtro Temporal:</strong> Ano ${historyYearFilter} | Mês: ${selMonthLabel} | Dia: ${historyDayFilter}</p>
        <table class="table">
          <thead>
            <tr>
              <th>ID da Venda</th>
              <th>Data/Hora</th>
              <th>Forma Pagto</th>
              <th>Cliente</th>
              <th style="text-align: right;">Itens</th>
              <th style="text-align: right;">Total da Venda</th>
            </tr>
          </thead>
          <tbody>
            ${filteredHistorySales.map(v => `
              <tr>
                <td style="font-family: monospace;">${v.id}</td>
                <td>${new Date(v.data).toLocaleString("pt-BR")}</td>
                <td>${v.formaPagamento}</td>
                <td>${v.clienteNome || "Consumidor Geral"}</td>
                <td style="text-align: right;">${v.itens.reduce((sum, item) => sum + item.quantidade, 0)} un</td>
                <td style="text-align: right; font-weight: bold; font-family: monospace;">${fmt(v.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div style="margin-top: 25px; text-align: right; font-size: 14px; font-weight: bold; border-top: 1px solid #eee; padding-top: 15px;">
          Faturamento Total no Período: ${fmt(filteredHistorySales.reduce((sum, s) => sum + s.total, 0))}
        </div>
      `;
    } else if (selectedReport === "margens") {
      title = "Relatório de DRE por Categoria de Produto";
      contentHtml = `
        <p>Abaixo consta a performance acumulada e margens de lucro ponderadas, filtradas no período <strong>${reportPeriod.toUpperCase()}</strong>:</p>
        <table class="table">
          <thead>
            <tr>
              <th>Categoria do Produto</th>
              <th style="text-align: right;">Faturamento de Venda</th>
              <th style="text-align: right;">Custo Relacionado (CMV)</th>
              <th style="text-align: right;">Lucro Bruto Ponderado</th>
              <th style="text-align: right;">Margem de Contribuição (%)</th>
            </tr>
          </thead>
          <tbody>
            ${categoryMarginData.map(c => `
              <tr>
                <td style="font-weight: bold;">${c.name}</td>
                <td style="text-align: right; font-family: monospace;">${fmt(c.Receita)}</td>
                <td style="text-align: right; font-family: monospace; color: #dc2626;">-${fmt(c.Receita - c.Lucro)}</td>
                <td style="text-align: right; font-family: monospace; color: #16a34a;">${fmt(c.Lucro)}</td>
                <td style="text-align: right; font-weight: bold;">${c.Margem.toFixed(1)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else {
      title = "Relatório de Alertas de Vencimentos em Gôndola";
      
      const expiringItems = products.filter((p) => {
        const today = new Date("2026-05-27");
        const exp = new Date(p.validade);
        const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 45;
      });

      contentHtml = `
        <p>Listagem de produtos do estoque cujo prazo de vencimento expira em menos de 45 dias, exigindo ações urgentes de desconto ou liquidação em lote:</p>
        <table class="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome do Produto</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th>Prazo Restante</th>
              <th style="text-align: right;">Saldo Estocado</th>
              <th style="text-align: right;">Preço de Venda</th>
              <th>Nível Crítico</th>
            </tr>
          </thead>
          <tbody>
            ${expiringItems.map(p => {
              const today = new Date("2026-05-27");
              const exp = new Date(p.validade);
              const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = days <= 10;
              return `
                <tr>
                  <td style="font-family: monospace;">${p.codigoBarras}</td>
                  <td style="font-weight: bold;">${p.nome}</td>
                  <td>${p.categoria}</td>
                  <td style="font-family: monospace; color: #ea580c;">${fmtDate(p.validade)}</td>
                  <td style="font-family: monospace; font-weight: bold; color: ${isUrgent ? '#dc2626' : '#d97706'};">${days} dias</td>
                  <td style="text-align: right;">${p.quantidade} un</td>
                  <td style="text-align: right; font-family: monospace;">${fmt(p.valorVenda)}</td>
                  <td>
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background-color: ${isUrgent ? '#fef2f2' : '#fffbeb'}; color: ${isUrgent ? '#991b1b' : '#92400e'};">
                      ${isUrgent ? 'Descarte / Liquidar Urgente' : 'Campanha de Desconto'}
                    </span>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 35px; }
            .header h1 { margin: 0; font-size: 22px; color: #1e3a8a; }
            .header p { margin: 5px 0 0; color: #555; font-size: 13px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; }
            .card h4 { margin: 0; font-size: 11px; color: #666; text-transform: uppercase; }
            .card .val { font-size: 16px; font-weight: bold; margin: 5px 0; color: #111; }
            .card p { margin: 0; font-size: 10px; color: #888; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th { background-color: #f3f4f6; color: #1f2937; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
            .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            h3 { color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; font-size: 15px; margin-top: 25px; }
            .footer { font-size: 11px; color: #999; text-align: center; margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h1>PARE E LEVE SUPERMERCADOS LTDA</h1>
              <span style="font-size: 12px; font-weight: bold; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 12px; text-transform: uppercase;">Retaguarda ERP</span>
            </div>
            <p><strong>${title}</strong></p>
            <p>Gerado em: ${todayLabel} | Responsável: Jackson Pereira (Administrador geral)</p>
          </div>

          ${contentHtml}

          <div class="footer">
            <p>Pare e Leve v4.12 — Relatórios Operacionais e Analíticos Consolidativos de Vendas & Inventário.</p>
            <p>Página de Impressão Direta Segura regulada por Local Storage.</p>
          </div>
          <script>
            window.focus();
            setTimeout(function() {
              window.print();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic select buttons and layout */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0F172A] border border-white/5 p-4 rounded-3xl shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#1E293B] p-1.5 rounded-2xl border border-white/5 flex-wrap overflow-x-auto">
            <button
              onClick={() => setSelectedReport("vendas")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${selectedReport === "vendas" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Vendas & Evolução
            </button>
            <button
              onClick={() => setSelectedReport("historico")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${selectedReport === "historico" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Histórico de Vendas
            </button>
            <button
              onClick={() => setSelectedReport("margens")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${selectedReport === "margens" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Demonstrativo de DRE (Categorias)
            </button>
            <button
              onClick={() => setSelectedReport("vencimentos")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${selectedReport === "vencimentos" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Validades Ativas
            </button>
          </div>

          {/* Period Filter for report data */}
          {selectedReport !== "vencimentos" && selectedReport !== "historico" && (
            <div className="flex bg-black/45 border border-white/5 p-1 rounded-xl shrink-0">
              {(["dia", "semana", "mes", "ano", "todos"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    reportPeriod === p
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {p === "dia" ? "Hoje" : p === "semana" ? "Semana" : p === "mes" ? "Mês" : p === "ano" ? "Ano" : "Geral"}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handlePrint}
          className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:border-[#FF6B00]/40 shrink-0 self-end lg:self-auto"
        >
          <Printer className="w-4 h-4 text-[#FF6B00] shrink-0" />
          Imprimir Relatório
        </button>
      </div>

      {selectedReport === "vendas" && (
        <div className="space-y-6">
          {/* Quick numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">
                {reportPeriod === "dia" ? "Faturamento Hoje" : reportPeriod === "semana" ? "Fat. na Semana" : reportPeriod === "mes" ? "Fat. no Mês" : reportPeriod === "ano" ? "Fat. no Ano" : "Faturamento Total"}
              </span>
              <div className="text-xl font-bold text-white mt-1">
                R$ {totalSalesVolume.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> do faturamento real no ciclo
              </p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Custo Mercadoria (C.M.V.)</span>
              <div className="text-xl font-bold text-gray-300 mt-1">
                R$ {totalCOGS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                CMV Real: {totalSalesVolume > 0 ? ((totalCOGS / totalSalesVolume) * 100).toFixed(1) : "0.0"}%
              </p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Ticket Médio Operacional</span>
              <div className="text-xl font-bold text-[#FF6B00] mt-1">
                R$ {averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-blue-400 mt-1">Média de R$ calculada por cupom</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Lucro Líquido Estimado</span>
              <div className={`text-xl font-bold mt-1 ${netProfit < 0 ? "text-red-400" : "text-emerald-400"}`}>
                R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-blue-400 mt-1">
                Liquidez após despesas pagas: {totalSalesVolume > 0 ? ((netProfit / totalSalesVolume) * 100).toFixed(1) : "0.0"}%
              </p>
            </div>
          </div>

          {/* Timeline chart */}
          <div className="bg-[#0F172A] border border-white/5 p-6 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm text-white">Consolidado Semestral: Faturamento vs Margem Líquida</h3>
                <p className="text-xs text-gray-400">Fluxos financeiros calculados até o mês corrente de 2026</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTimeline} margin={{ top: 20, right: -5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartvendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                  <Bar dataKey="Vendas" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={35} />
                  <Line type="monotone" dataKey="Lucro" stroke="#FF6B00" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedReport === "margens" && (
        <div className="space-y-6">
          {/* Quick analysis summary */}
          <div className="bg-purple-950/20 border border-purple-500/10 p-5 rounded-3xl text-xs text-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold text-sm">DRE de Desempenho por Segmento do Mercado</h4>
            </div>
            <p>
              Gerais: O setor de <strong>Bebidas</strong> apresenta o maior faturamento bruto, enquanto <strong>Hortifrúti</strong> e <strong>Laticínios</strong> mantêm margens de contribuição líquida acima de 45%, ideais para o equilíbrio do caixa diante do desperdício de perecíveis.
            </p>
          </div>

          {/* Margins categories chart */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-[#0F172A] border border-white/5 p-6 rounded-3xl shadow-xl">
              <h3 className="font-bold text-sm text-white mb-6">Faturamento de Venda por Categoria</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryMarginData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                    <Bar dataKey="Receita" fill="#FF6B00" radius={[6, 6, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-white/5 p-6 rounded-3xl shadow-xl">
              <h3 className="font-bold text-sm text-white mb-6">Porcentagem de Margem de Contribuição (%)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={categoryMarginData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                    <Area type="monotone" dataKey="Margem" stroke="#22C55E" fill="rgba(34,197,94,0.1)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === "vencimentos" && (
        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
            <AlertOctagon className="w-5 h-5 text-yellow-500" />
            <div>
              <h3 className="font-bold text-sm text-white">Produtos com Validade Próxima (Janela Crítica)</h3>
              <p className="text-xs text-gray-400">Listagem de itens a vencer no próximo mês para liquidação programada</p>
            </div>
            <span className="bg-yellow-500/15 border border-yellow-500/20 text-yellow-500 text-xs font-mono font-bold ml-auto px-2.5 py-0.5 rounded-full">
              {itemsExpiringCount} alertas
            </span>
          </div>

          <div className="overflow-x-auto text-xs text-gray-300">
            <table id="expiring-report-table" className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                  <th className="py-2.5 px-2">Código</th>
                  <th className="py-2.5 px-2">Produto Estocado</th>
                  <th className="py-2.5 px-2">Categoria</th>
                  <th className="py-2.5 px-2 font-mono">Vencimento Org.</th>
                  <th className="py-2.5 px-2 text-right">Saldo Atual</th>
                  <th className="py-2.5 px-2 text-right">Preço Venda</th>
                  <th className="py-2.5 px-2 text-center">Status Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {products
                  .filter((p) => {
                    const today = new Date("2026-05-27");
                    const exp = new Date(p.validade);
                    const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return days <= 45; // 45 days limit
                  })
                  .map((prod) => {
                    const today = new Date("2026-05-27");
                    const exp = new Date(prod.validade);
                    const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-2 font-mono text-gray-400">{prod.codigoBarras}</td>
                        <td className="py-2.5 px-2 font-bold text-white">{prod.nome}</td>
                        <td className="py-2.5 px-2 text-gray-300">{prod.categoria}</td>
                        <td className="py-2.5 px-2 font-mono text-[10px] text-yellow-500">
                          {new Date(prod.validade).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold">{prod.quantidade} un</td>
                        <td className="py-2.5 px-2 text-right font-mono">R$ {prod.valorVenda.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${days <= 10 ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-yellow-500/15 text-yellow-500 border border-yellow-500/20"}`}>
                            {days <= 10 ? "Descarte / Liquidar" : `Queimar (${days} dias)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === "historico" && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-sky-950/20 border border-sky-500/10 p-5 rounded-3xl text-xs text-sky-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h4 className="font-semibold text-sm">Explorador & Histórico Consolidado de Vendas</h4>
            </div>
            <p>
              Consulte e agrupe todas as transações realizadas no estabelecimento. Altere a forma de agrupamento para totalizar os faturamentos **por Dia**, **por Mês** ou **por Ano** automaticamente, com suporte a filtros e detalhamento de dados por cupom emitido.
            </p>
          </div>

          {/* Interactive Filters Bar */}
          <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-[#FF6B00]" />
                Painel de Filtros
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* View Type buttons (Grouping Options) */}
                <div className="flex bg-[#1E293B] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setHistoryActiveViewType("todas-vendas")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${historyActiveViewType === "todas-vendas" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Vendas Detalhadas
                  </button>
                  <button
                    onClick={() => setHistoryActiveViewType("grupo-dia")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${historyActiveViewType === "grupo-dia" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Agrupado por Dia
                  </button>
                  <button
                    onClick={() => setHistoryActiveViewType("grupo-mes")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${historyActiveViewType === "grupo-mes" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Agrupado por Mês
                  </button>
                  <button
                    onClick={() => setHistoryActiveViewType("grupo-ano")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${historyActiveViewType === "grupo-ano" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Agrupado por Ano
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {/* Year filter input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono font-bold">Filtrar por Ano</label>
                <select
                  value={historyYearFilter}
                  onChange={(e) => {
                    setHistoryYearFilter(e.target.value);
                    setHistoryDayFilter("Todos");
                  }}
                  className="bg-[#1E293B] border border-white/5 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#FF6B00]/40 transition-colors"
                >
                  <option value="Todos">Todos os Anos</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month filter input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono font-bold">Filtrar por Mês</label>
                <select
                  value={historyMonthFilter}
                  disabled={historyActiveViewType === "grupo-ano"}
                  onChange={(e) => {
                    setHistoryMonthFilter(e.target.value);
                    setHistoryDayFilter("Todos");
                  }}
                  className="bg-[#1E293B] border border-white/5 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#FF6B00]/40 transition-colors disabled:opacity-40"
                >
                  {MONTHS_LIST.map(mo => (
                    <option key={mo.value} value={mo.value}>{mo.label}</option>
                  ))}
                </select>
              </div>

              {/* Day filter input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono font-bold">Filtrar por Dia</label>
                <select
                  value={historyDayFilter}
                  disabled={historyActiveViewType === "grupo-mes" || historyActiveViewType === "grupo-ano"}
                  onChange={(e) => setHistoryDayFilter(e.target.value)}
                  className="bg-[#1E293B] border border-white/5 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#FF6B00]/40 transition-colors disabled:opacity-40"
                >
                  <option value="Todos">Todos os Dias</option>
                  {Array.from({ length: 31 }, (_, idx) => {
                    const dayStr = (idx + 1).toString().padStart(2, "0");
                    return <option key={dayStr} value={dayStr}>{dayStr}</option>;
                  })}
                </select>
              </div>

              {/* Text search box */}
              <div className="flex flex-col lg:col-span-2 gap-1 col-span-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono font-bold">Buscar Transação</label>
                <div className="relative">
                  <input
                    type="text"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Buscar por ID, Cliente, Forma de Pagto..."
                    className="w-full bg-[#1E293B] border border-white/5 text-white rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-[#FF6B00]/40 transition-colors placeholder:text-gray-500"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Quick reset of filters */}
            {(historyYearFilter !== "Todos" || historyMonthFilter !== "Todos" || historyDayFilter !== "Todos" || historySearchTerm !== "") && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setHistoryYearFilter("Todos");
                    setHistoryMonthFilter("Todos");
                    setHistoryDayFilter("Todos");
                    setHistorySearchTerm("");
                  }}
                  className="text-[#FF6B00] hover:text-[#FF6B00]/80 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpar Todos os Filtros
                </button>
              </div>
            )}
          </div>

          {/* Statistics Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Faturamento Filtrado</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                R$ {filteredHistorySales.reduce((sum, s) => sum + s.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Transações que correspondem aos filtros</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Número de Cupons</span>
              <div className="text-xl font-bold text-white mt-1">
                {filteredHistorySales.length} {filteredHistorySales.length === 1 ? "venda" : "vendas"}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Sessões de PDV fechadas</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-[#FF6B00] uppercase font-mono font-bold">Ticket Médio</span>
              <div className="text-xl font-bold text-[#FF6B00] mt-1">
                R$ {(filteredHistorySales.length > 0 ? (filteredHistorySales.reduce((sum, s) => sum + s.total, 0) / filteredHistorySales.length) : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Média gasta por cliente/carrinho</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 p-5 rounded-2xl">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Unidades Vendidas</span>
              <div className="text-xl font-bold text-sky-400 mt-1">
                {filteredHistorySales.reduce((sum, s) => sum + s.itens.reduce((sumIt, it) => sumIt + it.quantidade, 0), 0)} un
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Total de produtos retirados do estoque</p>
            </div>
          </div>

          {/* Results Tables according to Selection Mode */}
          <div className="bg-[#0F172A] border border-white/5 p-6 rounded-3xl shadow-xl space-y-4">
            
            {/* 1. TODAS AS VENDAS DETALHADAS */}
            {historyActiveViewType === "todas-vendas" && (
              <div className="overflow-x-auto text-xs text-gray-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Código Cupom</th>
                      <th className="py-3 px-3">Data e Hora</th>
                      <th className="py-3 px-3">Cliente</th>
                      <th className="py-3 px-3 text-center">Itens comprados</th>
                      <th className="py-3 px-3">Forma Pagto</th>
                      <th className="py-3 px-3 text-right">Valor Total</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {filteredHistorySales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-500 font-mono">
                          Nenhuma venda localizada para os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredHistorySales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-white/5 transition-colors group">
                          <td className="py-3 px-3 font-mono text-gray-400 group-hover:text-white transition-colors">{sale.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-white">
                              {new Date(sale.data).toLocaleDateString("pt-BR")}
                            </span>{" "}
                            <span className="text-gray-500 font-mono text-[10px]">
                              {new Date(sale.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-white font-medium">{sale.clienteNome || "Consumidor Geral"}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{sale.clienteId ? "Cliente Fidelidade" : "Sem identificação"}</div>
                          </td>
                          <td className="py-3 px-3 text-center text-sky-400 font-semibold">
                            {sale.itens.reduce((sum, it) => sum + it.quantidade, 0)} un
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sale.formaPagamento === "PIX" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" :
                              sale.formaPagamento === "Dinheiro" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                              sale.formaPagamento === "Paylater" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                              "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            }`}>
                              {sale.formaPagamento}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white">
                            R$ {sale.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedDetailedSale(sale)}
                                className="bg-white/5 hover:bg-[#FF6B00] hover:text-white border border-white/10 px-3 py-1.5 rounded-lg font-bold text-[#FF6B00] transition-colors inline-flex items-center gap-1 active:scale-[0.98]"
                              >
                                Ver Cupom
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (currentUserRole !== "Administrador" && currentUserRole !== "Gerente") {
                                    setRoleError("Apenas usuários Administradores e Gerentes podem excluir vendas permanentemente!");
                                    return;
                                  }
                                  setSaleToDelete(sale.id);
                                }}
                                className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 p-2 rounded-lg transition-colors active:scale-[0.95]"
                                title="Excluir Venda (Apenas Administrador/Gerente)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. AGRUPADO POR DIA */}
            {historyActiveViewType === "grupo-dia" && (
              <div className="overflow-x-auto text-xs text-gray-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Dia da Operação</th>
                      <th className="py-3 px-3 text-center">Cupons Emitidos</th>
                      <th className="py-3 px-3 text-center">Itens Saídos (un)</th>
                      <th className="py-3 px-3 text-right">Ticket Médio</th>
                      <th className="py-3 px-3 text-right">Faturamento Total</th>
                      <th className="py-3 px-3 text-center">Ação Detalhar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {salesGroupedByDay.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500 font-mono">
                          Nenhum faturamento diário encontrado para as configurações de filtro.
                        </td>
                      </tr>
                    ) : (
                      salesGroupedByDay.map((grp) => {
                        const dateFormatted = new Date(grp.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                        return (
                          <tr key={grp.date} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white">{new Date(grp.date + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                              <div className="text-[10px] text-gray-500 capitalize">{dateFormatted}</div>
                            </td>
                            <td className="py-3.5 px-3 text-center text-white font-semibold font-mono">{grp.count}</td>
                            <td className="py-3.5 px-3 text-center text-sky-400 font-semibold font-mono">{grp.itemsCount} un</td>
                            <td className="py-3.5 px-3 text-right font-mono text-gray-300">R$ {grp.average.toFixed(2)}</td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">R$ {grp.total.toFixed(2)}</td>
                            <td className="py-3.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  // Drill down to this day
                                  const dateObj = new Date(grp.date + "T12:00:00");
                                  setHistoryYearFilter(dateObj.getFullYear().toString());
                                  setHistoryMonthFilter((dateObj.getMonth() + 1).toString().padStart(2, "0"));
                                  setHistoryDayFilter(dateObj.getDate().toString().padStart(2, "0"));
                                  setHistoryActiveViewType("todas-vendas");
                                }}
                                className="bg-sky-500/10 hover:bg-sky-500 border border-sky-500/20 text-sky-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all inline-flex items-center gap-1"
                              >
                                Filtrar Vendas do Dia
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. AGRUPADO POR MÊS */}
            {historyActiveViewType === "grupo-mes" && (
              <div className="overflow-x-auto text-xs text-gray-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Mês da Venda</th>
                      <th className="py-3 px-3 text-center">Cupons Emitidos</th>
                      <th className="py-3 px-3 text-center">Itens Saídos (un)</th>
                      <th className="py-3 px-3 text-right">Ticket Médio</th>
                      <th className="py-3 px-3 text-right">Faturamento Total</th>
                      <th className="py-3 px-3 text-center">Ação Detalhar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {salesGroupedByMonth.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500 font-mono">
                          Nenhum faturamento mensal encontrado para as configurações.
                        </td>
                      </tr>
                    ) : (
                      salesGroupedByMonth.map((grp) => (
                        <tr key={`${grp.year}-${grp.month}`} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-3">
                            <div className="font-bold text-white text-sm">{grp.label}</div>
                            <div className="text-[10px] text-gray-500 font-mono">Período de referência acumulado</div>
                          </td>
                          <td className="py-4 px-3 text-center text-white font-semibold font-mono">{grp.count}</td>
                          <td className="py-4 px-3 text-center text-sky-400 font-semibold font-mono">{grp.itemsCount} un</td>
                          <td className="py-4 px-3 text-right font-mono text-gray-300">R$ {grp.average.toFixed(2)}</td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-emerald-400">R$ {grp.total.toFixed(2)}</td>
                          <td className="py-4 px-3 text-center">
                            <button
                              onClick={() => {
                                // Drill down to this month
                                setHistoryYearFilter(grp.year);
                                setHistoryMonthFilter(grp.month);
                                setHistoryDayFilter("Todos");
                                setHistoryActiveViewType("grupo-dia");
                              }}
                              className="bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all inline-flex items-center gap-1"
                            >
                              Ver Detalhes do Mês
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. AGRUPADO POR ANO */}
            {historyActiveViewType === "grupo-ano" && (
              <div className="overflow-x-auto text-xs text-gray-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Exercício Fiscal (Ano)</th>
                      <th className="py-3 px-3 text-center">Faturamento Registrado</th>
                      <th className="py-3 px-3 text-center">Cupons Auditados</th>
                      <th className="py-3 px-3 text-center">Itens Distribuidos</th>
                      <th className="py-3 px-3 text-right">Faturamento Consolidado</th>
                      <th className="py-3 px-3 text-center">Ação Detalhar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {salesGroupedByYear.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500 font-mono">
                          Nenhum faturamento anual encontrado para este histórico.
                        </td>
                      </tr>
                    ) : (
                      salesGroupedByYear.map((grp) => (
                        <tr key={grp.year} className="hover:bg-white/5 transition-colors">
                          <td className="py-5 px-3">
                            <div className="font-bold text-white text-base">Exercício de {grp.year}</div>
                            <div className="text-[10px] text-gray-500 font-mono">Total acumulativo da loja</div>
                          </td>
                          <td className="py-5 px-3 text-center text-gray-300 font-mono">R$ {grp.average.toFixed(2)} (méd)</td>
                          <td className="py-5 px-3 text-center text-white font-semibold font-mono">{grp.count} vendas</td>
                          <td className="py-5 px-3 text-center text-sky-400 font-semibold font-mono">{grp.itemsCount} produtos</td>
                          <td className="py-5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">R$ {grp.total.toFixed(2)}</td>
                          <td className="py-5 px-3 text-center">
                            <button
                              onClick={() => {
                                // Drill down to this year
                                setHistoryYearFilter(grp.year);
                                setHistoryMonthFilter("Todos");
                                setHistoryDayFilter("Todos");
                                setHistoryActiveViewType("grupo-mes");
                              }}
                              className="bg-purple-500/10 hover:bg-purple-500 border border-purple-500/20 text-purple-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all inline-flex items-center gap-3"
                            >
                              Ver Meses deste Ano
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DETAIL MODAL OVERLAY (RECEIPT VIEW) */}
          {selectedDetailedSale && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                {/* Header title */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#FF6B00]" />
                    <h3 className="font-bold text-white text-sm">CUPOM FISCAL DETALHADO #{selectedDetailedSale.id}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedDetailedSale(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Simulated Thermal Ticket wrapper */}
                <div className="p-6 overflow-y-auto bg-gray-50 text-gray-800 font-sans flex-1">
                  <div className="border border-dashed border-gray-300 p-4 bg-white rounded shadow-sm text-[11px] font-mono leading-relaxed space-y-3">
                    {/* Establishment Info */}
                    <div className="text-center space-y-1 pb-3 border-b border-gray-200">
                      <div className="font-bold text-[12px] uppercase">PARE E LEVE SUPERMERCADO</div>
                      <div>CNPJ: 14.509.323/0001-09</div>
                      <div>Rua das Flores, 452 - Centro</div>
                      <div>Telefone: (11) 3452-1920</div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 pb-2 border-b border-gray-200 text-left">
                      <div><strong>NFC-e Nº:</strong> {selectedDetailedSale.id}</div>
                      <div><strong>DATA:</strong> {new Date(selectedDetailedSale.data).toLocaleString("pt-BR")}</div>
                      <div><strong>OPERADOR:</strong> Jackson Pereira (PDV)</div>
                      <div><strong>CLIENTE:</strong> {selectedDetailedSale.clienteNome || "Consumidor Geral"}</div>
                    </div>

                    {/* Sales items table */}
                    <div className="space-y-1.5 pb-2 border-b border-gray-200">
                      <div className="flex justify-between font-bold border-b border-gray-200 pb-1 uppercase">
                        <div>Item / Descrição</div>
                        <div className="text-right">QTD x V.UN = V.TOT</div>
                      </div>
                      {selectedDetailedSale.itens.map((it, index) => (
                        <div key={it.id || index} className="flex justify-between text-left">
                          <div className="truncate max-w-[180px]">{index + 1}. {it.nomeProduto}</div>
                          <div className="text-right whitespace-nowrap shrink-0 ml-2">
                            {it.quantidade} un x R$ {it.valorUnitario.toFixed(2)} = R$ {it.valorTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial sums and change */}
                    <div className="space-y-1 text-right text-[12px] pb-2 border-b border-gray-200">
                      <div className="flex justify-between">
                        <div>SUBTOTAL:</div>
                        <div>R$ {selectedDetailedSale.subtotal.toFixed(2)}</div>
                      </div>
                      {selectedDetailedSale.desconto > 0 && (
                        <div className="flex justify-between text-red-600">
                          <div>DESCONTO:</div>
                          <div>-R$ {selectedDetailedSale.desconto.toFixed(2)}</div>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-[13px] border-t border-gray-100 pt-1">
                        <div>VALOR LÍQUIDO:</div>
                        <div>R$ {selectedDetailedSale.total.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Payments modes */}
                    <div className="space-y-1 text-left">
                      <div><strong>FORMA PAGAMENTO:</strong> {selectedDetailedSale.formaPagamento}</div>
                      <div className="text-[9px] text-gray-500 italic">Tributos incidentes (Lei 12741/12): Alíquota aprox. de C.O.G.S: 18% inclusa no preço.</div>
                    </div>

                    {/* Footer barcode/qrcode representation */}
                    <div className="text-center pt-3 border-t border-gray-200 space-y-1.5">
                      <div className="inline-block bg-gray-200 p-2 text-[10px] font-bold tracking-widest uppercase rounded">
                        * {selectedDetailedSale.id} *
                      </div>
                      <div className="text-[9px] text-gray-500">OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE!</div>
                    </div>
                  </div>
                </div>

                {/* Actions bottom footer */}
                <div className="p-4 border-t border-white/5 bg-[#1E293B] flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) {
                        alert("Favores autorize a abertura de pop-ups!");
                        return;
                      }
                      const thermalContent = `
                        <html>
                        <head>
                          <title>Imprimir Cupom ${selectedDetailedSale.id}</title>
                          <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 72mm; margin: 4mm auto; padding: 0; background: #fff; color: #000; }
                            .center { text-align: center; }
                            .bold { font-weight: bold; }
                            .title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                            .dashed-line { border-bottom: 1px dashed #000; margin: 8px 0; }
                            .flex-between { display: flex; justify-content: space-between; }
                            table { width: 100%; border-collapse: collapse; }
                            td { font-size: 11px; padding: 2px 0; }
                            .text-right { text-align: right; }
                          </style>
                        </head>
                        <body>
                          <div class="center title">PARE E LEVE SUPERMERCADO</div>
                          <div class="center">CNPJ: 14.509.323/0001-09</div>
                          <div class="center">Rua das Flores, 452 - Centro</div>
                          <div class="center">Telefone: (11) 3452-1920</div>
                          <div class="dashed-line"></div>
                          <div><b>NFC-e Nº:</b> ${selectedDetailedSale.id}</div>
                          <div><b>DATA:</b> ${new Date(selectedDetailedSale.data).toLocaleString("pt-BR")}</div>
                          <div><b>OPERADOR:</b> Jackson Pereira</div>
                          <div><b>CLIENTE:</b> ${selectedDetailedSale.clienteNome || "Consumidor Geral"}</div>
                          <div class="dashed-line"></div>
                          <div class="bold flex-between">
                            <span>DESCRIÇÃO</span>
                            <span>VALOR</span>
                          </div>
                          <div class="dashed-line"></div>
                          <table>
                            ${selectedDetailedSale.itens.map((it, idx) => `
                              <tr>
                                <td>${idx + 1}. ${it.nomeProduto.substring(0, 20)}</td>
                                <td class="text-right">${it.quantidade}x R$${it.valorUnitario.toFixed(2)} = R$${it.valorTotal.toFixed(2)}</td>
                              </tr>
                            `).join("")}
                          </table>
                          <div class="dashed-line"></div>
                          <div class="flex-between">
                            <span>SUBTOTAL:</span>
                            <span>R$ ${selectedDetailedSale.subtotal.toFixed(2)}</span>
                          </div>
                          ${selectedDetailedSale.desconto > 0 ? `
                          <div class="flex-between" style="color: red;">
                            <span>DESCONTO:</span>
                            <span>-R$ ${selectedDetailedSale.desconto.toFixed(2)}</span>
                          </div>` : ""}
                          <div class="flex-between bold font-size: 12px;">
                            <span>VALOR LÍQUIDO:</span>
                            <span>R$ ${selectedDetailedSale.total.toFixed(2)}</span>
                          </div>
                          <div class="dashed-line"></div>
                          <div><b>FORMA PAGAMENTO:</b> ${selectedDetailedSale.formaPagamento}</div>
                          <div class="dashed-line"></div>
                          <div class="center" style="font-size: 10px;">OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE!</div>
                          <script>
                            window.onload = function() {
                              window.focus();
                              window.print();
                            }
                          </script>
                        </body>
                        </html>
                      `;
                      printWindow.document.write(thermalContent);
                      printWindow.document.close();
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-sky-400" />
                    Enviar p/ Impressora Termica
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDetailedSale.id);
                      alert("Segunda via identificadora copiada para área de transferência!");
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Copiar Código ID
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailedSale(null)}
                    className="bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
                  >
                    Fechar Cupom
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão de Venda</h3>
            <p className="text-gray-300 text-sm mb-6">
              Você tem certeza de que deseja excluir permanentemente a venda <span className="font-semibold text-red-400">#{saleToDelete}</span>? 
              Esta ação recalculará todo o faturamento, lucro, histórico e estoque vinculado, bem como atualizará o banco de dados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteSale && onDeleteSale(saleToDelete);
                  setSaleToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Access Denied Modal */}
      {roleError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="text-red-500 text-4xl mb-4 font-bold flex justify-center">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2">Acesso Restrito</h3>
            <p className="text-gray-300 text-sm mb-6">
              {roleError}
            </p>
            <button
              onClick={() => setRoleError(null)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
