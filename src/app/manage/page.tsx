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
  User,
  Edit2,
  X,
  UserX,
  Link as LinkIcon,
  Search,
  RefreshCcw,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ImportPage } from "@/components/import/ImportPage";

const MAGIC_DATE = '2099-12-31';

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
  const [subForm, setSubForm] = useState({ name: "", account_email: "", expiration_date: "", slots_total: 6, auto_renew: false });
  const [empForm, setEmpForm] = useState({ name: "", email: "", department: "" });
  const [assignForm, setAssignForm] = useState({ subscription_id: "", employee_id: "" });

  // Search/Filter State
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [empSearchQuery, setEmpSearchQuery] = useState("");

  // Modals
  const [editingSub, setEditingSub] = useState<any>(null);
  const [deletingSub, setDeletingSub] = useState<any>(null);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [subsRes, empsRes, assignsRes] = await Promise.all([
        supabase.from("subscriptions").select("*").order("name"),
        supabase.from("employees").select("*"),
        supabase.from("assignments").select("*, subscriptions(name), employees(name, email)")
      ]);
      
      const emps = empsRes.data || [];
      emps.sort((a, b) => a.name.localeCompare(b.name));

      const assigns = assignsRes.data || [];
      assigns.sort((a, b) => (a.employees?.name || "").localeCompare(b.employees?.name || ""));

      setSubscriptions(subsRes.data || []);
      setEmployees(emps);
      setAssignments(assigns);
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

    const finalDate = subForm.auto_renew ? MAGIC_DATE : subForm.expiration_date;

    const { error } = await supabase.from("subscriptions").insert([{
      name: subForm.name,
      account_email: subForm.account_email,
      expiration_date: finalDate,
      slots_total: Number(subForm.slots_total)
    }]);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Assinatura cadastrada com sucesso!");
      setSubForm({ name: "", account_email: "", expiration_date: "", slots_total: 6, auto_renew: false });
      fetchData();
    }
    setSubmitting(false);
  };

  // 2. Update Subscription
  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const finalDate = editingSub.auto_renew ? MAGIC_DATE : editingSub.expiration_date;

    const { error } = await supabase.from("subscriptions").update({
      name: editingSub.name,
      account_email: editingSub.account_email,
      expiration_date: finalDate,
      slots_total: Number(editingSub.slots_total)
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

  // 3. Renew Subscription (+1 Year)
  const handleRenewSubscription = async (sub: any) => {
    setSubmitting(true);
    const dateObj = new Date(sub.expiration_date);
    dateObj.setFullYear(dateObj.getFullYear() + 1);
    const newDateStr = dateObj.toISOString().split('T')[0];

    const { error } = await supabase.from("subscriptions").update({
      expiration_date: newDateStr
    }).eq("id", sub.id);

    if (error) {
      notify(error.message, true);
    } else {
      notify(`Assinatura ${sub.name} renovada para ${newDateStr} (+1 ano)!`);
      fetchData();
    }
    setSubmitting(false);
  };

  // 4. Delete Subscription
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

  // 5. Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("employees").insert([{
      name: empForm.name, email: empForm.email, department: empForm.department
    }]);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Colaborador cadastrado com sucesso!");
      setEmpForm({ name: "", email: "", department: "" });
      fetchData();
    }
    setSubmitting(false);
  };

  // 6. Update Employee
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("employees").update({
      name: editingEmp.name,
      email: editingEmp.email,
      department: editingEmp.department
    }).eq("id", editingEmp.id);

    if (error) {
      notify(error.message, true);
    } else {
      notify("Colaborador atualizado com sucesso!");
      setEditingEmp(null);
      fetchData();
    }
    setSubmitting(false);
  };

  // 7. Delete Employee
  const handleDeleteEmployee = async (empId: string, empName: string) => {
    if (!confirm(`Tem certeza que deseja remover o colaborador "${empName}"? Ele perderá imediatamente a licença caso possua uma.`)) return;
    setSubmitting(true);
    const { error } = await supabase.from("employees").delete().eq("id", empId);
    if (error) {
      notify(error.message, true);
    } else {
      notify("Colaborador excluído com sucesso!");
      fetchData();
      if (assignForm.employee_id === empId) {
        setAssignForm(prev => ({ ...prev, employee_id: "" }));
      }
    }
    setSubmitting(false);
  };

  // 8. Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.subscription_id || !assignForm.employee_id) {
      notify("Selecione a assinatura e o colaborador.", true);
      return;
    }

    setSubmitting(true);

    const targetSub = subscriptions.find(s => s.id === assignForm.subscription_id);
    const maxSlots = targetSub?.slots_total || 6;
    const currentAssigns = assignments.filter(a => a.subscription_id === assignForm.subscription_id);
    
    if (currentAssigns.length >= maxSlots) {
      notify(`Esta assinatura já atingiu o limite de ${maxSlots} licenças.`, true);
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

  // 9. Revoke Assignment
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
  const assignedEmployeeIds = new Set(assignments.map(a => a.employee_id));
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.id));

  const subscriptionOptions = subscriptions.map(s => ({
    value: s.id,
    label: `${s.name} (${s.slots_total === 1 ? 'Única' : 'Family'}) - ${s.account_email}`
  }));

  const employeeOptions = availableEmployees.map(e => ({
    value: e.id,
    label: `${e.name} (${e.email})`
  }));

  // --- FILTRO DE PESQUISA NAS ATRIBUIÇÕES ---
  const filteredAssignments = assignments.filter(a => {
    if (!assignSearchQuery) return true;
    const q = assignSearchQuery.toLowerCase();
    const empName = a.employees?.name?.toLowerCase() || "";
    const subName = a.subscriptions?.name?.toLowerCase() || "";
    return empName.includes(q) || subName.includes(q);
  });

  const filteredSubscriptions = subscriptions.filter(s => {
    if (!subSearchQuery) return true;
    const q = subSearchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.account_email?.toLowerCase().includes(q);
  });

  const filteredEmployees = employees.filter(e => {
    if (!empSearchQuery) return true;
    const q = empSearchQuery.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
  });

  const impactedAssignments = deletingSub ? assignments.filter(a => a.subscription_id === deletingSub.id) : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8 relative">
      
      {/* Edit Modal (Subscriptions) */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#090d16] border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" /> Editar Assinatura
              </h3>
              <button type="button" onClick={() => setEditingSub(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome/Identificação</label>
                <input required type="text" value={editingSub.name} onChange={e => setEditingSub({...editingSub, name: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editingSub.slots_total === 1 ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-card-border bg-black/20 text-gray-500 hover:bg-white/5'}`}>
                  <input type="radio" className="sr-only" checked={editingSub.slots_total === 1} onChange={() => setEditingSub({...editingSub, slots_total: 1})} />
                  <User className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Única (1)</span>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editingSub.slots_total === 6 ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-card-border bg-black/20 text-gray-500 hover:bg-white/5'}`}>
                  <input type="radio" className="sr-only" checked={editingSub.slots_total === 6} onChange={() => setEditingSub({...editingSub, slots_total: 6})} />
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Family (6)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Admin</label>
                <input required type="email" value={editingSub.account_email} onChange={e => setEditingSub({...editingSub, account_email: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none" />
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forma de Renovação</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className={`flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${!editingSub.auto_renew ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <input type="radio" className="sr-only" checked={!editingSub.auto_renew} onChange={() => setEditingSub({...editingSub, auto_renew: false})} />
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold">Manual (Data)</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${editingSub.auto_renew ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <input type="radio" className="sr-only" checked={editingSub.auto_renew} onChange={() => setEditingSub({...editingSub, auto_renew: true})} />
                    <CreditCard className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold">Automática (Cartão)</span>
                  </label>
                </div>
                {!editingSub.auto_renew && (
                  <input required type="date" value={editingSub.expiration_date} onChange={e => setEditingSub({...editingSub, expiration_date: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2 mt-1 text-sm text-white focus:border-brand-primary focus:outline-none" />
                )}
              </div>

              <button disabled={submitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-brand-primary/20">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (Employees) */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#090d16] border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-secondary" /> Editar Colaborador
              </h3>
              <button type="button" onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome Completo</label>
                <input required type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Corporativo</label>
                <input required type="email" value={editingEmp.email} onChange={e => setEditingEmp({...editingEmp, email: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Setor</label>
                <input type="text" value={editingEmp.department || ""} onChange={e => setEditingEmp({...editingEmp, department: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#161e2f] px-4 py-2.5 text-sm text-white focus:border-brand-secondary focus:outline-none" />
              </div>
              <button disabled={submitting} type="submit" className="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-secondary to-blue-600 hover:brightness-110 text-white font-bold text-sm transition-all shadow-lg shadow-brand-secondary/20">
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
              <button type="button" onClick={() => setDeletingSub(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all border border-card-border">
                Cancelar
              </button>
              <button type="button" disabled={submitting} onClick={confirmDeleteSubscription} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all">
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
          Cadastre novas contas M365, insira colaboradores e controle as atribuições (slots).
        </p>
      </div>

      {/* Seção de Importação via IA */}
      <ImportPage />

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
              Nova Assinatura Microsoft 365
            </h2>
            <form onSubmit={handleCreateSubscription} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome/Identificação da Conta</label>
                <input required type="text" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} placeholder="Ex: Licença Equipe de Vendas" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${subForm.slots_total === 1 ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-card-border bg-black/20 text-gray-500 hover:bg-white/5'}`}>
                  <input type="radio" className="sr-only" checked={subForm.slots_total === 1} onChange={() => setSubForm({...subForm, slots_total: 1})} />
                  <User className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Licença Única (1 vaga)</span>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${subForm.slots_total === 6 ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-card-border bg-black/20 text-gray-500 hover:bg-white/5'}`}>
                  <input type="radio" className="sr-only" checked={subForm.slots_total === 6} onChange={() => setSubForm({...subForm, slots_total: 6})} />
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Family (6 vagas)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail Admin</label>
                <input required type="email" value={subForm.account_email} onChange={e => setSubForm({...subForm, account_email: e.target.value})} placeholder="admin@empresa.com" className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
              </div>

              {/* Toggles Cartão vs Manual */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forma de Renovação</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className={`flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${!subForm.auto_renew ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <input type="radio" className="sr-only" checked={!subForm.auto_renew} onChange={() => setSubForm({...subForm, auto_renew: false})} />
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold">Manual (Data)</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${subForm.auto_renew ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <input type="radio" className="sr-only" checked={subForm.auto_renew} onChange={() => setSubForm({...subForm, auto_renew: true})} />
                    <CreditCard className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold">Automática (Cartão)</span>
                  </label>
                </div>

                {!subForm.auto_renew && (
                  <input required type="date" value={subForm.expiration_date} onChange={e => setSubForm({...subForm, expiration_date: e.target.value})} className="w-full rounded-xl border border-card-border bg-[#090d16] px-4 py-2 mt-1 text-sm text-white focus:border-brand-primary focus:outline-none transition-colors" />
                )}
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
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <input 
                type="text" 
                value={assignSearchQuery}
                onChange={e => setAssignSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador ou conta..."
                className="w-full bg-black/20 border border-card-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredAssignments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Nenhum resultado encontrado.</p>
              ) : (
                filteredAssignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-white truncate">{a.employees?.name}</p>
                      <p className="text-[10px] font-mono text-brand-primary truncate">Conta: {a.subscriptions?.name}</p>
                    </div>
                    <button 
                      type="button"
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
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col max-h-[600px]">
              <div className="flex flex-col gap-3 mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand-primary" /> Contas M365
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    value={subSearchQuery}
                    onChange={e => setSubSearchQuery(e.target.value)}
                    placeholder="Buscar conta..."
                    className="w-full bg-black/20 border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
                {filteredSubscriptions.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-4">Nenhuma conta.</p>
                ) : (
                  filteredSubscriptions.map(sub => {
                    const isAutoRenew = sub.expiration_date === MAGIC_DATE;
                    return (
                      <div key={sub.id} className="flex flex-col p-2 rounded-lg bg-black/20 hover:bg-[#161e2f]/40 border border-transparent hover:border-card-border transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="truncate pr-2">
                            <p className="text-xs font-bold text-gray-300 truncate">{sub.name}</p>
                            <p className="text-[9px] text-gray-500">{sub.slots_total === 1 ? 'Única' : 'Family (6)'}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setEditingSub({ ...sub, auto_renew: isAutoRenew })} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeletingSub(sub)} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Botão de Renovar Rápido ou Cartão */}
                        {isAutoRenew ? (
                          <div className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold">
                            <CreditCard className="h-3 w-3" />
                            Automática
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleRenewSubscription(sub)} 
                            className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold transition-colors"
                          >
                            <RefreshCcw className="h-3 w-3" />
                            Renovar (+1 Ano)
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* List: Employees (CRUD) */}
            <div className="glass-panel rounded-2xl p-5 border border-card-border flex flex-col max-h-[600px]">
              <div className="flex flex-col gap-3 mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-secondary" /> Colaboradores
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    value={empSearchQuery}
                    onChange={e => setEmpSearchQuery(e.target.value)}
                    placeholder="Buscar colaborador..."
                    className="w-full bg-black/20 border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-secondary transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-4">Nenhum colaborador.</p>
                ) : (
                  filteredEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-[#161e2f]/40 border border-transparent hover:border-card-border transition-colors">
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-gray-300 truncate">{emp.name}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setEditingEmp(emp)} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Editar Colaborador">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
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
