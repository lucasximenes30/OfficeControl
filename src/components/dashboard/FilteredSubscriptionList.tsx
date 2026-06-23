"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  User, 
  UserMinus, 
  ArrowRight,
  Search,
  X,
  Save
} from "lucide-react";

const getExpirationStatus = (expDate: Date | null | undefined) => {
  if (!expDate || isNaN(expDate.getTime())) {
    return { 
      color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30", 
      label: "Vencida", glow: "border-red-500/40 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]",
      isAuto: false
    };
  }

  if (expDate.toISOString().startsWith('2099-12-31')) {
    return { 
      color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", 
      label: "Cartão (Auto)", glow: "border-purple-500/20 shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]",
      isAuto: true
    };
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { 
      color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30", 
      label: "Vencida", glow: "border-red-500/40 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]",
      isAuto: false
    };
  }
  if (diffDays <= 15) {
    return { 
      color: "text-orange-500", bg: "bg-orange-500/20", border: "border-orange-500/30", 
      label: `Crítico (${diffDays} dias)`, glow: "border-orange-500/40 shadow-[0_0_20px_-5px_rgba(249,115,22,0.2)]",
      isAuto: false
    };
  }
  if (diffDays <= 45) {
    return { 
      color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/30", 
      label: "Atenção (<= 45 dias)", glow: "border-yellow-500/40 shadow-[0_0_20px_-5px_rgba(234,179,8,0.15)]",
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
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'ativas', 'vencidas'

  // Quick Assign Modal State
  const [quickAssign, setQuickAssign] = useState<{
    isOpen: boolean;
    type: 'new' | 'edit';
    subId?: string;
    empId?: string;
    email: string;
    name: string;
    corporate_email: string;
    department: string;
  }>({ isOpen: false, type: 'new', email: '', name: '', corporate_email: '', department: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (quickAssign.type === 'edit' && quickAssign.empId) {
        const { error } = await supabase.from('employees').update({
          name: quickAssign.name,
          email: quickAssign.email,
          corporate_email: quickAssign.corporate_email,
          department: quickAssign.department
        }).eq('id', quickAssign.empId);
        if (error) throw error;
      } else if (quickAssign.type === 'new' && quickAssign.subId) {
        const { data: emp, error: empError } = await supabase.from('employees').insert([{
          name: quickAssign.name,
          email: quickAssign.email,
          corporate_email: quickAssign.corporate_email,
          department: quickAssign.department
        }]).select().single();
        if (empError) throw empError;
        
        if (emp) {
          const { error: assignError } = await supabase.from('assignments').insert([{
            subscription_id: quickAssign.subId,
            employee_id: emp.id
          }]);
          if (assignError) throw assignError;
        }
      }
      setQuickAssign({ ...quickAssign, isOpen: false });
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar informações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  let filteredSubs = subs.filter(sub => {
    if (statusFilter === "ativas") {
      if (!sub.expiration_date) return false; // Nulo = vencida
      const expDate = new Date(sub.expiration_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expDate < today && !sub.expiration_date.startsWith('2099')) return false;
    } else if (statusFilter === "vencidas") {
      if (!sub.expiration_date) return true; // Nulo = vencida, então deixa passar
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

  // Ordenação Geral: da mais longa para a menor
  if (initialFilter !== 'livres') {
    filteredSubs.sort((a, b) => {
      // Tratar nulos como a menor data possível
      const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
      const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
      
      return dateB - dateA; // Decrescente (maior para o menor)
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
            const actualSlotsCount = Math.max(sub.slots_total || 6, subAssigns.length);
            const slots = Array.from({ length: actualSlotsCount }).map((_, i) => subAssigns[i] || null);

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
                  {slots.map((assign, idx) => {
                    const isSemUsuario = assign && assign.employees?.name === 'Sem usuário';
                    const isLivre = !assign;
                    const isClickable = isSemUsuario || isLivre;

                    return (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (!isClickable) return;
                        if (isSemUsuario) {
                          setQuickAssign({
                            isOpen: true,
                            type: 'edit',
                            empId: assign.employees.id,
                            email: assign.employees.email || '',
                            name: '',
                            corporate_email: assign.employees.corporate_email || '',
                            department: assign.employees.department || ''
                          });
                        } else if (isLivre) {
                          setQuickAssign({
                            isOpen: true,
                            type: 'new',
                            subId: sub.id,
                            email: '',
                            name: '',
                            corporate_email: '',
                            department: ''
                          });
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        assign 
                          ? "bg-[#161e2f]/80 border-brand-primary/30" 
                          : "bg-black/20 border-card-border border-dashed hover:border-gray-500"
                      } ${isClickable ? 'cursor-pointer hover:border-brand-primary/80 hover:bg-[#161e2f]/90' : ''}`}
                    >
                      {assign ? (
                        <>
                          <div className="h-8 w-8 shrink-0 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 text-brand-primary font-bold text-xs">
                            {assign.employees?.name === 'Sem usuário' ? <User className="h-4 w-4" /> : (assign.employees?.name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate" title={assign.employees?.corporate_email || assign.employees?.email}>
                              {assign.employees?.name === 'Sem usuário' ? assign.employees?.email : assign.employees?.name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate" title={assign.employees?.observations || ''}>
                              {assign.employees?.name === 'Sem usuário' ? 'Sem usuário' : `${assign.employees?.department || 'Sem setor'} ${assign.employees?.observations ? `• ${assign.employees.observations}` : ''}`}
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
                  );
                })}
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

      {/* Quick Assign Modal */}
      {quickAssign.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#090d16] border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-brand-primary" /> {quickAssign.type === 'new' ? 'Preencher Vaga Livre' : 'Atribuir a Sem Usuário'}
              </h3>
              <button type="button" onClick={() => setQuickAssign({ ...quickAssign, isOpen: false })} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAssignSubmit} className="flex flex-col gap-4">
              {quickAssign.type === 'new' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail da Conta (Microsoft 365)</label>
                  <input required type="email" value={quickAssign.email} onChange={e => setQuickAssign({...quickAssign, email: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
                </div>
              )}
              {quickAssign.type === 'edit' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail da Conta (Microsoft 365)</label>
                  <input type="email" value={quickAssign.email} disabled className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome do Colaborador</label>
                <input required type="text" value={quickAssign.name} onChange={e => setQuickAssign({...quickAssign, name: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Corporativo (Opcional)</label>
                <input type="email" value={quickAssign.corporate_email} onChange={e => setQuickAssign({...quickAssign, corporate_email: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Setor / Departamento</label>
                <input type="text" value={quickAssign.department} onChange={e => setQuickAssign({...quickAssign, department: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <button disabled={isSubmitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="h-4 w-4" /> Salvar Informações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
