import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserMinus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  User,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { FilteredSubscriptionList } from "@/components/dashboard/FilteredSubscriptionList";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
};

export default async function Dashboard(props: Props) {
  const searchParams = await props.searchParams;
  const filter = searchParams?.filter as string;
  const isFilterLivres = filter === 'livres';

  const supabase = await createClient();

  const [
    { data: subscriptions },
    { data: assignments },
    { data: employees }
  ] = await Promise.all([
    supabase.from("subscriptions").select("*").order("expiration_date", { ascending: true }),
    supabase.from("assignments").select("*, employees(*)"),
    supabase.from("employees").select("*")
  ]);

  const subs = subscriptions || [];
  const assigns = assignments || [];
  const emps = employees || [];

  // Metrics
  const totalSubs = subs.length;
  const totalSlots = subs.reduce((acc, sub) => acc + (sub.slots_total || 6), 0);
  
  // Logic for "Sem usuário" and free slots
  const semUsuarioSlots = assigns.filter(a => a.employees?.name === 'Sem usuário').length;
  const assignedSlots = assigns.length - semUsuarioSlots;
  const emptySlots = totalSlots - assigns.length;
  const availableSlots = emptySlots + semUsuarioSlots;

  // Unassigned Employees Logic
  const assignedEmployeeIds = new Set(assigns.filter(a => a.employees?.name !== 'Sem usuário').map(a => a.employee_id));
  const unassignedEmployees = emps.filter(e => e.name !== 'Sem usuário' && !assignedEmployeeIds.has(e.id));

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

  const expiredSubs = subs.filter(sub => {
    if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
    const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) < 0;
  });

  const criticalSubs = subs.filter(sub => {
    if (!sub.expiration_date || sub.expiration_date.startsWith('2099')) return false;
    const diffTime = new Date(sub.expiration_date).getTime() - new Date().getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      
      {/* Title & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Dashboard de Licenças
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Controle o uso das assinaturas do Microsoft 365 Family na empresa.
          </p>
        </div>
        <Link
          href="/manage"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all self-start md:self-auto group"
        >
          Gerenciar Atribuições
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Alertas Críticos */}
      <div className="flex flex-col gap-3">
        {unassignedEmployees.length > 0 && (
          <Link
            href="/?filter=sem_licenca#subscriptions-list"
            scroll={true}
            className="flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-[1.01] transition-all cursor-pointer group shadow-lg shadow-red-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5 text-red-500" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-red-500 group-hover:underline">Colaboradores sem licença!</h4>
                  <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                    Clique para ver abaixo
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-90 text-gray-300">
                  Existem <strong>{unassignedEmployees.length} colaboradores</strong> cadastrados que não possuem uma licença atrelada.
                  Clique para visualizar em destaque abaixo e atribuir.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-red-400 group-hover:text-red-300 transition-colors shrink-0 pl-4">
              <span>Ver em destaque ({unassignedEmployees.length})</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        )}

        {expiredSubs.length > 0 && (
          <Link
            href="/?filter=vencidas#subscriptions-list"
            scroll={true}
            className="flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-[1.01] transition-all cursor-pointer group shadow-lg shadow-red-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5 text-red-500" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-red-500 group-hover:underline">Assinatura(s) Vencida(s)!</h4>
                  <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                    Clique para filtrar
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-90 text-gray-300">
                  Existem <strong>{expiredSubs.length} assinatura(s) já vencida(s)</strong>. Clique para filtrar e verificar imediatamente.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-red-400 group-hover:text-red-300 transition-colors shrink-0 pl-4">
              <span>Filtrar {expiredSubs.length} vencida(s)</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        )}

        {criticalSubs.length > 0 && (
          <Link
            href="/?filter=vencimento#subscriptions-list"
            scroll={true}
            className="flex items-center justify-between p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:scale-[1.01] transition-all cursor-pointer group shadow-lg shadow-yellow-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5 text-yellow-500" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-yellow-400 group-hover:underline">Atenção ao Vencimento</h4>
                  <span className="text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                    Clique para filtrar
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-90 text-gray-300">
                  Você tem <strong>{criticalSubs.length} assinatura(s)</strong> vencendo em 30 dias ou menos. Clique para filtrar e visualizar.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors shrink-0 pl-4">
              <span>Filtrar {criticalSubs.length} assinatura(s)</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Assinaturas */}
        <div className="glass-panel glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assinaturas Ativas</p>
            <h3 className="mt-2 text-3xl font-black text-white">{totalSubs}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-success font-medium">
              <CreditCard className="h-3 w-3" />
              <span>Contas M365 Family</span>
            </div>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-brand-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Total de Slots */}
        <div className="glass-panel glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total de Vagas</p>
            <h3 className="mt-2 text-3xl font-black text-white">{totalSlots}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Users className="h-3 w-3" />
              <span>Capacidade Total (x6)</span>
            </div>
          </div>
          <div className="p-3 bg-gray-500/10 rounded-2xl border border-gray-500/20 text-gray-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Vagas Ocupadas */}
        <div className="glass-panel glass-card rounded-2xl p-6 flex items-center justify-between border border-card-border hover:border-brand-success/50">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vagas em Uso</p>
            <h3 className="mt-2 text-3xl font-black text-white">{assignedSlots}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-success font-medium">
              <UserCheck className="h-3 w-3" />
              <span>Colaboradores com acesso</span>
            </div>
          </div>
          <div className="p-3 bg-brand-success/10 rounded-2xl border border-brand-success/20 text-brand-success">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Vagas Disponíveis (Interactive Filter) */}
        <Link 
          href={isFilterLivres ? "/" : "/?filter=livres"}
          scroll={false} 
          className={`glass-panel glass-card rounded-2xl p-6 flex items-center justify-between border cursor-pointer transition-all hover:scale-[1.02] ${isFilterLivres ? 'border-brand-secondary bg-brand-secondary/5' : 'border-card-border hover:border-brand-secondary/50'}`}
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vagas Livres</p>
              {isFilterLivres && <span className="text-[9px] uppercase font-bold bg-brand-secondary/20 text-brand-secondary px-1.5 py-0.5 rounded">Filtro Ativo</span>}
            </div>
            <h3 className="mt-2 text-3xl font-black text-white">{availableSlots}</h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 font-medium">
              <span 
                className="flex items-center gap-1 text-brand-secondary"
                title="Vagas na assinatura onde nenhum e-mail foi cadastrado ainda"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary shrink-0"></span>
                <span>{emptySlots} livres para convite</span>
              </span>
              <span 
                className="flex items-center gap-1 text-yellow-400"
                title="E-mail já cadastrado na assinatura, mas sem colaborador atribuído"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0"></span>
                <span>{semUsuarioSlots} sem usuário atribuído</span>
              </span>
            </div>
          </div>
          <div className="p-3 bg-brand-secondary/10 rounded-2xl border border-brand-secondary/20 text-brand-secondary hidden sm:block">
            <UserMinus className="h-6 w-6" />
          </div>
        </Link>
      </div>

      {/* Subscriptions List */}
      <FilteredSubscriptionList subs={subs} assigns={assigns} unassignedEmployees={unassignedEmployees} initialFilter={filter} />
    </div>
  );
}
