"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  PlusCircle, 
  UserPlus, 
  CreditCard, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Trash2,
  Users,
  Edit2,
  X,
  UserX,
  Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { CustomSelect } from "@/components/ui/CustomSelect";

export default function ManagePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forms State
  const [subForm, setSubForm] = useState({ name: "", account_email: "", expiration_date: "" });
  const [empForm, setEmpForm] = useState({ name: "", email: "", department: "" });
  const [assignForm, setAssignForm] = useState({ subscription_id: "", employee_id: "" });

  // Modals
  const [editingSub, setEditingSub] = useState<any>(null);
  const [deletingSub, setDeletingSub] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [subsRes, empsRes, assignsRes] = await Promise.all([
        supabase.from("subscriptions").select("*").order("name"),
        supabase.from("employees").select("*").order("name"),
        supabase.from("assignments").select("*, subscriptions(name), employees(name, email)")
      ]);
      
      setSubscriptions(subsRes.data || []);
      setEmployees(empsRes.data || []);
      setAssignments(assignsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notify = (msg: string, isError = false) => {
    if (isError) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => {
      setErrorMsg("");
      setSuccessMsg("");
    }, 5000);
  };

  // 1. Create Subscription
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("subscriptions").insert([subForm]);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Assinatura cadastrada com sucesso!");
      setSubForm({ name: "", account_email: "", expiration_date: "" });
      fetchData();
    }
    setSubmitting(false);
  };

  // 2. Update Subscription
  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("subscriptions").update({
      name: editingSub.name,
      account_email: editingSub.account_email,
      expiration_date: editingSub.expiration_date
    }).eq("id", editingSub.id);

    if (error) {
      notify(error.message, true);
    } else {
      notify("Assinatura atualizada com sucesso!");
      setEditingSub(null);
      fetchData();
    }
    setSubmitting(false);
  };

  // 3. Delete Subscription
  const confirmDeleteSubscription = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("subscriptions").delete().eq("id", deletingSub.id);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Assinatura e vínculos excluídos com sucesso!");
      setDeletingSub(null);
      fetchData();
    }
    setSubmitting(false);
  };

  // 4. Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("employees").insert([empForm]);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Colaborador cadastrado com sucesso!");
      setEmpForm({ name: "", email: "", department: "" });
      fetchData();
    }
    setSubmitting(false);
  };

  // 5. Delete Employee
  const handleDeleteEmployee = async (empId: string, empName: string) => {
    if (!confirm(`Tem certeza que deseja remover o colaborador "${empName}"? Ele perderá imediatamente a licença caso possua uma.`)) return;
    setSubmitting(true);
    const { error } = await supabase.from("employees").delete().eq("id", empId);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Colaborador excluído com sucesso!");
      fetchData();
      // Clear assignment form if the deleted user was selected
      if (assignForm.employee_id === empId) {
        setAssignForm(prev => ({ ...prev, employee_id: "" }));
      }
    }
    setSubmitting(false);
  };

  // 6. Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.subscription_id || !assignForm.employee_id) {
      notify("Selecione a assinatura e o colaborador.", true);
      return;
    }

    setSubmitting(true);

    const currentAssigns = assignments.filter(a => a.subscription_id === assignForm.subscription_id);
    if (currentAssigns.length >= 6) {
      notify("Esta assinatura já atingiu o limite de 6 licenças (Family).", true);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("assignments").insert([{
      subscription_id: assignForm.subscription_id,
      employee_id: assignForm.employee_id
    }]);

    if (error) {
      notify(error.message, true);
    } else {
      notify("Licença atribuída ao colaborador com sucesso!");
      setAssignForm({ subscription_id: "", employee_id: "" });
      fetchData();
    }
    setSubmitting(false);
  };

  // 7. Revoke Assignment
  const handleRevokeAssignment = async (assignId: string, empName: string) => {
    if (!confirm(`Deseja revogar a licença de "${empName}"? O Slot ficará livre imediatamente.`)) return;
    setSubmitting(true);
    const { error } = await supabase.from("assignments").delete().eq("id", assignId);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Licença revogada com sucesso!");
      fetchData();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[80vh]">
        <div className="h-10 w-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- FILTROS DE LÓGICA DE ATRIBUIÇÃO ---
  // Somente exibir colaboradores que NÃO possuem nenhuma licença em NENHUMA assinatura.
  const assignedEmployeeIds = new Set(assignments.map(a => a.employee_id));
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.id));

  // Preparar os dados para o CustomSelect
  const subscriptionOptions = subscriptions.map(s => ({
    value: s.id,
    label: `${s.name} (${s.account_email})`
  }));

  const employeeOptions = availableEmployees.map(e => ({
    value: e.id,
    label: `${e.name} (${e.email})`
  }));

  const impactedAssignments = deletingSub ? assignments.filter(a => a.subscription_id === deletingSub.id) : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8 relative">
      
      {/* Edit Modal (Subscriptions) */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#090d16] border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" /> Editar Assinatura
              </h3>
              <button onClick={() => setEditingSub(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome/Identificação</label>
                <input required type="text" value={editingSub.name} onChange={e => setEditingSub({...editingSub, name: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Admin</label>
                <input required type="email" value={editingSub.account_email} onChange={e => setEditingSub({...editingSub, account_email: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Data de Expiração</label>
                <input required type="date" value={editingSub.expiration_date} onChange={e => setEditingSub({...editingSub, expiration_date: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              <button disabled={submitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/20">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal (Subscriptions) */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#090d16] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
            <div className="flex items-start gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-8 w-8 shrink-0" />
              <div>
                <h3 className="text-lg font-bold">Atenção! Exclusão Crítica</h3>
                <p className="text-sm text-gray-300 mt-1">Você está prestes a excluir a assinatura <strong>{deletingSub.name}</strong>.</p>
              </div>
            </div>

            {impactedAssignments.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-red-400 mb-2">
                  Se você confirmar, os seguintes {impactedAssignments.length} colaboradores perderão suas licenças:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
                  {impactedAssignments.map(a => (
                    <li key={a.id}>{a.employees?.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {impactedAssignments.length === 0 && (
              <p className="text-sm text-gray-400 mb-4">Esta assinatura não possui ninguém utilizando no momento. Pode excluir com segurança.</p>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeletingSub(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all border border-card-border">
                Cancelar
              </button>
              <button disabled={submitting} onClick={confirmDeleteSubscription} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}


      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Administração Geral
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Cadastre novas contas M365 Family, insira colaboradores e controle as atribuições (slots).
        </p>
      </div>

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {errorMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 shadow-xl rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md text-sm font-bold text-red-500 animate-in slide-in-from-right-10 fade-in duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 shadow-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-sm font-bold text-emerald-500 animate-in slide-in-from-right-10 fade-in duration-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> {successMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ======================================================== */}
        {/* COLUNA ESQUERDA: CADASTRAR ASSINATURA E COLABORADOR       */}
        {/* ======================================================== */}
        <div className="flex flex-col gap-8">
          
          {/* Form: Subscriptions */}
          <div className="glass-panel rounded-2xl p-6 border border-card-border">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-brand-primary" />
              Nova Assinatura M365 Family
            </h2>
            <form onSubmit={handleCreateSubscription} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome/Identificação da Conta</label>
                <input required type="text" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} placeholder="Ex: Licença Equipe de Vendas" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Admin</label>
                  <input required type="email" value={subForm.account_email} onChange={e => setSubForm({...subForm, account_email: e.target.value})} placeholder="admin@empresa.com" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Data de Expiração</label>
                  <input required type="date" value={subForm.expiration_date} onChange={e => setSubForm({...subForm, expiration_date: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
                </div>
              </div>
              <button disabled={submitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4" /> Salvar Assinatura
              </button>
            </form>
          </div>

          {/* Form: Employees */}
          <div className="glass-panel rounded-2xl p-6 border border-card-border">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <UserPlus className="h-5 w-5 text-brand-secondary" />
              Cadastrar Colaborador
            </h2>
            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome Completo</label>
                <input required type="text" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} placeholder="Nome do funcionário" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail</label>
                  <input required type="email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} placeholder="email@empresa.com" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Setor</label>
                  <input type="text" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} placeholder="Ex: Financeiro" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none transition-colors" />
                </div>
              </div>
              <button disabled={submitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4" /> Salvar Colaborador
              </button>
            </form>
          </div>

        </div>

        {/* ======================================================== */}
        {/* COLUNA DIREITA: ATRIBUIÇÃO, LISTAS E EDIÇÕES              */}
        {/* ======================================================== */}
        <div className="flex flex-col gap-8">
          
          {/* Form: Assignments */}
          <div className="glass-panel rounded-2xl p-6 border border-brand-primary/40 bg-[#161e2f]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><LinkIcon className="h-32 w-32" /></div>
            
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6 relative z-10">
              <Users className="h-5 w-5 text-brand-primary" />
              Atribuir Licença a um Colaborador
            </h2>
            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-5 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">1. Selecione a Assinatura (Conta)</label>
                <CustomSelect 
                  options={subscriptionOptions} 
                  value={assignForm.subscription_id} 
                  onChange={(val) => setAssignForm({ ...assignForm, subscription_id: val })} 
                  placeholder="Selecione uma assinatura" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  2. Selecione o Colaborador 
                  <span className="text-gray-500 font-normal ml-1">(Apenas sem licença)</span>
                </label>
                <CustomSelect 
                  options={employeeOptions} 
                  value={assignForm.employee_id} 
                  onChange={(val) => setAssignForm({ ...assignForm, employee_id: val })} 
                  placeholder={availableEmployees.length > 0 ? "Selecione um colaborador" : "Nenhum colaborador livre!"}
                  disabled={availableEmployees.length === 0}
                />
              </div>
              
              <button disabled={submitting || !subscriptionOptions.length || !employeeOptions.length} type="submit" className="mt-2 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary-hover hover:to-brand-primary text-sm font-bold text-white shadow-lg shadow-brand-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:shadow-none">
                Atribuir Licença (Preencher 1 Slot)
              </button>
            </form>
          </div>

          {/* List: Assignments (Active Connections) */}
          <div className="glass-panel rounded-2xl p-6 border border-card-border">
            <h2 className="text-md font-bold text-white mb-4">Licenças Ativas em Uso</h2>
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {assignments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Nenhum slot preenchido ainda.</p>
              ) : (
                assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-white truncate">{a.employees?.name}</p>
                      <p className="text-[10px] font-mono text-brand-primary truncate">Conta: {a.subscriptions?.name}</p>
                    </div>
                    <button 
                      onClick={() => handleRevokeAssignment(a.id, a.employees?.name)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shrink-0"
                      title="Remover Licença (Revogar)"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dual Lists (Tabs visually) for Edit/Delete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* List: Subscriptions (CRUD) */}
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col max-h-[300px]">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-primary" /> Contas M365
              </h2>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
                {subscriptions.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-4">Nenhuma conta.</p>
                ) : (
                  subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-[#161e2f]/40 border border-transparent hover:border-card-border transition-colors">
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-gray-300 truncate">{sub.name}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setEditingSub(sub)} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Editar">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletingSub(sub)} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* List: Employees (CRUD) */}
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col max-h-[300px]">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-secondary" /> Colaboradores
              </h2>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
                {employees.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-4">Nenhum colaborador.</p>
                ) : (
                  employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-[#161e2f]/40 border border-transparent hover:border-card-border transition-colors">
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-gray-300 truncate">{emp.name}</p>
                      </div>
                      <div className="flex items-center shrink-0">
                        <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors" title="Excluir Definitivamente">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
