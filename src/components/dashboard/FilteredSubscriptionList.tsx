"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  User, 
  UserMinus, 
  ArrowRight,
  Search 
} from "lucide-react";

const getExpirationStatus = (expDate: Date) => {
  if (expDate.toISOString().startsWith('2099-12-31')) {
    return { 
      color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", 
      label: "Cartão (Auto)", glow: "border-purple-500/20 shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]",
      isAuto: true
    };
  }

  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 30) {
    return { 
      color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30", 
      label: "Crítico", glow: "border-red-500/40 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]",
      isAuto: false
    };
  }
  if (diffDays <= 90) {
    return { 
      color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/30", 
      label: "Atenção (<= 3 meses)", glow: "border-yellow-500/40 shadow-[0_0_20px_-5px_rgba(234,179,8,0.15)]",
      isAuto: false
    };
  }
  if (diffDays >= 180) {
    return { 
      color: "text-emerald-500", bg: "bg-emerald-500/20", border: "border-emerald-500/30", 
      label: "Seguro (>= 6 meses)", glow: "border-card-border",
      isAuto: false
    };
  }
  
  return { 
    color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", 
    label: "Regular", glow: "border-card-border",
    isAuto: false
  };
};

export function FilteredSubscriptionList({ subs, assigns, initialFilter }: { subs: any[], assigns: any[], initialFilter?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'ativas', 'vencidas'

  let filteredSubs = subs.filter(sub => {
    if (statusFilter === "ativas") {
      const expDate = new Date(sub.expiration_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expDate < today && !sub.expiration_date.startsWith('2099')) return false;
    } else if (statusFilter === "vencidas") {
      const expDate = new Date(sub.expiration_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expDate >= today || sub.expiration_date.startsWith('2099')) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Procura no nome da sub
    if (sub.name?.toLowerCase().includes(q)) return true;
    // Procura no email da sub
    if (sub.account_email?.toLowerCase().includes(q)) return true;
    
    // Procura nos usuários vinculados a esta sub
    const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
    const hasMatchingEmployee = subAssigns.some(a => 
      a.employees?.name?.toLowerCase().includes(q) || 
      a.employees?.department?.toLowerCase().includes(q)
    );
    
    return hasMatchingEmployee;
  });

  // Filtro de Vagas Livres + Ordenação
  if (initialFilter === 'livres') {
    filteredSubs = filteredSubs.filter(sub => {
      const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
      return (sub.slots_total || 6) - subAssigns.length > 0;
    }).sort((a, b) => {
      const freeA = (a.slots_total || 6) - assigns.filter(assign => assign.subscription_id === a.id).length;
      const freeB = (b.slots_total || 6) - assigns.filter(assign => assign.subscription_id === b.id).length;
      return freeB - freeA; // Do maior (mais vagas livres) para o menor
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-primary" />
          Visão Geral das Assinaturas
        </h2>
        
        {/* Barra de Pesquisa */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar assinatura, e-mail ou funcionário..."
            className="w-full bg-black/20 border border-card-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>
        
        {/* Filtro de Status */}
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-black/20 border border-card-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors appearance-none"
          >
            <option value="all">Todas as Assinaturas</option>
            <option value="ativas">Somente Ativas</option>
            <option value="vencidas">Somente Vencidas</option>
          </select>
        </div>
      </div>

      {filteredSubs.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <CreditCard className="h-16 w-16 text-gray-500 mb-4 stroke-[1.5]" />
          <h3 className="text-lg font-bold text-white">Nenhum resultado</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md">
            {subs.length === 0 
              ? "Para começar a controlar suas licenças, cadastre sua primeira conta Microsoft 365 Family no painel de gerenciamento."
              : "Não encontramos nenhuma assinatura ou funcionário com esse termo."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredSubs.map((sub) => {
            const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
            const expDate = new Date(sub.expiration_date);
            const status = getExpirationStatus(expDate);

            // Generate 6 slots array
            const slots = Array.from({ length: sub.slots_total || 6 }).map((_, i) => subAssigns[i] || null);

            return (
              <div 
                key={sub.id} 
                className={`glass-panel rounded-2xl p-6 flex flex-col gap-5 border transition-all hover:scale-[1.01] ${status.glow}`}
              >
                {/* Sub Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
                      {sub.name}
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color} px-2 py-0.5 rounded-md border ${status.border}`}>
                        <Clock className="h-3 w-3" /> {status.label}
                      </span>
                      {sub.package_type && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gray-800/50 text-gray-300 px-2 py-0.5 rounded-md border border-gray-700/50">
                          {sub.package_type}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{sub.account_email}</p>
                  </div>
                  <div className="flex gap-4 sm:gap-6 mt-2 sm:mt-0">
                    {sub.activation_date && (
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Ativação</p>
                        <p className="text-sm font-bold mt-0.5 text-gray-300">
                          {new Date(sub.activation_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                      </div>
                    )}
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Vencimento</p>
                      <p className={`text-sm font-bold mt-0.5 ${status.color}`}>
                        {status.isAuto ? 'Automático' : expDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-card-border/50" />

                {/* Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.map((assign, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        assign 
                          ? "bg-[#161e2f]/80 border-brand-primary/30" 
                          : "bg-black/20 border-card-border border-dashed hover:border-gray-500"
                      }`}
                    >
                      {assign ? (
                        <>
                          <div className="h-8 w-8 shrink-0 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 text-brand-primary font-bold text-xs">
                            {assign.employees?.name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate" title={assign.employees?.corporate_email || assign.employees?.email}>
                              {assign.employees?.name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate" title={assign.employees?.observations || ''}>
                              {assign.employees?.department || 'Sem setor'} {assign.employees?.observations ? `• ${assign.employees.observations}` : ''}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-500">
                            <UserMinus className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Slot Livre</p>
                            <p className="text-[10px] text-gray-600">Vaga {idx + 1}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Footer */}
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">
                    Ocupação: <strong className="text-white">{subAssigns.length}</strong> de {sub.slots_total || 6}
                  </span>
                  {subAssigns.length < (sub.slots_total || 6) && (
                    <Link href="/manage" className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1">
                      Atribuir licença <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
