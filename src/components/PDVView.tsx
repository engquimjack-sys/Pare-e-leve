/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Search,
  ShoppingCart,
  Percent,
  CreditCard,
  QrCode,
  DollarSign,
  User,
  Plus,
  Minus,
  Trash2,
  Lock,
  Unlock,
  Printer,
  X,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { Produto, Cliente, CaixaSessao, Venda, ItemVenda } from "../types";

interface PDVViewProps {
  products: Produto[];
  clients: Cliente[];
  activeSession: CaixaSessao | null;
  onOpenSession: (valorInicial: number) => void;
  onCloseSession: () => void;
  onCommitVenda: (venda: Omit<Venda, "id">) => void;
}

export default function PDVView({
  products,
  clients,
  activeSession,
  onOpenSession,
  onCloseSession,
  onCommitVenda,
}: PDVViewProps) {
  // PDV Local States
  const [cart, setCart] = useState<Omit<ItemVenda, "id">[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [inputQty, setInputQty] = useState<number>(1);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"R$" | "%">("R$");

  // Payment states
  const [linkClienteId, setLinkClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<Venda["formaPagamento"]>("PIX");
  const [cashReceived, setCashReceived] = useState<string>("");

  // Session initial opening float state
  const [openingFloat, setOpeningFloat] = useState<number>(150);
  const [confirmClosingSession, setConfirmClosingSession] = useState(false);

  // Receipt popup state
  const [receiptVenda, setReceiptVenda] = useState<Venda | null>(null);

  // Categories list
  const categories = ["Todas", ...Array.from(new Set(products.map((p) => p.categoria)))];

  // Filters for catalog panel (right side of interface)
  const availableGridProducts = products.filter((prod) => {
    const matchesSearch = prod.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || prod.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Basket calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.valorTotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === "R$") {
      return Math.min(subtotal, discountValue);
    } else {
      return parseFloat(((subtotal * discountValue) / 100).toFixed(2));
    }
  }, [subtotal, discountValue, discountType]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const calculatedChange = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    if (formaPagamento !== "Dinheiro" || received < total) return 0;
    return received - total;
  }, [cashReceived, total, formaPagamento]);

  // Actions
  const handleAddToCart = (prod: Produto, qtyToAdd: number = 1) => {
    if (!activeSession) {
      alert("Por favor, ABRIR O CAIXA antes de adicionar itens de venda.");
      return;
    }
    const existingIndex = cart.findIndex((item) => item.produtoId === prod.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      const nextQty = updated[existingIndex].quantidade + qtyToAdd;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantidade: nextQty,
        valorTotal: parseFloat((nextQty * prod.valorVenda).toFixed(2)),
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          produtoId: prod.id,
          nomeProduto: prod.nome,
          quantidade: qtyToAdd,
          valorUnitario: prod.valorVenda,
          valorTotal: parseFloat((prod.valorVenda * qtyToAdd).toFixed(2)),
        },
      ]);
    }
  };

  const handleAdjustQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const nextQty = updated[index].quantidade + delta;
    if (nextQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index] = {
        ...updated[index],
        quantidade: nextQty,
        valorTotal: parseFloat((nextQty * updated[index].valorUnitario).toFixed(2)),
      };
    }
    setCart(updated);
  };

  const handleSetQuantity = (index: number, newQty: number) => {
    const updated = [...cart];
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index] = {
        ...updated[index],
        quantidade: newQty,
        valorTotal: parseFloat((newQty * updated[index].valorUnitario).toFixed(2)),
      };
    }
    setCart(updated);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const found = products.find((p) => p.codigoBarras === barcodeInput || p.id === barcodeInput);
    if (found) {
      handleAddToCart(found, inputQty);
      setBarcodeInput("");
      setInputQty(1); // Reset base
    } else {
      alert("Código de barras não cadastrado. Cadastre no módulo Estoque.");
    }
  };

  const handleCheckoutCommit = () => {
    if (!activeSession) {
      alert("Caixa Fechado!");
      return;
    }
    if (cart.length === 0) {
      alert("Adicione produtos ao carrinho antes da liquidação.");
      return;
    }
    if (formaPagamento === "Dinheiro" && (parseFloat(cashReceived) || 0) < total) {
      alert("Valor pago menor que o total da compra.");
      return;
    }

    const linkedClient = clients.find((c) => c.id === linkClienteId);

    const novaVenda: Omit<Venda, "id"> = {
      data: new Date().toISOString(),
      itens: cart.map((item, index) => ({
        ...item,
        id: `itv-${index}-${Date.now()}`
      })),
      subtotal,
      desconto: discountAmount,
      total,
      formaPagamento,
      clienteId: linkedClient?.id,
      clienteNome: linkedClient?.nome,
    };

    // Trigger parent action
    onCommitVenda(novaVenda);

    // Save mock recipe structure for instant display popup
    const simulatedReceipt: Venda = {
      ...novaVenda,
      id: `ticket-${Math.floor(1000 + Math.random() * 9000)}-2026`,
    };
    setReceiptVenda(simulatedReceipt);

    // Clear cart reset
    setCart([]);
    setDiscountValue(0);
    setCashReceived("");
    setLinkClienteId("");
  };

  return (
    <div className="space-y-6">
      {/* 1. Open/Close Register Session HUD */}
      <div className="bg-[#0F172A] border border-white/5 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${activeSession ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"}`}>
            {activeSession ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white">Frente de Caixa Terminal #01</h2>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${activeSession ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                {activeSession ? "Operando (Caixa Aberto)" : "Caixa Fechado"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeSession
                ? `Operador: Jackson Oliveira | Fundos: R$ ${activeSession.valorInicial} | Vendas: ${activeSession.vendasTotais} registradas`
                : "Abertura diária necessária para validação de cupons fiscais."}
            </p>
          </div>
        </div>

        <div>
          {activeSession ? (
            confirmClosingSession ? (
              <div className="flex items-center gap-2 bg-[#1E293B] border border-red-500/30 p-2 rounded-xl animate-fade-in">
                <span className="text-xs text-[#FFF] font-semibold font-sans">Deseja fechar o caixa?</span>
                <button
                  onClick={() => {
                    onCloseSession();
                    setConfirmClosingSession(false);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  Sim, Fechar
                </button>
                <button
                  onClick={() => setConfirmClosingSession(false)}
                  className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClosingSession(true)}
                className="bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 px-4 py-2 text-xs font-semibold rounded-xl transition-all"
              >
                Fechar Caixa do Dia
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">Fundo de Troco:</span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-[#1E293B] border border-white/10 p-2 rounded-xl text-center text-xs text-white font-mono"
              />
              <button
                onClick={() => onOpenSession(openingFloat)}
                className="bg-[#FF6B00] hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/10"
              >
                Abrir Turno
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main split screens */}
      {activeSession ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Checkout & Basket Panel (Left 5-columns) */}
          <div className="xl:col-span-5 bg-[#0F172A] border border-white/5 rounded-3xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#FF6B00]" />
                <h3 className="font-bold text-sm text-white">Carrinho Corrente</h3>
              </div>
              <span className="text-[10px] font-mono bg-white/5 text-gray-300 px-2 py-0.5 rounded-md">
                {cart.length} itens inclusos
              </span>
            </div>

            {/* Quantidade a Inserir e Simulação de Código de Barras */}
            <div className="flex gap-2 items-center">
              <div className="w-[85px] shrink-0 space-y-1">
                <span className="text-[10px] text-gray-400 font-medium font-sans">Qtd. Multiplicador</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  value={inputQty || ""}
                  onChange={(e) => setInputQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1E293B] border border-white/10 text-center text-xs text-white rounded-xl py-2.5 outline-none focus:border-[#FF6B00] font-mono"
                  title="Quantidade do item a ser incluído"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-400 font-medium font-sans">Simular Código de Barras / ID</span>
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Digite ID ou Código de Barras..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 text-[11px] text-white rounded-xl py-2.5 pl-3 pr-12 outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[9px] px-2 py-1 rounded-md"
                  >
                    Enter
                  </button>
                </form>
              </div>
            </div>

            {/* Shopping cart products list */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  Carrinho Vazio. Use o leitor acima ou clique nos produtos do catálogo ao lado.
                </div>
              ) : (
                cart.map((item, index) => (
                  <div
                    key={`${item.produtoId}-${index}`}
                    className="flex justify-between items-center bg-[#1E293B]/40 p-3 rounded-2xl border border-white/5"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold text-white text-xs truncate">{item.nomeProduto}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        unidade R$ {item.valorUnitario.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustQuantity(index, -1)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white rounded-md active:scale-90"
                        title="Diminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          handleSetQuantity(index, isNaN(val) || val <= 0 ? 0 : val);
                        }}
                        onBlur={() => {
                          if (!item.quantidade || item.quantidade <= 0) {
                            handleSetQuantity(index, 1);
                          }
                        }}
                        className="font-mono text-xs w-11 text-center bg-[#1E293B] border border-white/10 rounded-lg py-1 text-white focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/40"
                      />
                      <button
                        onClick={() => handleAdjustQuantity(index, 1)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white rounded-md active:scale-90"
                        title="Incrementar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right w-20 shrink-0 font-bold text-xs text-white pl-2">
                      R$ {item.valorTotal.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Link & Discounts panel */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Link customer */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-medium">Cliente (Clube Fidelidade)</span>
                  <div className="relative">
                    <select
                      value={linkClienteId}
                      onChange={(e) => setLinkClienteId(e.target.value)}
                      className="w-full bg-[#1E293B] border border-white/10 text-[11px] text-white rounded-xl py-2 px-2 pl-7 outline-none"
                    >
                      <option value="">Consumidor Avulso</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>

                {/* Apply discount */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-medium">Desconto de Venda</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setDiscountType("R$"); setDiscountValue(0); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded ${discountType === "R$" ? "bg-[#FF6B00]/25 text-[#FF6B00]" : "bg-white/5 text-gray-400"}`}
                      >
                        R$
                      </button>
                      <button
                        onClick={() => { setDiscountType("%"); setDiscountValue(0); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded ${discountType === "%" ? "bg-[#FF6B00]/25 text-[#FF6B00]" : "bg-white/5 text-gray-400"}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#1E293B] border border-white/10 text-[11px] text-white rounded-xl py-2 px-2 outline-none text-right font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Pricing calculations details (Subtotal, Discount, Total) */}
            <div className="bg-[#1E293B]/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs font-sans">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal dos Itens</span>
                <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Desconto Concedido</span>
                <span className="font-mono">-R$ {discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm border-t border-white/5 pt-2">
                <span>Total a Pagar</span>
                <span className="font-mono text-[#FF6B00]">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Liquidation controls */}
            <div className="space-y-3">
              <span className="text-[10px] text-gray-400 font-semibold block uppercase font-mono">Forma de Pagamento</span>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-white">
                <button
                  onClick={() => setFormaPagamento("PIX")}
                  className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all ${formaPagamento === "PIX" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-[#1E293B] border-white/5 hover:bg-[#1E293B]/70"}`}
                >
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  PIX
                </button>
                <button
                  onClick={() => setFormaPagamento("Crédito")}
                  className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all ${formaPagamento === "Crédito" ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-[#1E293B] border-white/5 hover:bg-[#1E293B]/70"}`}
                >
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Crédito
                </button>
                <button
                  onClick={() => setFormaPagamento("Débito")}
                  className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all ${formaPagamento === "Débito" ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" : "bg-[#1E293B] border-white/5 hover:bg-[#1E293B]/70"}`}
                >
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  Débito
                </button>
                <button
                  onClick={() => setFormaPagamento("Dinheiro")}
                  className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all ${formaPagamento === "Dinheiro" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-[#1E293B] border-white/5 hover:bg-[#1E293B]/70"}`}
                >
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Dinheiro
                </button>
              </div>

              {/* Dinheiro specifics (cash change calculation helper) */}
              {formaPagamento === "Dinheiro" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-emerald-950/20 border border-emerald-500/10 p-3.5 rounded-2xl grid grid-cols-2 gap-3"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Dinheiro Recebido</label>
                    <input
                      type="number"
                      required
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="R$ 0.00"
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Troco Requerido</label>
                    <div className="text-sm font-bold font-mono text-emerald-400 py-2">
                      R$ {calculatedChange.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Commit button */}
              <button
                onClick={handleCheckoutCommit}
                className="w-full bg-[#FF6B00] hover:bg-orange-600 font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 text-white text-xs transition-all tracking-wider uppercase active:scale-98 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 ml-1" />
                Fechar Venda (Emitir Cupom)
              </button>
            </div>
          </div>

          {/* Touchscreen Catalog Panel (Right 7-columns) */}
          <div className="xl:col-span-7 bg-[#0F172A] border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Catálogo de Produtos</h3>
                <p className="text-[10px] text-gray-400">Adicione itens ao caixa com apenas um toque</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#1E293B] border border-white/10 text-xs text-white rounded-xl py-2 px-3 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 text-[11px] text-white rounded-xl py-2 pl-7 pr-3 outline-none"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Bento Grid catalog */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {availableGridProducts.map((prod) => {
                const isOutOfStock = prod.quantidade <= 0;
                return (
                  <motion.div
                    key={prod.id}
                    whileTap={isOutOfStock ? {} : { scale: 0.98 }}
                    onClick={() => {
                      if (!isOutOfStock) {
                        handleAddToCart(prod, inputQty);
                        setInputQty(1); // Reset multiplier back to 1
                      }
                    }}
                    className={`bg-[#1E293B]/40 p-3 rounded-2xl border border-white/10 cursor-pointer hover:bg-[#1E293B]/80 hover:border-[#FF6B00]/40 transition-all select-none flex flex-col justify-between h-44 relative group overflow-hidden ${isOutOfStock ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                  >
                    <div>
                      {/* Product photo with quick badges */}
                      <div className="relative w-full h-20 rounded-xl overflow-hidden mb-2 bg-[#0F172A] border border-white/5">
                        <img
                          src={prod.fotoUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150"}
                          alt={prod.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-[8px] font-mono font-bold text-gray-300 px-1 py-0.2 rounded-md">
                          Est: {prod.quantidade} un
                        </span>
                      </div>
                      <h4 className="text-[11px] font-semibold text-white leading-tight truncate">{prod.nome}</h4>
                      <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider font-mono">{prod.marca}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                      <span className="font-bold text-xs text-[#FF6B00] font-mono">
                        R$ {prod.valorVenda.toFixed(2)}
                      </span>
                      <span className="p-1 bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/25 rounded-lg text-[9px] group-hover:bg-[#FF6B00] group-hover:text-white transition-all font-semibold">
                        + Incluir
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-12 text-center text-gray-400 shadow-xl space-y-4">
          <Lock className="w-12 h-12 mx-auto text-[#FF6B00] opacity-80" />
          <h2 className="text-base font-bold text-white">Terminal Fora de Serviço</h2>
          <p className="text-xs max-w-sm mx-auto">
            Este PDV requer abertura de sessão de caixa. Defina um fundo de troco inicial no painel superior e clique em "Abrir Turno" para iniciar a emissão de cupons.
          </p>
        </div>
      )}

      {/* 3. Detailed Thermal Receipt Modal */}
      {receiptVenda && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-80 bg-white text-gray-900 font-mono text-xs rounded-2xl shadow-2xl p-5 relative max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={() => setReceiptVenda(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 bg-gray-100 p-1.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Thermal look Header */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-gray-400 pb-3">
              <span className="inline-block text-lg font-bold uppercase tracking-tight">PARE E LEVE SUPERMERCADO</span>
              <p className="text-[10px] text-gray-600">Av. das Nações, 2309 - São Paulo - SP</p>
              <p className="text-[10px] text-gray-600">CNPJ: 14.509.323/0001-09</p>
              <p className="text-[10px] text-gray-500 font-sans mt-2">CUPOM FISCAL SIMULADO</p>
            </div>

            {/* Ticket parameters */}
            <div className="space-y-1 mb-3 text-[10px] text-gray-700">
              <div>Venda ID: {receiptVenda.id}</div>
              <div className="whitespace-pre">Data: {new Date(receiptVenda.data).toLocaleString("pt-BR")}</div>
              {receiptVenda.clienteNome && <div>Cliente: {receiptVenda.clienteNome}</div>}
              <div>Operador: Caixa 01 Jackson O.</div>
            </div>

            <div className="border-b border-dashed border-gray-400 pb-2 mb-2" />

            {/* Receipt Items */}
            <div className="space-y-1 text-[11px] text-gray-800">
              {receiptVenda.itens.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <div className="truncate w-44">{idx + 1}. {it.nomeProduto}</div>
                  <div>{it.quantidade}x R${it.valorUnitario.toFixed(2)}</div>
                  <div className="font-bold">R${it.valorTotal.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-gray-400 py-1 mb-2" />

            {/* Totals calc */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>R$ {receiptVenda.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>DESCONTO</span>
                <span>-R$ {receiptVenda.desconto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-sm">
                <span>TOTAL</span>
                <span>R$ {receiptVenda.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 font-sans text-[10px] pt-1">
                <span>MÉTODO</span>
                <span>{receiptVenda.formaPagamento}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 py-1 mt-2 mb-3" />

            {/* Footer barkode */}
            <div className="text-center space-y-2">
              <div className="bg-gray-100 py-2 flex flex-col items-center justify-center rounded-lg">
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest font-mono">
                  |||||| |||| |||||| |||| ||||||| |||
                </span>
                <span className="text-[8px] text-gray-500 font-mono mt-1">{receiptVenda.id}</span>
              </div>

              <button
                onClick={() => { alert("Simulando impressão em bobina térmica de cupom fiscal de 80mm..."); }}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-sans font-bold py-2 rounded-xl flex items-center justify-center gap-2 mt-4"
              >
                <Printer className="w-4 h-4 text-orange-400" />
                Imprimir Via Física
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
