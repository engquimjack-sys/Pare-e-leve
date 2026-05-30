/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Calculator,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  BadgeAlert,
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
  Trash2
} from "lucide-react";
import { ContaPagar, ContaReceber, Fornecedor, Cliente, Produto, Venda } from "../types";

interface FinancialViewProps {
  payables: ContaPagar[];
  receivables: ContaReceber[];
  suppliers: Fornecedor[];
  clients: Cliente[];
  onAddPayable: (bill: Omit<ContaPagar, "id">) => void;
  onAddReceivable: (bill: Omit<ContaReceber, "id">) => void;
  onPayBill: (id: string) => void;
  onReceiveBill: (id: string) => void;
  products?: Produto[];
  sales?: Venda[];
  currentUserRole?: string;
  onDeletePayable?: (id: string) => void;
  onDeleteReceivable?: (id: string) => void;
}

export default function FinancialView({
  payables,
  receivables,
  suppliers,
  clients,
  onAddPayable,
  onAddReceivable,
  onPayBill,
  onReceiveBill,
  products = [],
  sales = [],
  currentUserRole,
  onDeletePayable,
  onDeleteReceivable,
}: FinancialViewProps) {
  // Local toggles
  const [activeTab, setActiveTab] = useState<"contas_pagar" | "contas_receber">("contas_pagar");
  const [isAddingBill, setIsAddingBill] = useState(false);

  // Custom states for modal safe deletions and warnings without iframe constraints
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "payable" | "receivable"; descricao: string } | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Filters & Row expansion for Contas a Receber (Paylater details)
  const [clientFilter, setClientFilter] = useState("");
  const [expandedReceivableId, setExpandedReceivableId] = useState<string | null>(null);

  // New payable/receivable forms states
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState<number>(0);
  const [selectedFornecedor, setSelectedFornecedor] = useState("");
  const [selectedCliente, setSelectedCliente] = useState("");
  const [dueDate, setDueDate] = useState("2026-06-05");
  const [expenseCat, setExpenseCat] = useState<ContaPagar["categoriaGasto"]>("Compras");
  const [receivableType, setReceivableType] = useState<ContaReceber["formaRecebimento"]>("Crediário");

  // Summary financials
  const totalPaid = useMemo(() => {
    return payables.filter((p) => p.status === "Pago").reduce((sum, p) => sum + p.valor, 0);
  }, [payables]);

  const totalToPay = useMemo(() => {
    return payables.filter((p) => p.status === "Pendente").reduce((sum, p) => sum + p.valor, 0);
  }, [payables]);

  const totalReceived = useMemo(() => {
    return receivables.filter((r) => r.status === "Recebido").reduce((sum, r) => sum + r.valor, 0);
  }, [receivables]);

  const totalToReceive = useMemo(() => {
    return receivables.filter((r) => r.status === "Pendente").reduce((sum, r) => sum + r.valor, 0);
  }, [receivables]);

  // Filtered receivables for Contas a Receber (Paylater & standard receivables)
  const filteredReceivablesList = useMemo(() => {
    if (!clientFilter.trim()) {
      return receivables;
    }
    const term = clientFilter.toLowerCase();
    return receivables.filter((r) => r.clienteNome?.toLowerCase().includes(term));
  }, [receivables, clientFilter]);

  // Total balance of selected filtered receivables list which are Pendente
  const filteredPendingTotal = useMemo(() => {
    return filteredReceivablesList
      .filter((r) => r.status === "Pendente")
      .reduce((sum, r) => sum + r.valor, 0);
  }, [filteredReceivablesList]);

  // Total of all matchings (sum of columns for filtered search)
  const filteredAllTotal = useMemo(() => {
    return filteredReceivablesList.reduce((sum, r) => sum + r.valor, 0);
  }, [filteredReceivablesList]);

  // Form handle
  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || val <= 0) return;

    if (activeTab === "contas_pagar") {
      const forn = suppliers.find((s) => s.id === selectedFornecedor);
      onAddPayable({
        descricao: desc,
        valor: val,
        fornecedorId: forn?.id,
        fornecedorNome: forn?.nome || "Geral/Serviços",
        dataVencimento: dueDate,
        status: "Pendente",
        categoriaGasto: expenseCat,
      });
    } else {
      const cli = clients.find((c) => c.id === selectedCliente);
      onAddReceivable({
        descricao: desc,
        valor: val,
        clienteId: cli?.id,
        clienteNome: cli?.nome || "Geral/Consumidor",
        dataVencimento: dueDate,
        status: "Pendente",
        formaRecebimento: receivableType,
      });
    }

    // Reset fields
    setDesc("");
    setVal(0);
    setSelectedFornecedor("");
    setSelectedCliente("");
    setIsAddingBill(false);
  };

  const downloadReport = (format: "pdf" | "excel") => {
    if (format === "excel") {
      let csvContent = "\uFEFF";
      csvContent += "PARE E LEVE SUPERMERCADOS LTDA;DRE - DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO\n";
      csvContent += `CNPJ: 14.509.323/0001-09;Período: Consolidado Geral (2026)\n\n`;
      csvContent += "CONTA / DESIGNATOR;VALOR CONTÁBIL (R$);INDICAÇÃO (% RECEITA)\n";
      
      const receitaBruta = sales.reduce((sum, s) => sum + s.total, 0);
      const deducoes = receitaBruta * 0.045;
      const receitaLiquida = receitaBruta - deducoes;
      
      let cmv = 0;
      sales.forEach(s => {
        s.itens.forEach(it => {
          const p = products.find(prod => prod.id === it.produtoId);
          if (p) {
            cmv += p.valorCompra * it.quantidade;
          } else {
            cmv += it.valorTotal * 0.65;
          }
        });
      });
      
      const resultadoBruto = receitaLiquida - cmv;
      const paidPayables = payables.filter(p => p.status === "Pago");
      const imp = paidPayables.filter(p => p.categoriaGasto === "Impostos").reduce((sum, p) => sum + p.valor, 0);
      const sal = paidPayables.filter(p => p.categoriaGasto === "Funcionários").reduce((sum, p) => sum + p.valor, 0);
      const infra = paidPayables.filter(p => p.categoriaGasto === "Energia" || p.categoriaGasto === "Água" || p.categoriaGasto === "Internet").reduce((sum, p) => sum + p.valor, 0);
      const serv = paidPayables.filter(p => p.categoriaGasto === "Limpeza").reduce((sum, p) => sum + p.valor, 0);
      const out = paidPayables.filter(p => p.categoriaGasto === "Outros").reduce((sum, p) => sum + p.valor, 0);
      const totalDespesas = imp + sal + serv + infra + out; 
      
      const outrasReceitas = receivables.filter(r => r.status === "Recebido").reduce((sum, r) => sum + r.valor, 0);
      const resultadoLiquido = resultadoBruto - totalDespesas + outrasReceitas;

      const pct = (val: number) => receitaBruta > 0 ? ((val / receitaBruta) * 100).toFixed(2) + "%" : "0.00%";

      csvContent += `(1) RECEITA BRUTA DE VENDAS;${receitaBruta.toFixed(2).replace(".", ",")};${pct(receitaBruta)}\n`;
      csvContent += `(-) Impostos s/ Vendas (Simples Nacional 4.5%);-${deducoes.toFixed(2).replace(".", ",")};-${pct(deducoes)}\n`;
      csvContent += `(=) RECEITA OPERACIONAL LÍQUIDA;${receitaLiquida.toFixed(2).replace(".", ",")};${pct(receitaLiquida)}\n`;
      csvContent += `(-) CUSTO DAS MERCADORIAS VENDIDAS (C.M.V.);-${cmv.toFixed(2).replace(".", ",")};-${pct(cmv)}\n`;
      csvContent += `(=) RESULTADO BRUTO DO EXERCÍCIO;${resultadoBruto.toFixed(2).replace(".", ",")};${pct(resultadoBruto)}\n`;
      
      csvContent += `\nDESPESAS OPERACIONAIS GERAIS (PAGAS);;\n`;
      csvContent += `(-) Tributos e Encargos Fiscais;-${imp.toFixed(2).replace(".", ",")};-${pct(imp)}\n`;
      csvContent += `(-) Despesas com Funcionários / Salários / Encargos;-${sal.toFixed(2).replace(".", ",")};-${pct(sal)}\n`;
      csvContent += `(-) Serviços de Limpeza / Conservação;-${serv.toFixed(2).replace(".", ",")};-${pct(serv)}\n`;
      csvContent += `(-) Concessionárias (Energia / Água / Internet);-${infra.toFixed(2).replace(".", ",")};-${pct(infra)}\n`;
      csvContent += `(-) Outras Despesas Ordinárias / Aluguel;-${out.toFixed(2).replace(".", ",")};-${pct(out)}\n`;
      csvContent += `(=) TOTAL DAS DESPESAS OPERACIONAIS;-${totalDespesas.toFixed(2).replace(".", ",")};-${pct(totalDespesas)}\n`;
      
      csvContent += `\nOUTROS RESULTADOS GERAIS;;\n`;
      csvContent += `(+) Receitas Financeiras / Crediários Recebidos;${outrasReceitas.toFixed(2).replace(".", ",")};${pct(outrasReceitas)}\n`;
      csvContent += `(=) RESULTADO LÍQUIDO DO EXERCÍCIO;${resultadoLiquido.toFixed(2).replace(".", ",")};${pct(resultadoLiquido)}\n`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `DRE_Pare_Leve_Supermercados_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const receitaBruta = sales.reduce((sum, s) => sum + s.total, 0);
      const deducoes = receitaBruta * 0.045;
      const receitaLiquida = receitaBruta - deducoes;
      
      let cmv = 0;
      sales.forEach(s => {
        s.itens.forEach(it => {
          const p = products.find(prod => prod.id === it.produtoId);
          if (p) cmv += p.valorCompra * it.quantidade;
          else cmv += it.valorTotal * 0.65;
        });
      });
      
      const resultadoBruto = receitaLiquida - cmv;
      const paidPayables = payables.filter(p => p.status === "Pago");
      const imp = paidPayables.filter(p => p.categoriaGasto === "Impostos").reduce((sum, p) => sum + p.valor, 0);
      const sal = paidPayables.filter(p => p.categoriaGasto === "Funcionários").reduce((sum, p) => sum + p.valor, 0);
      const infra = paidPayables.filter(p => p.categoriaGasto === "Energia" || p.categoriaGasto === "Água" || p.categoriaGasto === "Internet").reduce((sum, p) => sum + p.valor, 0);
      const serv = paidPayables.filter(p => p.categoriaGasto === "Limpeza").reduce((sum, p) => sum + p.valor, 0);
      const out = paidPayables.filter(p => p.categoriaGasto === "Outros").reduce((sum, p) => sum + p.valor, 0);
      const totalDespesas = imp + sal + serv + infra + out;
      const outrasReceitas = receivables.filter(r => r.status === "Recebido").reduce((sum, r) => sum + r.valor, 0);
      const resultadoLiquido = resultadoBruto - totalDespesas + outrasReceitas;

      const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pct = (v: number) => receitaBruta > 0 ? ((v / receitaBruta) * 100).toFixed(1) + "%" : "0.0%";

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Bloqueador de pop-ups ativo! Por favor, autorize a abertura de pop-ups para imprimir o relatório.");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>DRE - Demostração de Resultado - Pare e Leve</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; }
              .header { border-bottom: 2px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 24px; color: #ea580c; }
              .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .table th { background-color: #f8fafc; color: #334155; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
              .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
              .bold { font-weight: bold; background-color: #f8fafc; }
              .highlight { background-color: #ffedd5; font-weight: bold; color: #ea580c; border-top: 1px solid #fed7aa; border-bottom: 2px solid #ea580c!important; }
              .sub-total { background-color: #f1f5f9; font-weight: bold; }
              .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
              .desc { font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PARE E LEVE SUPERMERCADOS LTDA</h1>
              <p>DRE - Demonstrativo de Resultado de Exercício Consolidado</p>
              <p>CNPJ: 14.509.323/0001-09 | Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}</p>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Estrutura da Conta</th>
                  <th style="text-align: right;">Valor Acumulado</th>
                  <th style="text-align: right;">% s/ Rec. Bruta</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold">
                  <td class="desc">RECEITA OPERACIONAL BRUTA DE VENDAS</td>
                  <td style="text-align: right;">${fmt(receitaBruta)}</td>
                  <td style="text-align: right;">${pct(receitaBruta)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Impostos s/ Vendas e Tributos Recorrentes (4.5%)</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(deducoes)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(deducoes)}</td>
                </tr>
                <tr class="sub-total">
                  <td class="desc">(=) RECEITA OPERACIONAL OPERATIVA LÍQUIDA</td>
                  <td style="text-align: right;">${fmt(receitaLiquida)}</td>
                  <td style="text-align: right;">${pct(receitaLiquida)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Custo de Mercadorias Vendidas (C.M.V.)</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(cmv)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(cmv)}</td>
                </tr>
                <tr class="bold" style="background-color: #f1f5f9;">
                  <td class="desc">(=) RESULTADO BRUTO OPERACIONAL</td>
                  <td style="text-align: right;">${fmt(resultadoBruto)}</td>
                  <td style="text-align: right;">${pct(resultadoBruto)}</td>
                </tr>
                
                <tr><td colspan="3" style="background-color: #f8fafc; font-weight: bold; font-size: 11px; padding: 6px 10px;">DESPESAS OPERACIONAIS (PAGAS)</td></tr>
                <tr>
                  <td class="desc">(-) Impostos & Taxas Operativas Administrativas</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(imp)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(imp)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Gastos com Pessoal, Salários e Pró-Labore</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(sal)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(sal)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Serviços Contábeis e Terceirizados</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(serv)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(serv)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Infraestrutura, Aluguel e Telecom</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(infra)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(infra)}</td>
                </tr>
                <tr>
                  <td class="desc">(-) Despesas Diversas Contábeis</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(out)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(out)}</td>
                </tr>
                <tr class="sub-total">
                  <td class="desc">(=) TOTAL DAS DESPESAS OPERACIONAIS FINANCEIRAS</td>
                  <td style="text-align: right; color: #dc2626;">-${fmt(totalDespesas)}</td>
                  <td style="text-align: right; color: #dc2626;">-${pct(totalDespesas)}</td>
                </tr>

                <tr><td colspan="3" style="background-color: #f8fafc; font-weight: bold; font-size: 11px; padding: 6px 10px;">OUTROS RESULTADOS OPERACIONAIS</td></tr>
                <tr>
                  <td class="desc">(+) Convênios Recebidos de Clientes</td>
                  <td style="text-align: right; color: #16a34a;">${fmt(outrasReceitas)}</td>
                  <td style="text-align: right; color: #16a34a;">${pct(outrasReceitas)}</td>
                </tr>
                
                <tr class="highlight">
                  <td class="desc">(=) RESULTADO LÍQUIDO CONCEITUAL</td>
                  <td style="text-align: right;">${fmt(resultadoLiquido)}</td>
                  <td style="text-align: right;">${pct(resultadoLiquido)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <p>Relatório DRE extraído do Sistema Retaguarda Pare e Leve v4.12.</p>
              <p>Emitente: Jackson Pereira - Administrador de Sistemas</p>
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper consolidation bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Contas a Pagar (Pendentes)</span>
            <div className="text-lg font-bold text-red-400 mt-1">
              R$ {totalToPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Despesas Liquidadas (Mês)</span>
            <div className="text-lg font-bold text-gray-300 mt-1">
              R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl text-gray-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Contas a Receber (Prazo)</span>
            <div className="text-lg font-bold text-cyan-400 mt-1">
              R$ {totalToReceive.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono font-bold">Ingressos Recebidos</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary table area with Tab select */}
      <div className="bg-[#0F172A] border border-white/5 rounded-3xl shadow-xl overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-[#1E293B] p-1.5 rounded-2xl border border-white/5 max-w-fit">
            <button
              onClick={() => { setActiveTab("contas_pagar"); setIsAddingBill(false); }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === "contas_pagar" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Contas a Pagar (Saídas)
            </button>
            <button
              onClick={() => { setActiveTab("contas_receber"); setIsAddingBill(false); }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === "contas_receber" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Contas a Receber (Convênios)
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => downloadReport("excel")}
              className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 font-medium transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>DRE Excel</span>
            </button>
            <button
              onClick={() => downloadReport("pdf")}
              className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 font-medium transition-all"
            >
              <FileText className="w-4 h-4 text-red-400" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={() => setIsAddingBill(true)}
              className="bg-[#FF6B00] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/10"
            >
              <Plus className="w-4 h-4" />
              Lançar Boleto
            </button>
          </div>
        </div>

        {/* Content table */}
        <div>
          {activeTab === "contas_pagar" ? (
            <div className="overflow-x-auto">
              <table id="payables-table" className="w-full text-left text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                    <th className="py-3 px-2">Descrição da Conta</th>
                    <th className="py-3 px-2">Beneficiário / Fornecedor</th>
                    <th className="py-3 px-2">Data Vencimento</th>
                    <th className="py-3 px-2">Classificação</th>
                    <th className="py-3 px-2 text-right">Valor Original</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-2 text-right">Liquidação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">Nenhuma conta de saída registrada.</td>
                    </tr>
                  ) : (
                    payables.map((bill) => (
                      <tr key={bill.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 font-medium text-white">{bill.descricao}</td>
                        <td className="py-3 px-2 text-gray-400">{bill.fornecedorNome || "Geral / Despesa Fixa"}</td>
                        <td className="py-3 px-2 font-mono text-[10px]">{bill.dataVencimento}</td>
                        <td className="py-3 px-2">
                          <span className="text-[10px] bg-red-500/10 text-red-400 rounded-full py-0.5 px-2.5 border border-red-500/10">
                            {bill.categoriaGasto}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold">R$ {bill.valor.toFixed(2)}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${bill.status === "Pago" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-500"}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {bill.status === "Pendente" ? (
                              <button
                                onClick={() => onPayBill(bill.id)}
                                className="text-[10px] bg-[#FF6B00]/10 hover:bg-[#FF6B00] hover:text-white border border-[#FF6B00]/20 px-2.5 py-1 rounded-lg transition-all active:scale-95 text-xs text-[#FF6B00] font-semibold"
                              >
                                Dar Baixa (Pagar)
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-mono">Faturada OK</span>
                            )}
                            <button
                              onClick={() => {
                                if (currentUserRole !== "Administrador") {
                                  setRoleError("Apenas usuários Administradores podem excluir lançamentos marcados no contas a pagar!");
                                  return;
                                }
                                setDeleteConfirm({ id: bill.id, type: "payable", descricao: bill.descricao });
                              }}
                              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 p-2 rounded-lg transition-colors active:scale-[0.95]"
                              title="Excluir Pagamento (Apenas Administrador)"
                            >
                              <Trash2 className="w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client filter block with totals */}
              <div className="bg-[#1E293B]/40 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full relative">
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase font-mono mb-1.5">Pesquisar por Cliente (Filtro Contrato / Paylater)</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientFilter}
                      onChange={(e) => {
                        setClientFilter(e.target.value);
                        setExpandedReceivableId(null); // Close active expansion when filtering to keep UI clean
                      }}
                      placeholder="Digitar nome do cliente..."
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-2 px-3 pl-9 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF6B00]/40 transition-all font-sans"
                    />
                    <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                    {clientFilter && (
                      <button
                        onClick={() => setClientFilter("")}
                        className="absolute right-3 top-2 text-gray-400 hover:text-white text-xs font-semibold"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {clientFilter && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-4 items-center w-full md:w-auto"
                  >
                    <div className="bg-amber-500/10 border border-amber-500/15 p-2 px-4 rounded-xl text-right flex-1 md:flex-initial">
                      <span className="text-[9px] text-amber-400 uppercase font-mono font-bold block">Pendente de Recebimento</span>
                      <span className="text-sm font-extrabold text-amber-300 font-mono">
                        R$ {filteredPendingTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-cyan-500/10 border border-cyan-500/15 p-2 px-4 rounded-xl text-right flex-1 md:flex-initial">
                      <span className="text-[9px] text-cyan-400 uppercase font-mono font-bold block">Total Geral das Compras</span>
                      <span className="text-sm font-extrabold text-cyan-300 font-mono">
                        R$ {filteredAllTotal.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table id="receivables-table" className="w-full text-left text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-2 text-center w-8">#</th>
                      <th className="py-3 px-2">Fatura / Origem</th>
                      <th className="py-3 px-2">Titular / Cliente</th>
                      <th className="py-3 px-2">Data Vencimento</th>
                      <th className="py-3 px-2">Modalidade</th>
                      <th className="py-3 px-2 text-right">Valor Lançado</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">Liquidação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReceivablesList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-gray-500">Nenhuma conta de recebimento que corresponda ao filtro.</td>
                      </tr>
                    ) : (
                      filteredReceivablesList.map((bill) => {
                        const hasMultipleItems = bill.itens && bill.itens.length > 1;
                        return (
                          <React.Fragment key={bill.id}>
                            <tr
                              className={`transition-colors duration-150 ${hasMultipleItems ? "cursor-pointer hover:bg-white/5" : "hover:bg-white/5"} ${expandedReceivableId === bill.id ? "bg-white/5 border-l-2 border-amber-500" : ""}`}
                              onClick={() => {
                                if (hasMultipleItems) {
                                  setExpandedReceivableId((prev) => (prev === bill.id ? null : bill.id));
                                }
                              }}
                              title={hasMultipleItems ? "Clique para expandir o detalhamento de itens" : undefined}
                            >
                              <td className="py-3 px-2 text-center">
                                {hasMultipleItems ? (
                                  <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                    {expandedReceivableId === bill.id ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-600 font-mono">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 font-medium text-white flex items-center gap-1.5">
                                {bill.descricao}
                              </td>
                              <td className="py-3 px-2 text-gray-400">{bill.clienteNome || "Consumidor Geral"}</td>
                              <td className="py-3 px-2 font-mono text-[10px]">{bill.dataVencimento}</td>
                              <td className="py-3 px-2">
                                <span className={`text-[10px] rounded-full py-0.5 px-2.5 border ${bill.descricao.toLowerCase().includes("paylater") ? "bg-amber-500/10 text-amber-400 border-amber-500/10" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/10"}`}>
                                  {bill.descricao.toLowerCase().includes("paylater") ? "Paylater" : bill.formaRecebimento}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-semibold">R$ {bill.valor.toFixed(2)}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${bill.status === "Recebido" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-500"}`}>
                                  {bill.status === "Recebido" ? "Recebido" : "Pendente"}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  {bill.status === "Pendente" ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Avoid triggering accordion expand
                                        onReceiveBill(bill.id);
                                      }}
                                      className="text-[10px] bg-[#FF6B00]/10 hover:bg-[#FF6B00] hover:text-white border border-[#FF6B00]/20 px-2.5 py-1 rounded-lg transition-all active:scale-95 text-[#FF6B00] font-semibold"
                                    >
                                      Receber Duplicata
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-500 font-mono">Recebida OK</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (currentUserRole !== "Administrador") {
                                        setRoleError("Apenas usuários Administradores podem excluir lançamentos do contas a receber!");
                                        return;
                                      }
                                      setDeleteConfirm({ id: bill.id, type: "receivable", descricao: bill.descricao });
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 p-2 rounded-lg transition-colors active:scale-[0.95]"
                                    title="Excluir Lançamento (Apenas Administrador)"
                                  >
                                    <Trash2 className="w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded items section */}
                            {expandedReceivableId === bill.id && bill.itens && (
                              <tr className="bg-[#0e1626]/40">
                                <td colSpan={8} className="p-4">
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="border border-amber-500/10 rounded-2xl overflow-hidden bg-[#0a111e]/90 p-4 space-y-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                                      <h5 className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest font-mono">
                                        Detalhamento da Compra ({bill.itens.length} itens)
                                      </h5>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs text-gray-300">
                                        <thead>
                                          <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono">
                                            <th className="py-2 px-1">Produto</th>
                                            <th className="py-2 px-1 text-center">Quant.</th>
                                            <th className="py-2 px-1 text-right">Preço Unit.</th>
                                            <th className="py-2 px-1 text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                          {bill.itens.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-all">
                                              <td className="py-2 px-1 text-white font-medium">{item.nomeProduto}</td>
                                              <td className="py-2 px-1 text-center font-mono font-bold text-gray-300">{item.quantidade}x</td>
                                              <td className="py-2 px-1 text-right font-mono text-gray-400">R$ {item.valorUnitario.toFixed(2)}</td>
                                              <td className="py-2 px-1 text-right font-mono text-amber-400 font-bold">R$ {item.valorTotal.toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="border-t border-white/5 pt-2 flex flex-col sm:flex-row justify-between items-center text-[10px] gap-2">
                                      <span className="text-gray-400">
                                        Dia da Compra: <span className="font-mono text-white font-bold">{bill.dataCompra || "Especificada hoje"}</span>
                                      </span>
                                      <span className="text-gray-400">
                                        Data de Vencimento: <span className="font-mono text-white font-bold">{bill.dataVencimento}</span>
                                      </span>
                                      <span className="font-bold text-white">
                                        Total Cupom: <span className="font-mono text-amber-400 text-xs">R$ {bill.valor.toFixed(2)}</span>
                                      </span>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bill creation dialog spacer */}
      {isAddingBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            <h2 className="text-base font-bold text-white mb-4">
              {activeTab === "contas_pagar" ? "Registrar Nova Conta a Pagar" : "Lançar Duplicata a Receber"}
            </h2>

            <form onSubmit={handleCreateBill} className="space-y-4 text-xs text-gray-300">
              <div className="space-y-1 font-sans">
                <label className="text-[10px] text-gray-400">Descrição / Título do Documento</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={activeTab === "contas_pagar" ? "Ex: Conta de Luz CPFL maio" : "Ex: Receber Venda Pires mensalidade"}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={val || ""}
                    onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
              </div>

              {activeTab === "contas_pagar" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Categoria de Despesa</label>
                    <select
                      value={expenseCat}
                      onChange={(e) => setExpenseCat(e.target.value as any)}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none text-xs text-white"
                    >
                      <option value="Compras">Compras</option>
                      <option value="Energia">Energia / Eletricidade</option>
                      <option value="Água">Água comercial</option>
                      <option value="Internet">Internet / Banda Larga</option>
                      <option value="Funcionários">Funcionários / CLT</option>
                      <option value="Impostos">Impostos / Simples</option>
                      <option value="Limpeza">Lojas & Limpeza</option>
                      <option value="Outros">Outros gerais</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Para qual Fornecedor? (Opcional)</label>
                    <select
                      value={selectedFornecedor}
                      onChange={(e) => setSelectedFornecedor(e.target.value)}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none text-xs text-white"
                    >
                      <option value="">Nenhum/Despesa Fixa</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Modalidade de Faturamento</label>
                    <select
                      value={receivableType}
                      onChange={(e) => setReceivableType(e.target.value as any)}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none text-xs text-white"
                    >
                      <option value="Crediário">Crediário Tradicional</option>
                      <option value="Mensalidade">Mensalidade Cliente Fiel</option>
                      <option value="Fidelidade">Regaste Cashback</option>
                      <option value="Outro">Outros recebimentos</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Vincular Conta ao Cliente (Opcional)</label>
                    <select
                      value={selectedCliente}
                      onChange={(e) => setSelectedCliente(e.target.value)}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none text-xs text-white"
                    >
                      <option value="">Nenhum/Consumidor Geral</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingBill(false)}
                  className="bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all shadow-md"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-300 text-sm mb-6">
              Você tem certeza de que deseja realizar a exclusão permanente de{" "}
              <span className="font-semibold text-red-400">"{deleteConfirm.descricao}"</span>? 
              {deleteConfirm.type === "payable" 
                ? " Esta ação removerá definitivamente o lançamento do contas a pagar."
                : " Esta ação removerá definitivamente o lançamento do contas a receber."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "payable") {
                    onDeletePayable && onDeletePayable(deleteConfirm.id);
                  } else {
                    onDeleteReceivable && onDeleteReceivable(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
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
