/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, User, ShoppingCart, Eye, EyeOff, UserPlus, ArrowRight } from "lucide-react";
import { CURRENT_USER } from "../initialData";
import { Usuario } from "../types";
import loginBg from "../assets/images/login_background_1779928611934.png";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
  usersList?: Usuario[];
}

export default function LoginView({ onLoginSuccess, usersList = [] }: LoginProps) {
  const [email, setEmail] = useState("engquimjack@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (usersList && usersList.length > 0) {
      const hasJack = usersList.some(u => u.email === "engquimjack@gmail.com");
      if (hasJack) {
        setEmail("engquimjack@gmail.com");
      } else {
        setEmail(usersList[0].email);
      }
    }
  }, [usersList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Find the user with matching email
      const matchedUser = usersList.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase()) ||
                          (email.trim().toLowerCase() === "engquimjack@gmail.com" ? {
                            id: "user-active",
                            nome: "Jackson Pereira",
                            email: "engquimjack@gmail.com",
                            regra: "Administrador" as const,
                            ativo: true,
                            senha: ""
                          } : null);

      if (!matchedUser) {
        setError("Usuário não cadastrado.");
        setLoading(false);
        return;
      }

      const role = matchedUser.regra;
      const isAdminOrManager = role === "Administrador" || role === "Gerente";

      if (isAdminOrManager) {
        // Para o administrador e gerente a senha de acesso será cadastrada diretamente no authentication (Supabase Auth)
        const { isSupabaseConfigured, getSupabaseClient } = await import("../lib/supabaseClient");
        
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const { error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
          });

          if (authError) {
            setError(`Erro de Autenticação (Supabase Auth): ${authError.message}`);
            setLoading(false);
            return;
          }

          onLoginSuccess(matchedUser);
        } else {
          // Fallback contingência local caso Supabase não esteja configurado
          const correctPass = matchedUser.senha || "123456";
          // Aceita a senha cadastrada na aplicação, ou "123456" ou o campo em branco se aplicável
          if (password !== correctPass && password !== "123456" && password !== "••••••••") {
            setError("Supabase não configurado. Senha de contingência local incorreta.");
            setLoading(false);
            return;
          }
          onLoginSuccess(matchedUser);
        }
      } else {
        // Para o operador a senha será cadastrada na aplicação, pelo administrador ou gerente (armazenada localmente)
        const savedPassword = matchedUser.senha || "123456";
        if (password !== savedPassword) {
          setError("Senha incorreta cadastrada para este operador.");
          setLoading(false);
          return;
        }
        onLoginSuccess(matchedUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro de conexão ao autenticar: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Attached image background with exact proportions */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 select-none z-0" 
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      {/* Dark tint overlay for pristine contrast and high legibility */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px] z-0" />

      {/* Corporate accent glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#FF6B00]/15 blur-[135px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Brand Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-tr from-[#FF6B00] to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3"
          >
            <ShoppingCart className="w-8 h-8 text-white stroke-[2.5]" />
          </motion.div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-white mb-1">
            Pare e Leve
          </h1>
          <p className="text-gray-400 text-xs tracking-widest uppercase font-mono">
            SISTEMA INTEGRADO DE AUTO-GESTÃO
          </p>
        </div>

        {/* Form Title & Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            Entrar no Sistema
          </h2>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-500/15 border border-red-500/30 text-red-200 text-sm p-3 rounded-xl mb-4 font-sans"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Decoy hidden inputs to override Google Chrome password saver/autofill triggers */}
          <input type="text" name="google_saver_prevent_usr" style={{ position: "absolute", top: "-9999px", left: "-9999px" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
          <input type="password" name="google_saver_prevent_pwd" style={{ position: "absolute", top: "-9999px", left: "-9999px" }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Usuário</label>
            <div className="relative">
              <select
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full bg-[#1E293B] border border-white/5 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/40 text-sm text-white rounded-xl py-3 pl-10 pr-10 outline-none appearance-none transition-all cursor-pointer"
              >
                {usersList.map((usr) => (
                  <option key={usr.id} value={usr.email} className="bg-[#0F172A] text-white">
                    {usr.email}
                  </option>
                ))}
                {usersList.length === 0 && (
                  <option value="engquimjack@gmail.com" className="bg-[#0F172A] text-white">
                    engquimjack@gmail.com
                  </option>
                )}
              </select>
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <div className="absolute right-4 top-4 text-gray-400 pointer-events-none flex items-center justify-center">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Senha de Acesso</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserir Senha"
                autoComplete="new-password"
                className="w-full bg-[#1E293B] border border-white/5 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/40 text-sm text-white rounded-xl py-3 pl-10 pr-10 outline-none transition-all"
              />
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 hover:text-white text-gray-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-orange-600 disabled:bg-orange-600/50 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-orange-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 text-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Acessar Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>



        {/* Platform notice */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400/60 font-mono">
            Licenciado para "Pare e Leve Filial 01" • v4.12
          </p>
        </div>
      </motion.div>
    </div>
  );
}
