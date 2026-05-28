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
  Download
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
}

export default function ReportsView({
  products,
  sales,
  payables,
  receivables,
}: ReportsProps) {
  const [selectedReport, setSelectedReport] = useState<"vendas" | "margens" | "vencimentos">("vendas");
  const [reportPeriod, setReportPeriod] = useState<"dia" | "semana" | "mes" | "ano" | "todos">("mes");

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
          <div className="flex bg-[#1E293B] p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setSelectedReport("vendas")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${selectedReport === "vendas" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Vendas & Evolução
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
          {selectedReport !== "vencimentos" && (
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
    </div>
  );
}
