"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, AlertCircle, ArrowLeft, Lock, Mail, ChevronRight } from "lucide-react";

type LoginStep = 'EMAIL' | 'PASSWORD' | 'SET_PASSWORD';

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>('EMAIL');
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Escuta a URL diretamente no load para capturar o hash do convite
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes("type=invite") || hash.includes("type=recovery")) {
        setStep('SET_PASSWORD');
      }
    }

    // Escuta os eventos do Supabase caso o hash seja parseado silenciosamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep('SET_PASSWORD');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setErrorMsg("");
    setStep('PASSWORD');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      if (data?.user?.user_metadata?.requires_password_change) {
        setStep('SET_PASSWORD');
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
      data: { requires_password_change: false }
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-[#040810]">
      
      {/* Background Ornaments */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full blur-[120px] opacity-40 mix-blend-screen transition-colors duration-1000 ${
          step === 'SET_PASSWORD' ? 'bg-brand-success/30' : 'bg-brand-primary/10'
        }`} />
        <div className={`absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full blur-[100px] opacity-30 mix-blend-screen transition-colors duration-1000 ${
          step === 'SET_PASSWORD' ? 'bg-emerald-600/30' : 'bg-brand-secondary/10'
        }`} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg mb-6 transition-all duration-500 ${
          step === 'SET_PASSWORD' 
            ? 'bg-gradient-to-br from-brand-success to-emerald-600 shadow-brand-success/20'
            : 'bg-gradient-to-br from-brand-primary to-brand-secondary shadow-brand-primary/20'
        }`}>
          {step === 'SET_PASSWORD' ? <Lock className="h-8 w-8 text-white" /> : <ShieldCheck className="h-8 w-8 text-white" />}
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white transition-all">
          {step === 'SET_PASSWORD' ? 'Defina sua Senha' : 'Acesso Administrativo'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400 font-medium transition-all">
          {step === 'SET_PASSWORD' ? 'Você foi convidado. Crie sua credencial de acesso.' : 'LicenceControl - Controle de Licenças M365'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel glass-card px-4 py-8 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/5 overflow-hidden relative">
          
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in slide-in-from-top-4 fade-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="relative">
            
            {/* ESTÁGIO 1: E-MAIL */}
            {step === 'EMAIL' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Qual o seu e-mail institucional?
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      required
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full appearance-none rounded-xl border border-card-border bg-[#090d16] pl-10 px-4 py-3.5 text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm transition-all"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-between items-center rounded-xl bg-white/5 hover:bg-white/10 border border-card-border py-3 px-4 text-sm font-bold text-white transition-all group"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {/* ESTÁGIO 2: LOGIN COM SENHA */}
            {step === 'PASSWORD' && (
              <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-6">
                  <div className="flex-1 truncate text-sm font-medium text-gray-300">
                    {email}
                  </div>
                  <button type="button" onClick={() => setStep('EMAIL')} className="text-xs text-brand-primary hover:text-white font-bold transition-colors">
                    Mudar
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Digite sua senha
                  </label>
                  <input
                    required
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-card-border bg-[#090d16] px-4 py-3.5 text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('EMAIL')} className="p-3 rounded-xl border border-card-border bg-white/5 hover:bg-white/10 text-white transition-all">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary py-3 px-4 text-sm font-bold text-white shadow-lg hover:shadow-brand-primary/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Entrar</>}
                  </button>
                </div>
              </form>
            )}

            {/* ESTÁGIO 3: DEFINIR NOVA SENHA (CONVITE) */}
            {step === 'SET_PASSWORD' && (
              <form onSubmit={handleSetPasswordSubmit} className="space-y-6 animate-in zoom-in-95 duration-500">
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Nova Senha</label>
                  <input
                    required
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-card-border bg-[#090d16] px-4 py-3.5 text-white focus:border-brand-success focus:outline-none focus:ring-1 focus:ring-brand-success sm:text-sm transition-all"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Confirmar Senha</label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-card-border bg-[#090d16] px-4 py-3.5 text-white focus:border-brand-success focus:outline-none focus:ring-1 focus:ring-brand-success sm:text-sm transition-all"
                    placeholder="Repita a nova senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-brand-success to-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg hover:shadow-brand-success/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="h-4 w-4" /> Salvar Senha e Entrar</>}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
