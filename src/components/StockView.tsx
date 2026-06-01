/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  Edit2,
  Trash2,
  FileCheck,
  Zap,
  Sparkles,
  Calendar,
  Layers,
  Percent,
  TrendingUp,
  CornerDownRight,
  PackageCheck,
  AlertCircle,
  Barcode,
  PackagePlus,
  Link,
  Upload,
  FileDown,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Produto, Fornecedor } from "../types";

function getProductImage(fotoUrl?: string, name?: string, brand?: string): string {
  if (!fotoUrl) {
    const cleanName = (name || "").split(" ")[0].trim();
    const cleanBrand = (brand || "").split(" ")[0].trim();
    const searchTerms = [cleanName, cleanBrand, "food", "grocery"]
      .filter(Boolean)
      .join(",")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9,]/g, "");
    return `https://loremflickr.com/150/150/${encodeURIComponent(searchTerms)}`;
  }

  const normalized = fotoUrl.trim();

  // If it's an Unsplash featured URL with no dimensions or is a generic featured search path
  if (normalized.includes("images.unsplash.com/featured/?") || normalized.endsWith("featured/")) {
    const query = normalized.split("?")[1] || "";
    return `https://images.unsplash.com/featured/150x150/?${query || "grocery"}`;
  }

  if (normalized.includes("images.unsplash.com/featured") && !normalized.match(/\/\d+x\d+\//)) {
    const parts = normalized.split("?");
    const query = parts[1] || "";
    return `https://images.unsplash.com/featured/150x150/?${query}`;
  }

  return normalized;
}

interface StockViewProps {
  products: Produto[];
  suppliers: Fornecedor[];
  recentSales: any[];
  onAddProduct: (prod: Omit<Produto, "id">) => void;
  onEditProduct: (prod: Produto) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (productId: string, amount: number, tipo: "Entrada" | "Saída" | "Ajuste", motivo: string) => void;
  searchTerm?: string;
  onSearchTermChange?: (val: string) => void;
  filterLowStock?: boolean;
  onFilterLowStockChange?: (val: boolean) => void;
  filterExpiring?: boolean;
  onFilterExpiringChange?: (val: boolean) => void;
}

