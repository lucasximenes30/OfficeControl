"use client";

import React, { useState, useEffect } from "react";
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
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2
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

export function FilteredSubscriptionList({ subs, assigns, unassignedEmployees = [], initialFilter }: { subs: any[], assigns: any[], unassignedEmployees?: any[], initialFilter?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter || "all");
  const [deletingEmpId, setDeletingEmpId] = useState<string | null>(null);
  const [deletedEmpIds, setDeletedEmpIds] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    empId?: string;
    empName?: string;
  }>({ isOpen: false });

  const handleDeleteEmployeeClick = (empId: string, empName: string) => {
    setDeleteModal({ isOpen: true, empId, empName });
  };

  const handleDeleteEmployeeConfirm = async () => {
    if (!deleteModal.empId) return;
    const empId = deleteModal.empId;
    setDeletingEmpId(empId);
    try {
      const { error } = await supabase.from("employees").delete().eq("id", empId);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setDeletedEmpIds(prev => [...prev, empId]);
        setDeleteModal({ isOpen: false });
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao excluir colaborador.");
    } finally {
      setDeletingEmpId(null);
    }
  };

  const visibleUnassignedEmployees = unassignedEmployees.filter(emp => !deletedEmpIds.includes(emp.id));

  useEffect(() => {
    setActiveFilter(initialFilter || "all");
  }, [initialFilter]);

  // Quick Assign Modal State
  const [showPassword, setShowPassword] = useState(false);
  const [quickAssign, setQuickAssign] = useState<{
    isOpen: boolean;
    type: 'new' | 'edit' | 'view_adm';
    subId?: string;
    empId?: string;
    email: string;
    password?: string;
    name: string;
    corporate_email: string;
    department: string;
  }>({ isOpen: false, type: 'new', email: '', password: '', name: '', corporate_email: '', department: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (quickAssign.type === 'view_adm' && quickAssign.subId) {
        const { error } = await supabase.from('subscriptions').update({
          account_password: quickAssign.password
        }).eq('id', quickAssign.subId);
        if (error) throw error;
      } else if (quickAssign.type === 'edit' && quickAssign.empId) {
        const { error } = await supabase.from('employees').update({
          name: quickAssign.name,
          email: quickAssign.email,
          password: quickAssign.password,
          corporate_email: quickAssign.corporate_email,
          department: quickAssign.department
        }).eq('id', quickAssign.empId);
        if (error) throw error;
      } else if (quickAssign.type === 'new' && quickAssign.subId) {
        const { data: emp, error: empError } = await supabase.from('employees').insert([{
          name: quickAssign.name,
          email: quickAssign.email,
          password: quickAssign.password,
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
      setShowPassword(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar informações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counters for the filter chips
  const countVencidas = subs.filter(sub => {
    if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
    const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) < 0;
  }).length;

  const countVencimento = subs.filter(sub => {
    if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
    const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const countLivres = subs.filter(sub => {
    const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
    const subSemUsuario = subAssigns.filter(a => a.employees?.name === 'Sem usuário').length;
    const subEmpty = (sub.slots_total || 6) - subAssigns.length;
    return (subEmpty + subSemUsuario) > 0;
  }).length;

  const countEmDia = subs.filter(sub => {
    if (!sub.expiration_date) return false;
    if (sub.expiration_date.startsWith('2099')) return true;
    const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) > 30;
  }).length;

  const countAuto = subs.filter(sub => sub.expiration_date?.startsWith('2099')).length;

  let filteredSubs = subs.filter(sub => {
    // 1. Filtragem por activeFilter / chips
    if (activeFilter === "vencimento") {
      if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
      const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > 30) return false;
    } else if (activeFilter === "vencidas") {
      if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
      const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) return false;
    } else if (activeFilter === "sem_licenca") {
      const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
      const subSemUsuario = subAssigns.filter(a => a.employees?.name === 'Sem usuário').length;
      const subEmpty = (sub.slots_total || 6) - subAssigns.length;
      if ((subEmpty + subSemUsuario) <= 0) return false;
    } else if (activeFilter === "livres") {
      const subAssigns = assigns.filter(a => a.subscription_id === sub.id);
      const subSemUsuario = subAssigns.filter(a => a.employees?.name === 'Sem usuário').length;
      const subEmpty = (sub.slots_total || 6) - subAssigns.length;
      if ((subEmpty + subSemUsuario) <= 0) return false;
    } else if (activeFilter === "em_dia") {
      if (!sub.expiration_date) return false;
      if (!sub.expiration_date.startsWith('2099')) {
        const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) return false;
      }
    } else if (activeFilter === "auto") {
      if (!sub.expiration_date?.startsWith('2099')) return false;
    } else if (activeFilter === "ativas") {
      if (!sub.expiration_date) return false;
      const expDate = new Date(sub.expiration_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expDate < today && !sub.expiration_date.startsWith('2099')) return false;
    }

    // 2. Procura no campo de busca
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

  // Ordenação
  if (activeFilter === 'livres') {
    filteredSubs.sort((a, b) => {
      const getFreeA = () => {
        const aAssigns = assigns.filter(assign => assign.subscription_id === a.id);
        const aSemUsuario = aAssigns.filter(assign => assign.employees?.name === 'Sem usuário').length;
        const aEmpty = (a.slots_total || 6) - aAssigns.length;
        return aEmpty + aSemUsuario;
      };
      const getFreeB = () => {
        const bAssigns = assigns.filter(assign => assign.subscription_id === b.id);
        const bSemUsuario = bAssigns.filter(assign => assign.employees?.name === 'Sem usuário').length;
        const bEmpty = (b.slots_total || 6) - bAssigns.length;
        return bEmpty + bSemUsuario;
      };
      return getFreeB() - getFreeA(); // Do maior (mais vagas livres) para o menor
    });
  } else if (activeFilter === 'vencimento') {
    filteredSubs.sort((a, b) => {
      const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
      const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
      return dateA - dateB; // Mais urgente / vencendo antes primeiro
    });
  } else {
    filteredSubs.sort((a, b) => {
      const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
      const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
      return dateB - dateA; // Decrescente (maior para o menor)
    });
  }

  return (
    <div id="subscriptions-list" className="flex flex-col gap-6">
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
        
        {/* Filtro de Status Rápido */}
        <div className="w-full md:w-auto">
          <select
            value={activeFilter}
            onChange={e => {
              setActiveFilter(e.target.value);
              router.push(e.target.value === "all" ? "/" : `/?filter=${e.target.value}`, { scroll: false });
            }}
            className="w-full bg-black/20 border border-card-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors appearance-none"
          >
            <option value="all">Todas as Assinaturas</option>
            {countVencidas > 0 && <option value="vencidas">Assinaturas Vencidas</option>}
            <option value="vencimento">Perto de Vencer</option>
            {unassignedEmployees.length > 0 && <option value="sem_licenca">Sem Licença ({unassignedEmployees.length})</option>}
            <option value="livres">Vagas Livres</option>
            <option value="em_dia">Em Dia</option>
            <option value="auto">Renovação Auto</option>
            <option value="ativas">Somente Ativas</option>
            <option value="vencidas">Somente Vencidas</option>
          </select>
        </div>
      </div>

      {/* Barra de Pílulas / Chips de Filtro */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => {
            setActiveFilter("all");
            router.push("/", { scroll: false });
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeFilter === "all"
              ? "bg-brand-primary/20 text-brand-primary border-brand-primary/40 shadow-lg shadow-brand-primary/10"
              : "bg-black/20 text-gray-400 border-card-border hover:text-white hover:border-gray-500"
          }`}
        >
          <span>Todas</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{subs.length}</span>
        </button>

        {countVencidas > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveFilter("vencidas");
              router.push("/?filter=vencidas", { scroll: false });
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              activeFilter === "vencidas"
                ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10"
                : "bg-black/20 text-gray-400 border-card-border hover:text-red-400 hover:border-red-500/30"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Vencidas</span>
            <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-black font-extrabold text-[10px] font-mono">
              {countVencidas}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveFilter("vencimento");
            router.push("/?filter=vencimento", { scroll: false });
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeFilter === "vencimento"
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-lg shadow-yellow-500/10"
              : "bg-black/20 text-gray-400 border-card-border hover:text-yellow-400 hover:border-yellow-500/30"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Perto de Vencer</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${countVencimento > 0 ? "bg-yellow-500 text-black font-extrabold" : "bg-white/10"}`}>
            {countVencimento}
          </span>
        </button>

        {visibleUnassignedEmployees.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveFilter("sem_licenca");
              router.push("/?filter=sem_licenca", { scroll: false });
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              activeFilter === "sem_licenca"
                ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10"
                : "bg-black/20 text-gray-400 border-card-border hover:text-red-400 hover:border-red-500/30"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Sem Licença</span>
            <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-black font-extrabold text-[10px] font-mono">
              {visibleUnassignedEmployees.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveFilter("livres");
            router.push("/?filter=livres", { scroll: false });
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeFilter === "livres"
              ? "bg-brand-secondary/20 text-brand-secondary border-brand-secondary/40 shadow-lg shadow-brand-secondary/10"
              : "bg-black/20 text-gray-400 border-card-border hover:text-brand-secondary hover:border-brand-secondary/30"
          }`}
        >
          <UserMinus className="h-3.5 w-3.5" />
          <span>Vagas Livres</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{countLivres}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFilter("em_dia");
            router.push("/?filter=em_dia", { scroll: false });
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeFilter === "em_dia"
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "bg-black/20 text-gray-400 border-card-border hover:text-emerald-400 hover:border-emerald-500/30"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Em Dia</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{countEmDia}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFilter("auto");
            router.push("/?filter=auto", { scroll: false });
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeFilter === "auto"
              ? "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-lg shadow-purple-500/10"
              : "bg-black/20 text-gray-400 border-card-border hover:text-purple-400 hover:border-purple-500/30"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Renovação Auto</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{countAuto}</span>
        </button>
      </div>

      {/* Banner de filtro ativo */}
      {activeFilter !== "all" && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400">Filtro aplicado:</span>
            <strong className="text-white">
              {activeFilter === "vencimento" && `Assinaturas perto do vencimento (${filteredSubs.length})`}
              {activeFilter === "vencidas" && `Assinaturas vencidas (${filteredSubs.length})`}
              {activeFilter === "sem_licenca" && `Exibindo assinaturas com vagas livres para atribuir os ${visibleUnassignedEmployees.length} colaboradores sem licença`}
              {activeFilter === "livres" && `Assinaturas com vagas livres (${filteredSubs.length})`}
              {activeFilter === "em_dia" && `Assinaturas em dia (${filteredSubs.length})`}
              {activeFilter === "auto" && `Assinaturas com renovação automática (${filteredSubs.length})`}
              {activeFilter === "ativas" && `Somente assinaturas ativas (${filteredSubs.length})`}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              router.push("/", { scroll: false });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Limpar Filtro
          </button>
        </div>
      )}

      {/* Painel de Destaque: Colaboradores sem Licença na Dashboard */}
      {(activeFilter === "sem_licenca" || (activeFilter === "all" && visibleUnassignedEmployees.length > 0)) && visibleUnassignedEmployees.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border-2 border-red-500/50 bg-red-500/10 flex flex-col gap-4 animate-in fade-in shadow-xl shadow-red-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <User className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Colaboradores sem Licença em Destaque
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500 text-black">
                    {visibleUnassignedEmployees.length} pendente(s)
                  </span>
                </h3>
                <p className="text-xs text-gray-300">
                  Estes colaboradores estão cadastrados na empresa, mas ainda não têm licença atribuída.
                </p>
              </div>
            </div>
            <Link
              href="/manage?filter=sem_licenca#colaboradores-list"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-black font-extrabold text-xs transition-colors shadow-lg shadow-red-500/20 self-start sm:self-auto shrink-0"
            >
              Atribuir na Gestão <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleUnassignedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="group relative flex items-center justify-between p-3.5 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-bold text-white truncate">{emp.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{emp.email || emp.corporate_email || 'Sem e-mail'}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400">
                    {emp.department || 'Sem setor'} • Não atribuído
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEmployeeClick(emp.id, emp.name)}
                  disabled={deletingEmpId === emp.id}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/60 shrink-0"
                  title="Excluir colaborador"
                >
                  {deletingEmpId === emp.id ? (
                    <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <div 
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-lg transition-colors"
                  onClick={() => {
                    setQuickAssign({
                      isOpen: true,
                      type: 'view_adm',
                      subId: sub.id,
                      email: sub.account_email || '',
                      password: sub.account_password || '',
                      name: sub.name || '',
                      corporate_email: '',
                      department: ''
                    });
                  }}
                >
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
                    // Agora qualquer slot é clicável.
                    const isClickable = true;

                    return (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (!isClickable) return;
                        if (isSemUsuario || assign) {
                          setQuickAssign({
                            isOpen: true,
                            type: 'edit',
                            empId: assign.employees.id,
                            email: assign.employees.email || '',
                            password: assign.employees.password || '',
                            name: assign.employees.name || '',
                            corporate_email: assign.employees.corporate_email || '',
                            department: assign.employees.department || ''
                          });
                        } else if (isLivre) {
                          setQuickAssign({
                            isOpen: true,
                            type: 'new',
                            subId: sub.id,
                            email: '',
                            password: '',
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
                {quickAssign.type === 'view_adm' ? <ShieldCheck className="h-5 w-5 text-brand-primary" /> : <User className="h-5 w-5 text-brand-primary" />} 
                {quickAssign.type === 'new' ? 'Preencher Vaga Livre' : quickAssign.type === 'view_adm' ? 'Conta ADM da Assinatura' : 'Dados do Slot'}
              </h3>
              <button type="button" onClick={() => { setQuickAssign({ ...quickAssign, isOpen: false }); setShowPassword(false); }} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAssignSubmit} className="flex flex-col gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail da Conta (Microsoft 365)</label>
                <input 
                  required={quickAssign.type === 'new'} 
                  type="email" 
                  value={quickAssign.email} 
                  onChange={e => setQuickAssign({...quickAssign, email: e.target.value})} 
                  disabled={quickAssign.type === 'view_adm' || (quickAssign.type === 'edit' && quickAssign.name !== 'Sem usuário')}
                  className={`w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm ${quickAssign.type === 'view_adm' || (quickAssign.type === 'edit' && quickAssign.name !== 'Sem usuário') ? 'text-gray-500 cursor-not-allowed' : 'text-white focus:border-brand-primary focus:outline-none'}`} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Senha da Conta Office</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={quickAssign.password || ''} 
                    onChange={e => setQuickAssign({...quickAssign, password: e.target.value})} 
                    placeholder="Sem senha salva"
                    className="w-full rounded-xl border border-card-border bg-[#161e2f] pl-4 pr-10 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Preencha caso deseje armazenar a senha da conta Microsoft.</p>
              </div>

              {quickAssign.type !== 'view_adm' && (
                <>
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
                </>
              )}

              <button disabled={isSubmitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="h-4 w-4" /> Salvar Informações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Customizado de Confirmação de Exclusão de Colaborador */}
      {deleteModal.isOpen && deleteModal.empId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-[#0f172a] p-6 shadow-2xl shadow-red-500/10 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Excluir Colaborador</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Essa ação não pode ser desfeita.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteModal({ isOpen: false })} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-sm text-gray-300">
              Tem certeza que deseja remover o colaborador <strong className="text-white font-bold">&ldquo;{deleteModal.empName}&rdquo;</strong> do sistema?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setDeleteModal({ isOpen: false })} 
                disabled={deletingEmpId !== null}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => handleDeleteEmployeeConfirm()} 
                disabled={deletingEmpId !== null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-black font-extrabold text-xs transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {deletingEmpId ? (
                  <>
                    <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Sim, excluir colaborador
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
