"use client";

import React, { useState } from "react";
import { UserPlus, Copy, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { inviteUserAction } from "./actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [generatePassword, setGeneratePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setTempPassword("");
    
    const res = await inviteUserAction(email, fullName, generatePassword);
    
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      if (generatePassword && res.tempPassword) {
        setTempPassword(res.tempPassword);
        setSuccessMsg("Usuário criado com sucesso!");
      } else {
        setSuccessMsg("Convite enviado por e-mail com sucesso!");
      }
      setEmail("");
      setFullName("");
      setGeneratePassword(false);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-card-border lg:col-span-1">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
        <UserPlus className="h-5 w-5 text-brand-primary" />
        Adicionar Administrador
      </h2>
      
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && !tempPassword && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {tempPassword && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
          <p className="text-xs font-bold mb-2">Conta Criada! Copie a senha provisória:</p>
          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-amber-500/20">
            <code className="text-lg font-mono font-bold flex-1 text-white">{tempPassword}</code>
            <button 
              type="button" 
              onClick={copyToClipboard}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] mt-2 text-amber-500/80 leading-tight">
            Envie esta senha para o usuário. No primeiro login, o sistema exigirá que ele cadastre uma nova.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Nome Completo</label>
          <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome do Admin" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Corporativo</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
        </div>

        {/* Botão de Toggle (Tipo de Criação) */}
        <div className="mt-2 flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Método de Criação</p>
          
          <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${!generatePassword ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
            <input type="radio" className="sr-only" checked={!generatePassword} onChange={() => setGeneratePassword(false)} />
            <Mail className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">Enviar Convite por E-mail</span>
          </label>
          
          <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${generatePassword ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
            <input type="radio" className="sr-only" checked={generatePassword} onChange={() => setGeneratePassword(true)} />
            <KeyRound className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">Gerar Senha Temporária agora</span>
          </label>
        </div>

        <button type="submit" disabled={loading} className="mt-2 py-2.5 flex items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50">
          {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (generatePassword ? "Criar Conta" : "Enviar Convite")}
        </button>
      </form>
    </div>
  );
}