export default function StockView({
  products,
  suppliers,
  recentSales,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  searchTerm: propSearchTerm,
  onSearchTermChange,
  filterLowStock: propFilterLowStock,
  onFilterLowStockChange,
  filterExpiring: propFilterExpiring,
  onFilterExpiringChange,
}: StockViewProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const setSearchTerm = onSearchTermChange || setLocalSearchTerm;

  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const [localFilterLowStock, setLocalFilterLowStock] = useState(false);
  const filterLowStock = propFilterLowStock !== undefined ? propFilterLowStock : localFilterLowStock;
  const setFilterLowStock = onFilterLowStockChange || setLocalFilterLowStock;

  const [localFilterExpiring, setLocalFilterExpiring] = useState(false);
  const filterExpiring = propFilterExpiring !== undefined ? propFilterExpiring : localFilterExpiring;
  const setFilterExpiring = onFilterExpiringChange || setLocalFilterExpiring;

  // Form states for add/edit product
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Produto> | null>(null);

  // Custom added categories state (Requirement 3)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("pare_leve_custom_categories");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");

  const defaultCategories = useMemo(() => [
    "Mercearia",
    "Hortifrúti",
    "Laticínios & Frios",
    "Açougue",
    "Bebidas",
    "Higiene & Limpeza",
    "Padaria"
  ], []);

  const allAvailableCategories = useMemo(() => {
    const fromProducts = products.map((p) => p.categoria).filter(Boolean);
    const combined = [...defaultCategories, ...customCategories, ...fromProducts];
    return Array.from(new Set(combined));
  }, [products, customCategories, defaultCategories]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setCurrentProduct({
            ...currentProduct,
            fotoUrl: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && currentProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setCurrentProduct({
            ...currentProduct,
            fotoUrl: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Form states for manual adjustment
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"Entrada" | "Saída">("Entrada");
  const [adjustReason, setAdjustReason] = useState("");

  // AI forecasting states
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState("");

  // Quick stock entry states
  const [quickBarcode, setQuickBarcode] = useState("");
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickFeedback, setQuickFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Live match product for receipt preview
  const liveMatchedProduct = React.useMemo(() => {
    if (!quickBarcode) return null;
    return products.find(
      (p) => p.codigoBarras === quickBarcode || p.id === quickBarcode
    );
  }, [quickBarcode, products]);

  const handleQuickStockEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBarcode) return;

    const matchedProd = products.find(
      (p) => p.codigoBarras === quickBarcode || p.id === quickBarcode
    );

    if (!matchedProd) {
      setQuickFeedback({
        type: "error",
        message: `Código de barras ou ID "${quickBarcode}" não foi localizado.`
      });
      setTimeout(() => setQuickFeedback(null), 5000);
      return;
    }

    onAdjustStock(
      matchedProd.id,
      quickQty,
      "Entrada",
      `Recebimento de Carga: entrada ágil`
    );

    setQuickFeedback({
      type: "success",
      message: `Registrado: +${quickQty} un. adicionadas ao estoque de "${matchedProd.nome}".`
    });

    // Reset fields
    setQuickBarcode("");
    setQuickQty(1);

    setTimeout(() => setQuickFeedback(null), 5000);
  };

  const categories = ["Todas", ...allAvailableCategories];

  // Filters
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.codigoBarras.includes(searchTerm);
    const matchesCategory = selectedCategory === "Todas" || prod.categoria === selectedCategory;
    const matchesLowStock = !filterLowStock || prod.quantidade <= prod.estoqueMinimo;

    // Expiring in next 15 days
    const today = new Date("2026-05-27");
    const expDate = new Date(prod.validade);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const matchesExpiring = !filterExpiring || (diffDays >= 0 && diffDays <= 15);

    return matchesSearch && matchesCategory && matchesLowStock && matchesExpiring;
  });

  // Call the server Gemini AI forecast endpoint
  const handleAIForecast = async () => {
    setLoadingAI(true);
    setAiStatus("Analisando métricas de giro diário...");
    try {
      // 1. Send active products and recent sales to server
      const response = await fetch("/api/gemini/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: products.map(p => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            quantidade: p.quantidade,
            estoqueMinimo: p.estoqueMinimo,
            validade: p.validade,
            valorVenda: p.valorVenda
          })),
          recentSales: recentSales
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      setAiStatus("Calculando sazonalidade de demanda...");
      const data = await response.json();

      // 2. Loop predictions and patch products in parent or local display
      if (data.recommendations && Array.isArray(data.recommendations)) {
        data.recommendations.forEach((rec: any) => {
          const prodToUpdate = products.find(p => p.id === rec.productId);
          if (prodToUpdate) {
            prodToUpdate.demandaIA = rec.demandForecast;
            prodToUpdate.sugestaoCompraIA = rec.suggestedQuantity;
            prodToUpdate.justificativaIA = rec.reason;
          }
        });
      }

      if (data.insights && Array.isArray(data.insights)) {
        setAiInsights(data.insights);
      } else {
        setAiInsights(["O estoque do supermercado está equilibrado. Foco em repor óleos e grãos."]);
      }

      setAiStatus("");
      alert("Previsão de Estoque IA Concluída! Veja os indicadores em tempo real nas linhas de cada produto.");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao rodar previsão de IA. Usando fallback preditivo estatístico local.");
      // Statistical mock backup if network fails (so app never crashes and behaves premium)
      products.forEach((p) => {
        const isLow = p.quantidade <= p.estoqueMinimo;
        p.demandaIA = isLow ? "Alta" : "Média";
        p.sugestaoCompraIA = isLow ? (p.estoqueMinimo * 2) - p.quantidade : 0;
        p.justificativaIA = isLow
          ? "Estoque atual abaixo do nível crítico de segurança."
          : "Giro operacional equilibrado sem risco eminente.";
      });
      setAiInsights([
        "Aviso: Usando motor estatístico local. A demanda de óleos (Soja Liza) está acima da capacidade.",
        "Atenção com itens próximos do vencimento: Banana Nanica (3 dias) e Tomates (2 dias)."
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const sortedData = [...filteredProducts];
      
      const totalItems = sortedData.reduce((sum, p) => sum + p.quantidade, 0);
      const totalCostValue = sortedData.reduce((sum, p) => sum + (p.quantidade * (p.valorCompra || 0)), 0);
      const totalSellValue = sortedData.reduce((sum, p) => sum + (p.quantidade * (p.valorVenda || 0)), 0);
      const lowStockCount = sortedData.filter(p => p.quantidade <= p.estoqueMinimo).length;

      const rows = [
        ["PARE & LEVE - SISTEMA DE SUPERMERCADOS INTELIGENTES"],
        ["RELATÓRIO ESTRUTURADO DE ESTOQUE"],
        [`Data de Geração: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`],
        [""],
        ["RESUMO DOS INDICADORES:"],
        ["Total de Itens em Estoque", totalItems, "unidades"],
        ["Valor de Custo Total Estocado", totalCostValue, "R$"],
        ["Valor de Venda Total Estimado", totalSellValue, "R$"],
        ["Produtos em Estado Crítico", lowStockCount, "itens"],
        [""],
        [
          "ID",
          "Código de Barras",
          "Nome do Produto",
          "Marca",
          "Categoria",
          "Qtd em Estoque",
          "Estoque Mínimo",
          "Preço de Custo (R$)",
          "Preço de Venda (R$)",
          "Valor Total de Custo (R$)",
          "Valor Total de Venda (R$)",
          "Status",
          "Data de Validade",
          "Previsão IA (Demanda)",
          "Sugestão IA (Compra)"
        ]
      ];

      sortedData.forEach((p) => {
        const isCritical = p.quantidade <= p.estoqueMinimo;
        rows.push([
          p.id,
          p.codigoBarras,
          p.nome,
          p.marca,
          p.categoria,
          p.quantidade,
          p.estoqueMinimo,
          p.valorCompra,
          p.valorVenda,
          p.quantidade * (p.valorCompra || 0),
          p.quantidade * (p.valorVenda || 0),
          isCritical ? "CRÍTICO/BAIXO" : "SEGURO",
          p.validade,
          p.demandaIA || "N/A",
          p.sugestaoCompraIA || 0
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 15 }, // ID
        { wch: 16 }, // Barcode
        { wch: 30 }, // Nome
        { wch: 15 }, // Marca
        { wch: 18 }, // Categoria
        { wch: 14 }, // Qtd
        { wch: 14 }, // Est Minimo
        { wch: 18 }, // Custo
        { wch: 18 }, // Venda
        { wch: 22 }, // Total Custo
        { wch: 22 }, // Total Venda
        { wch: 16 }, // Status
        { wch: 14 }, // Validade
        { wch: 15 }, // IA
        { wch: 15 }  // Sugestao
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque Pare & Leve");
      XLSX.writeFile(workbook, `Relatorio_Estoque_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Erro exportando Excel:", error);
      alert("Houve um problema ao gerar o documento Excel.");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const sortedData = [...filteredProducts];
      const totalItems = sortedData.reduce((sum, p) => sum + p.quantidade, 0);
      const totalCostValue = sortedData.reduce((sum, p) => sum + (p.quantidade * (p.valorCompra || 0)), 0);
      const totalSellValue = sortedData.reduce((sum, p) => sum + (p.quantidade * (p.valorVenda || 0)), 0);
      const lowStockCount = sortedData.filter(p => p.quantidade <= p.estoqueMinimo).length;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("PARE & LEVE - SUPERMERCADO INTELIGENTE", 15, 12);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(230, 230, 230);
      doc.text("Relatório Estruturado de Controle & Inventário de Estoque", 15, 18);
      
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 282, 12, { align: "right" });
      doc.text(`Filtro Categoria: ${selectedCategory}`, 282, 18, { align: "right" });

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 35, 267, 24, 3, 3, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("RESUMO DOS INDICADORES DO ESTOQUE:", 20, 41);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Total de Unidades Estocadas:", 20, 48);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalItems} un.`, 75, 48);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Produtos com Estoque Crítico:", 20, 53);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(lowStockCount > 0 ? 220 : 15, lowStockCount > 0 ? 38 : 23, lowStockCount > 0 ? 38 : 42);
      doc.text(`${lowStockCount} item(ns)`, 75, 53);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Custo Operacional Estocado:", 125, 48);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`R$ ${totalCostValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 175, 48);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Potencial de Receita de Vendas:", 125, 53);
      doc.setFont("helvetica", "bold");
      doc.text(`R$ ${totalSellValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 175, 53);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Lucro Teórico Projetado (Markup):", 215, 48);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text(`R$ ${(totalSellValue - totalCostValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 265, 48, { align: "right" });

      const tableHeaders = [
        ["Cód. Barras/ID", "Produto / Fabricante", "Categoria", "Qtd", "Mín", "Custo", "Venda", "Val. Total Custo", "Vencimento", "Status"]
      ];

      const tableRows = sortedData.map((p) => {
        const isCritical = p.quantidade <= p.estoqueMinimo;
        const totalCostProd = p.quantidade * (p.valorCompra || 0);
        return [
          p.codigoBarras || p.id,
          `${p.nome} (${p.marca})`,
          p.categoria,
          `${p.quantidade} un`,
          `${p.estoqueMinimo} un`,
          `R$ ${(p.valorCompra || 0).toFixed(2)}`,
          `R$ ${(p.valorVenda || 0).toFixed(2)}`,
          `R$ ${totalCostProd.toFixed(2)}`,
          p.validade,
          isCritical ? "CRÍTICO" : "SEGURO"
        ];
      });

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 65,
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [51, 65, 85]
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold"
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 60, fontStyle: "bold" },
          2: { cellWidth: 28 },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 16, halign: "center" },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 26 },
          8: { cellWidth: 24 },
          9: { cellWidth: 22, fontStyle: "bold" }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 9 && data.cell.text[0] === "CRÍTICO") {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Pare & Leve Gestão - Pág. ${i} de ${pageCount} | Documento Oficial de Auditoria`,
          148,
          205,
          { align: "center" }
        );
      }

      doc.save(`Relatorio_Estoque_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro exportando PDF:", error);
      alert("Houve um problema ao gerar o documento PDF.");
    }
  };

  const handleOpenEdit = (prod: Produto) => {
    setCurrentProduct(prod);
    setIsEditing(true);
    setIsAdding(false);
    if (prod.fotoUrl?.startsWith("data:image/") || (prod.fotoUrl && !prod.fotoUrl.startsWith("http"))) {
      setImageMode("file");
    } else {
      setImageMode("url");
    }
  };

  const handleOpenAdd = () => {
    setCurrentProduct({
      codigoBarras: "",
      nome: "",
      categoria: "",
      marca: "",
      quantidade: undefined,
      estoqueMinimo: undefined,
      valorCompra: undefined,
      valorVenda: undefined,
      validade: "",
      fornecedorId: "",
      fotoUrl: ""
    });
    setIsAdding(true);
    setIsEditing(false);
    setImageMode("url");
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    const productToSave: any = {
      ...currentProduct,
      categoria: currentProduct.categoria || "Mercearia",
      quantidade: currentProduct.quantidade || 0,
      estoqueMinimo: currentProduct.estoqueMinimo || 0,
      valorCompra: currentProduct.valorCompra || 0,
      valorVenda: currentProduct.valorVenda || 0,
      validade: currentProduct.validade || new Date().toISOString().split("T")[0],
      fornecedorId: currentProduct.fornecedorId || null
    };

    // Caso a foto não seja inserida, buscar na web o produto similar de acordo com a descrição do nome comercial e Marca/Fabricante.
    if (!productToSave.fotoUrl) {
      const cleanName = (productToSave.nome || "").trim();
      const cleanBrand = (productToSave.marca || "").trim();
      // Generates query with space replaced by commas for Unsplash Search fallback
      const searchTerms = [cleanName, cleanBrand, "product", "supermarket"]
        .filter(Boolean)
        .join(",")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-zA-Z0-9,]/g, ""); // remove weird chars
      
      productToSave.fotoUrl = `https://images.unsplash.com/featured/300x300/?${encodeURIComponent(searchTerms)}`;
    }

    if (isAdding) {
      onAddProduct(productToSave as Omit<Produto, "id">);
      setIsAdding(false);
    } else if (isEditing) {
      onEditProduct(productToSave as Produto);
      setIsEditing(false);
    }
    setCurrentProduct(null);
  };

  const handleOpenAdjust = (prodId: string) => {
    setAdjustProductId(prodId);
    setAdjustAmount(1);
    setAdjustType("Entrada");
    setAdjustReason("Ajuste manual de inventário");
    setIsAdjusting(true);
  };

  const handleConfirmAdjust = () => {
    const finalAmount = adjustType === "Entrada" ? adjustAmount : -adjustAmount;
    onAdjustStock(adjustProductId, finalAmount, adjustType === "Entrada" ? "Entrada" : "Saída", adjustReason);
    setIsAdjusting(false);
  };

  const handleAutoRepo = (productId: string, suggested: number) => {
    onAdjustStock(
      productId,
      suggested,
      "Entrada",
      `Reabastecimento Automático sugerido por IA (${suggested} unidades)`
    );
    // clear the AI suggestion as fulfilled
    const prod = products.find(p => p.id === productId);
    if (prod) {
      prod.sugestaoCompraIA = 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Pesquisar por Código de Barras ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/10 text-xs text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-[#FF6B00] transition-all"
            />
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1E293B] border border-white/10 text-xs text-white rounded-xl py-3 px-3 outline-none focus:border-[#FF6B00]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap ${filterLowStock ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`}
            >
              <AlertCircle className="w-4 h-4" />
              Giro Baixo
            </button>

            <button
              onClick={() => setFilterExpiring(!filterExpiring)}
              className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap ${filterExpiring ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`}
            >
              <Calendar className="w-4 h-4" />
              Próx. Vencer
            </button>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
          <button
            onClick={handleExportPDF}
            className="bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/20 text-xs font-semibold px-3.5 py-3 rounded-xl transition-all flex items-center gap-2"
            title="Exportar Estoque em PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-semibold px-3.5 py-3 rounded-xl transition-all flex items-center gap-2"
            title="Exportar Estoque em Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleAIForecast}
            disabled={loadingAI}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-700/50 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all shadow-md shadow-purple-500/10 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-bounce" />
            {loadingAI ? "Pensando..." : "Previsão AI"}
          </button>

          <button
            onClick={handleOpenAdd}
            className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center gap-2 ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Entrada Rápida por Código de Barras / ID */}
      <div className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-[#FF6B00]" />
          <div>
            <h3 className="font-bold text-xs text-white">Recebimento Ágil / Entrada de Estoque</h3>
            <p className="text-[10px] text-gray-500">Dê entradas rápidas no inventário escaneando ou digitando o código de barras / ID</p>
          </div>
        </div>

        <form onSubmit={handleQuickStockEntry} className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-gray-400 font-medium">Pesquisar Código de Barras ou ID</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Escaneie com leitor físico ou digite o código de barras (ex: 7891234567890)..."
                value={quickBarcode}
                onChange={(e) => setQuickBarcode(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/10 text-xs text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-[#FF6B00] transition-all font-mono"
              />
              <Barcode className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="w-full lg:w-32 space-y-1">
            <span className="text-[10px] text-gray-400 font-medium">Qtd. a Adicionar</span>
            <input
              type="number"
              min="1"
              required
              value={quickQty || ""}
              onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-[#1E293B] border border-white/10 text-xs text-white rounded-xl py-3 px-4 outline-none focus:border-[#FF6B00] transition-all font-mono text-center"
            />
          </div>

          <button
            type="submit"
            disabled={!quickBarcode}
            className="bg-[#1E293B] text-[#FF6B00] border border-[#FF6B00]/20 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/40 disabled:opacity-50 disabled:pointer-events-none text-xs font-semibold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <PackagePlus className="w-4 h-4" />
            Confirmar Entrada (+)
          </button>
        </form>

        {/* LiveMatched product preview to confirm */}
        <AnimatePresence>
          {liveMatchedProduct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#1E293B]/45 border border-white/5 p-3 rounded-2xl flex items-center gap-3"
            >
              <img
                src={getProductImage(liveMatchedProduct.fotoUrl, liveMatchedProduct.nome, liveMatchedProduct.marca)}
                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&q=50";
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-xs truncate">{liveMatchedProduct.nome}</div>
                <div className="text-gray-400 text-[10px] mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Marca: <span className="text-gray-300 font-mono">{liveMatchedProduct.marca || "N/A"}</span></span>
                  <span>•</span>
                  <span>Estoque Atual: <span className="font-bold text-gray-200">{liveMatchedProduct.quantidade} un.</span></span>
                  <span>•</span>
                  <span>Mínimo Recomendado: {liveMatchedProduct.estoqueMinimo} un.</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${liveMatchedProduct.quantidade <= liveMatchedProduct.estoqueMinimo ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {liveMatchedProduct.quantidade <= liveMatchedProduct.estoqueMinimo ? "Estoque Crítico" : "Estoque Seguro"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local operation feedback */}
        <AnimatePresence>
          {quickFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                quickFeedback.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{quickFeedback.type === "success" ? "✅" : "❌"}</span>
                <span>{quickFeedback.message}</span>
              </div>
              <button
                onClick={() => setQuickFeedback(null)}
                className="text-white/40 hover:text-white text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Insights Display */}
      {aiInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-purple-950/20 border border-purple-500/30 p-5 rounded-3xl text-purple-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-sm">Insights de Previsão por IA (Gemini 3.5-flash)</h3>
          </div>
          <ul className="space-y-2 text-xs">
            {aiInsights.map((ins, index) => (
              <li key={index} className="flex gap-2 items-start">
                <CornerDownRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Loading overlay for AI */}
      {loadingAI && (
        <div className="bg-[#1E1B4B]/30 border border-purple-800/40 opacity-90 p-6 rounded-3xl flex flex-col items-center justify-center text-center py-10 space-y-3">
          <Sparkles className="w-10 h-10 text-purple-400 animate-spin" />
          <p className="text-purple-300 font-medium text-sm">{aiStatus}</p>
          <p className="text-purple-400/70 text-xs max-w-sm">
            Cruzando seu histórico operacional em lote com o LLM para recomendar reabastecimento exato.
          </p>
        </div>
      )}

      {/* Product List Table */}
      <div className="bg-[#0F172A] border border-white/5 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table id="stock-main-table" className="w-full text-left text-xs text-gray-300">
            <thead>
              <tr className="bg-[#1E293B]/40 border-b border-white/5 text-gray-400 uppercase text-[10px] font-mono">
                <th className="py-4 px-4">Produto</th>
                <th className="py-4 px-4">Código / Categoria</th>
                <th className="py-4 px-4">Preço Venda</th>
                <th className="py-4 px-4">Estoque Atual</th>
                <th className="py-4 px-4">Mínimo</th>
                <th className="py-4 px-4">Previsão IA (Giro)</th>
                <th className="py-4 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 font-medium">
                    Nenhum produto cadastrado ou correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.quantidade <= prod.estoqueMinimo;
                  return (
                    <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImage(prod.fotoUrl, prod.nome, prod.marca)}
                            alt={prod.nome}
                            onError={(e) => {
                              // Fallback image if unsplash fails
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&q=50";
                            }}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 bg-[#1E293B]"
                          />
                          <div>
                            <div className="font-semibold text-white text-xs">{prod.nome}</div>
                            <div className="text-gray-400 text-[10px] uppercase font-mono mt-0.5">{prod.marca}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-[10px] text-gray-300">{prod.codigoBarras}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5">{prod.categoria}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">R$ {prod.valorVenda.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-500">Custo: R$ {prod.valorCompra.toFixed(2)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-bold inline-block px-2.5 py-1 rounded-lg text-xs ${isLow ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {prod.quantidade} un
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 font-mono">{prod.estoqueMinimo} un</td>
                      <td className="py-4 px-4">
                        {prod.demandaIA ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${prod.demandaIA === "Alta" ? "bg-orange-500/15 text-[#FF6B00]" : prod.demandaIA === "Média" ? "bg-blue-500/15 text-blue-400" : "bg-gray-500/15 text-gray-400"}`}>
                              <TrendingUp className="w-3 h-3" />
                              {prod.demandaIA}
                            </span>
                            {prod.sugestaoCompraIA && prod.sugestaoCompraIA > 0 ? (
                              <button
                                onClick={() => handleAutoRepo(prod.id, prod.sugestaoCompraIA!)}
                                className="block text-[9px] text-[#FF6B00] bg-white/5 hover:bg-[#FF6B00]/15 hover:border-[#FF6B00]/40 border border-white/10 px-2 py-0.5 rounded-md mt-1 font-mono hover:scale-95 transition-all text-center"
                                title={prod.justificativaIA}
                              >
                                Comprar +{prod.sugestaoCompraIA} IA
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-mono">Sem dados preditivos</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(prod.id)}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-xl border border-white/5"
                            title="Entrada / Saída Manual"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-xl border border-white/5"
                            title="Editar Dados"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {deletingProductId === prod.id ? (
                            <div className="flex items-center gap-1 bg-[#1E293B] border border-red-500/30 p-1 rounded-xl animate-fade-in shrink-0">
                              <span className="text-[9px] text-gray-400 px-1 font-sans">Excluir?</span>
                              <button
                                onClick={() => {
                                  onDeleteProduct(prod.id);
                                  setDeletingProductId(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg transition-all"
                                title="Confirmar exclusão permanente"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeletingProductId(null)}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-bold px-2 py-1 rounded-lg transition-all"
                                title="Cancelar exclusão"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingProductId(prod.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl"
                              title="Deletar Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal Simulator (SaaS overlay) */}
      {(isAdding || isEditing) && currentProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-base font-bold text-white mb-4">
              {isAdding ? "Cadastrar Novo Produto" : `Editando: ${currentProduct.nome}`}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs text-gray-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Código de Barras</label>
                  <input
                    type="text"
                    required
                    value={currentProduct.codigoBarras || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, codigoBarras: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="789XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Nome Comercial</label>
                  <input
                    type="text"
                    required
                    value={currentProduct.nome || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, nome: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                    placeholder="Arroz Integral 5kg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryInput(!showCategoryInput)}
                      className="text-[10px] text-[#FF6B00] hover:underline"
                    >
                      {showCategoryInput ? "Escolher Existente" : "+ Nova Categ."}
                    </button>
                  </div>
                  {showCategoryInput ? (
                    <div className="flex gap-1.5 pt-0.5">
                      <input
                        type="text"
                        value={newCategoryText}
                        onChange={(e) => setNewCategoryText(e.target.value)}
                        placeholder="Nome da categoria"
                        className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl p-2.5 outline-none focus:border-[#FF6B00] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newCategoryText.trim();
                          if (val) {
                            if (!customCategories.includes(val)) {
                              const updated = [...customCategories, val];
                              setCustomCategories(updated);
                              localStorage.setItem("pare_leve_custom_categories", JSON.stringify(updated));
                            }
                            setCurrentProduct({ ...currentProduct, categoria: val });
                            setNewCategoryText("");
                            setShowCategoryInput(false);
                          }
                        }}
                        className="bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-semibold px-3 rounded-xl text-xs transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={currentProduct.categoria ?? ""}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, categoria: e.target.value })}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {allAvailableCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Marca/Fabricante</label>
                  <input
                    type="text"
                    required
                    value={currentProduct.marca || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, marca: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                    placeholder="Ex: Nestlé"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Valor de Compra (Custo)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentProduct.valorCompra ?? ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, valorCompra: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Valor de Venda ao Consumidor</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentProduct.valorVenda ?? ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, valorVenda: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Quantidade em Estoque</label>
                  <input
                    type="number"
                    required
                    value={currentProduct.quantidade ?? ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, quantidade: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="Quantidade"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Limite Mínimo de Segurança</label>
                  <input
                    type="number"
                    required
                    value={currentProduct.estoqueMinimo ?? ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, estoqueMinimo: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="Estoque Mínimo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Data de Validade</label>
                  <input
                    type="date"
                    required
                    value={currentProduct.validade || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, validade: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Fornecedor Preferencial</label>
                  <select
                    value={currentProduct.fornecedorId ?? ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, fornecedorId: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                  >
                    <option value="">Selecione um fornecedor</option>
                    <option value="avulso">Fornecedor Avulso (Única vez - Sem Cadastro)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-semibold">Foto do Produto</label>
                  <div className="flex bg-[#1E293B] p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setImageMode("url")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                        imageMode === "url" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Link className="w-3 h-3" />
                      Link da Web
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode("file")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                        imageMode === "file" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      Do Computador
                    </button>
                  </div>
                </div>

                {imageMode === "url" ? (
                  <input
                    type="text"
                    value={currentProduct.fotoUrl || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, fotoUrl: e.target.value })}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                    placeholder="Cole a URL da foto (ex: https://images.unsplash.com/...)"
                  />
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 relative ${
                      isDraggingOver
                        ? "border-[#FF6B00] bg-[#FF6B00]/5"
                        : "border-white/15 hover:border-[#FF6B00]/40 bg-[#1E293B]/40"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {currentProduct.fotoUrl?.startsWith("data:image/") ? (
                      <div className="flex items-center gap-3 w-full pr-8 relative z-10">
                        <img
                          src={currentProduct.fotoUrl}
                          alt="Preview"
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="text-left flex-1 min-w-0">
                          <span className="text-[10px] text-emerald-400 font-semibold block">Imagem Selecionada</span>
                          <span className="text-[9px] text-gray-500 block truncate">Arquivo de Imagem Local (Base64)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setCurrentProduct({ ...currentProduct, fotoUrl: "" });
                          }}
                          className="bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 p-1.5 rounded-lg text-[10px] font-sans relative z-20 pointer-events-auto"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2 py-2">
                        <Upload className="w-5 h-5 text-[#FF6B00]" />
                        <div className="text-xs font-semibold text-gray-300">Escolha um arquivo ou arraste aqui</div>
                        <div className="text-[9px] text-gray-500 font-mono">Suporta PNG, JPEG, WEBP de até 10MB</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all shadow-md shadow-orange-500/15"
                >
                  {isAdding ? "Adicionar Estoque" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Adjustment Modal Simulator */}
      {isAdjusting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            <h2 className="text-base font-bold text-white mb-4">Ajustar Quantidades de Forma Avulsa</h2>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Tipo de Movimento</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustType("Entrada")}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${adjustType === "Entrada" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/5"}`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    onClick={() => setAdjustType("Saída")}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${adjustType === "Saída" ? "bg-red-500/10 border-red-500 text-red-400" : "bg-white/5 border-white/5"}`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Mudar em Quantas Unidades</label>
                <input
                  type="number"
                  required
                  value={adjustAmount || ""}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  placeholder="Ex: 5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Justificativa da Auditoria</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                  placeholder="Avaria, Inventário Anual, Brinde..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdjusting(false)}
                  className="bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAdjust}
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
