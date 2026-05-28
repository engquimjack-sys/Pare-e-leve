/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  Briefcase,
  Plus,
  Compass,
  Phone,
  Mail,
  Award,
  PiggyBank,
  CheckCircle,
  Clock,
  Trash2,
  Pencil
} from "lucide-react";
import { Cliente, Fornecedor } from "../types";

interface PeopleProps {
  clients: Cliente[];
  suppliers: Fornecedor[];
  onAddClient: (cli: Omit<Cliente, "id">) => void;
  onAddSupplier: (sup: Omit<Fornecedor, "id">) => void;
  onDeleteClient?: (id: string) => void;
  onDeleteSupplier?: (id: string) => void;
  onUpdateClient?: (id: string, cli: Cliente) => void;
  onUpdateSupplier?: (id: string, sup: Fornecedor) => void;
  currentUserRole?: string;
}

export default function PeopleView({
  clients,
  suppliers,
  onAddClient,
  onAddSupplier,
  onDeleteClient,
  onDeleteSupplier,
  onUpdateClient,
  onUpdateSupplier,
  currentUserRole,
}: PeopleProps) {
  const [activeTab, setActiveTab] = useState<"clientes" | "fornecedores">("clientes");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingCliId, setDeletingCliId] = useState<string | null>(null);
  const [deletingSupId, setDeletingSupId] = useState<string | null>(null);

  // Editing states
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Fornecedor | null>(null);

  // Client adding forms fields
  const [cliName, setCliName] = useState("");
  const [cliCpf, setCliCpf] = useState("");
  const [cliTel, setCliTel] = useState("");
  const [cliMail, setCliMail] = useState("");
  const [cliCredit, setCliCredit] = useState(500);

  // Supplier adding form fields
  const [supName, setSupName] = useState("");
  const [supCnpj, setSupCnpj] = useState("");
  const [supCont, setSupCont] = useState("");
  const [supTel, setSupTel] = useState("");
  const [supMail, setSupMail] = useState("");
  const [supEnd, setSupEnd] = useState("");

  // Editing Client form fields
  const [editCliName, setEditCliName] = useState("");
  const [editCliCpf, setEditCliCpf] = useState("");
  const [editCliTel, setEditCliTel] = useState("");
  const [editCliMail, setEditCliMail] = useState("");
  const [editCliPoints, setEditCliPoints] = useState(0);
  const [editCliCashback, setEditCliCashback] = useState(0);
  const [editCliCredit, setEditCliCredit] = useState(500);

  // Editing Supplier form fields
  const [editSupName, setEditSupName] = useState("");
  const [editSupCnpj, setEditSupCnpj] = useState("");
  const [editSupCont, setEditSupCont] = useState("");
  const [editSupTel, setEditSupTel] = useState("");
  const [editSupMail, setEditSupMail] = useState("");
  const [editSupEnd, setEditSupEnd] = useState("");

  const startEditClient = (cli: Cliente) => {
    setEditingClient(cli);
    setEditCliName(cli.nome);
    setEditCliCpf(cli.cpf);
    setEditCliTel(cli.telefone);
    setEditCliMail(cli.email);
    setEditCliPoints(cli.fidelidadePontos);
    setEditCliCashback(cli.cashbackAcumulado);
    setEditCliCredit(cli.limiteCredito);
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editCliName || !editCliCpf) return;
    onUpdateClient?.(editingClient.id, {
      ...editingClient,
      nome: editCliName,
      cpf: editCliCpf,
      telefone: editCliTel,
      email: editCliMail,
      fidelidadePontos: editCliPoints,
      cashbackAcumulado: editCliCashback,
      limiteCredito: editCliCredit
    });
    setEditingClient(null);
  };

  const startEditSupplier = (sup: Fornecedor) => {
    setEditingSupplier(sup);
    setEditSupName(sup.nome);
    setEditSupCnpj(sup.cnpj);
    setEditSupCont(sup.contato);
    setEditSupTel(sup.telefone);
    setEditSupMail(sup.email);
    setEditSupEnd(sup.endereco);
  };

  const handleSaveEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editSupName || !editSupCnpj) return;
    onUpdateSupplier?.(editingSupplier.id, {
      ...editingSupplier,
      nome: editSupName,
      cnpj: editSupCnpj,
      contato: editSupCont,
      telefone: editSupTel,
      email: editSupMail,
      endereco: editSupEnd
    });
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "clientes") {
      if (!cliName || !cliCpf) return;
      onAddClient({
        nome: cliName,
        cpf: cliCpf,
        telefone: cliTel || "(11) 90000-0000",
        email: cliMail || "cliente@clube.com",
        fidelidadePontos: 100, // starting gift
        cashbackAcumulado: 5.00, // starting gift
        limiteCredito: cliCredit,
        historicoComprasCount: 0,
      });

      // Reset
      setCliName("");
      setCliCpf("");
      setCliTel("");
      setCliMail("");
      setCliCredit(500);
    } else {
      if (!supName || !supCnpj) return;
      onAddSupplier({
        nome: supName,
        cnpj: supCnpj,
        contato: supCont || "Suporte de Vendas",
        telefone: supTel || "(11) 4004-0000",
        email: supMail || "comercial@fornece.com",
        endereco: supEnd || "Rua dos Fornecedores, 100 - SP",
        contasAPagarCount: 0,
      });

      // Reset
      setSupName("");
      setSupCnpj("");
      setSupCont("");
      setSupTel("");
      setSupMail("");
      setSupEnd("");
    }
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0F172A] border border-white/5 p-4 rounded-3xl">
        <div className="flex bg-[#1E293B] p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => { setActiveTab("clientes"); setIsAdding(false); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === "clientes" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
          >
            Clube de Clientes (Fidelidade)
          </button>
          <button
            onClick={() => { setActiveTab("fornecedores"); setIsAdding(false); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === "fornecedores" ? "bg-[#FF6B00] text-white" : "text-gray-400 hover:text-white"}`}
          >
            Gestão de Fornecedores
          </button>
        </div>

        {currentUserRole === "Gerente" || currentUserRole === "Administrador" ? (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#FF6B00] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/15"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "clientes" ? "Cadastrar Cliente" : "Adicionar Fornecedor"}
          </button>
        ) : (
          <div className="bg-[#1E293B] border border-white/5 rounded-xl py-2 px-4 text-[10px] font-semibold text-[#FF6B00] font-sans flex items-center gap-1">
            <span>🔒</span>
            <span>Cadastro exclusivo para Gerentes</span>
          </div>
        )}
      </div>

      {activeTab === "clientes" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {clients.map((cli) => (
            <div
              key={cli.id}
              className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col justify-between h-56 hover:border-[#FF6B00]/40 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/5 to-transparent rounded-full pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-white text-sm group-hover:text-[#FF6B00] transition-colors truncate">{cli.nome}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">CPF: {cli.cpf}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {deletingCliId === cli.id ? (
                      <div className="flex items-center gap-1 bg-[#1E293B] border border-red-500/30 p-1 rounded-xl animate-fade-in z-10 shrink-0">
                        <span className="text-[9px] text-red-300 font-sans px-1">Excluir?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClient?.(cli.id);
                            setDeletingCliId(null);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all whitespace-nowrap"
                        >
                          Sim
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCliId(null);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditClient(cli);
                          }}
                          className="text-gray-500 hover:text-orange-400 p-1 bg-white/5 hover:bg-orange-500/10 rounded-lg transition-all"
                          title="Editar Cliente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCliId(cli.id);
                          }}
                          className="text-gray-500 hover:text-red-400 p-1 bg-white/5 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Deletar Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <Users className="w-4 h-4 text-orange-400 opacity-60" />
                  </div>
                </div>

                <div className="space-y-1.5 mt-4 text-[11px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>{cli.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{cli.email}</span>
                  </div>
                </div>
              </div>

              {/* Loyalty KPIs badges */}
              <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 mt-3 text-[10px]">
                <div className="bg-white/5 p-1.5 rounded-xl text-center">
                  <span className="block text-gray-400 font-mono">Pontos</span>
                  <span className="font-bold text-orange-400 font-sans">{cli.fidelidadePontos} pt</span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-xl text-center">
                  <span className="block text-gray-400 font-mono">Cashback</span>
                  <span className="font-bold text-emerald-400 font-sans">R$ {cli.cashbackAcumulado.toFixed(2)}</span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-xl text-center">
                  <span className="block text-gray-400 font-mono">Crédito</span>
                  <span className="font-bold text-blue-400 font-sans">R$ {cli.limiteCredito}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-[#0F172A] border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col justify-between h-52 hover:border-[#FF6B00]/40 transition-all relative overflow-hidden group"
            >
              <div>
                <div className="flex justify-between items-start border-b border-white/5 pb-2.5 mb-2.5">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-white text-xs truncate group-hover:text-[#FF6B00] transition-colors">{sup.nome}</h3>
                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">CNPJ: {sup.cnpj}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {deletingSupId === sup.id ? (
                      <div className="flex items-center gap-1 bg-[#1E293B] border border-red-500/30 p-1 rounded-xl animate-fade-in z-10 shrink-0">
                        <span className="text-[9px] text-red-300 font-sans px-1">Excluir?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSupplier?.(sup.id);
                            setDeletingSupId(null);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all whitespace-nowrap"
                        >
                          Sim
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSupId(null);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditSupplier(sup);
                          }}
                          className="text-gray-500 hover:text-orange-400 p-1 bg-white/5 hover:bg-orange-500/10 rounded-lg transition-all"
                          title="Editar Fornecedor"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSupId(sup.id);
                          }}
                          className="text-gray-500 hover:text-red-400 p-1 bg-white/5 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Deletar Fornecedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <Briefcase className="w-4 h-4 text-orange-400 opacity-60" />
                  </div>
                </div>

                <div className="space-y-1 mt-2 text-[11px] text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Contato:</span>
                    <span className="font-medium text-white">{sup.contato}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Telefone:</span>
                    <span>{sup.telefone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">E-mail:</span>
                    <span className="truncate max-w-[150px]">{sup.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] bg-white/5 px-3 py-2 rounded-xl mt-3">
                <span className="text-gray-400 font-mono">Contas em aberto:</span>
                <span className="font-bold text-[#FF6B00] bg-orange-500/10 px-2 py-0.5 rounded-md">
                  {sup.contasAPagarCount} boletos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adding Modal Simulator */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            <h2 className="text-base font-bold text-white mb-4">
              {activeTab === "clientes" ? "Adicionar Cliente Fidelidade" : "Registrar Novo Fornecedor S/A"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs text-gray-300">
              {activeTab === "clientes" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Nome do Titular</label>
                    <input
                      type="text"
                      required
                      value={cliName}
                      onChange={(e) => setCliName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">CPF do Titular</label>
                      <input
                        type="text"
                        required
                        value={cliCpf}
                        onChange={(e) => setCliCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Limite Crediário (R$)</label>
                      <input
                        type="number"
                        required
                        value={cliCredit || ""}
                        onChange={(e) => setCliCredit(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Celular / WhatsApp</label>
                      <input
                        type="text"
                        value={cliTel}
                        onChange={(e) => setCliTel(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">E-mail</label>
                      <input
                        type="email"
                        value={cliMail}
                        onChange={(e) => setCliMail(e.target.value)}
                        placeholder="nome@dominio.com"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Razão Social / Nome da Empresa</label>
                    <input
                      type="text"
                      required
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      placeholder="Ex: Coca-Cola Distribuidora"
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">CNPJ</label>
                      <input
                        type="text"
                        required
                        value={supCnpj}
                        onChange={(e) => setSupCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Gerente de Vendas</label>
                      <input
                        type="text"
                        value={supCont}
                        onChange={(e) => setSupCont(e.target.value)}
                        placeholder="Nome do contato"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Telefone Fone</label>
                      <input
                        type="text"
                        value={supTel}
                        onChange={(e) => setSupTel(e.target.value)}
                        placeholder="(11) 4004-1234"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">E-mail Comercial</label>
                      <input
                        type="email"
                        value={supMail}
                        onChange={(e) => setSupMail(e.target.value)}
                        placeholder="pedidos@empresa.com"
                        className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Endereço de galpão / Expedição</label>
                    <input
                      type="text"
                      value={supEnd}
                      onChange={(e) => setSupEnd(e.target.value)}
                      placeholder="Cidade, UF ou Av..."
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all shadow-md"
                >
                  Cadastrar Cadastro
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Editing Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
          >
            <h2 className="text-base font-bold text-white mb-4">
              Editar Cliente Fidelidade
            </h2>

            <form onSubmit={handleSaveEditClient} className="space-y-4 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Nome do Titular</label>
                <input
                  type="text"
                  required
                  value={editCliName}
                  onChange={(e) => setEditCliName(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">CPF do Titular</label>
                  <input
                    type="text"
                    required
                    value={editCliCpf}
                    onChange={(e) => setEditCliCpf(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Limite Crediário (R$)</label>
                  <input
                    type="number"
                    required
                    value={editCliCredit || ""}
                    onChange={(e) => setEditCliCredit(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={editCliTel}
                    onChange={(e) => setEditCliTel(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">E-mail</label>
                  <input
                    type="email"
                    value={editCliMail}
                    onChange={(e) => setEditCliMail(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Pontos Fidelidade</label>
                  <input
                    type="number"
                    required
                    value={editCliPoints}
                    onChange={(e) => setEditCliPoints(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Acúmulo Cashback (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCliCashback}
                    onChange={(e) => setEditCliCashback(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Editing Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F172A] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
          >
            <h2 className="text-base font-bold text-white mb-4">
              Editar Fornecedor S/A
            </h2>

            <form onSubmit={handleSaveEditSupplier} className="space-y-4 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Razão Social / Nome da Empresa</label>
                <input
                  type="text"
                  required
                  value={editSupName}
                  onChange={(e) => setEditSupName(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">CNPJ</label>
                  <input
                    type="text"
                    required
                    value={editSupCnpj}
                    onChange={(e) => setEditSupCnpj(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Gerente de Vendas</label>
                  <input
                    type="text"
                    value={editSupCont}
                    onChange={(e) => setEditSupCont(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Telefone Fone</label>
                  <input
                    type="text"
                    value={editSupTel}
                    onChange={(e) => setEditSupTel(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">E-mail Comercial</label>
                  <input
                    type="email"
                    value={editSupMail}
                    onChange={(e) => setEditSupMail(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Endereço de galpão / Expedição</label>
                <input
                  type="text"
                  value={editSupEnd}
                  onChange={(e) => setEditSupEnd(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 outline-none focus:border-[#FF6B00] text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-all shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
