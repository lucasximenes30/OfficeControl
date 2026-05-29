import React from "react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ShieldCheck, UserPlus, Users, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { DeleteButton } from "./ClientButtons";
import { InviteForm } from "./InviteForm";
import { DangerZoneButton } from "@/components/admin/DangerZoneButton";
import { revalidatePath } from "next/cache";

export default async function ManageUsersPage() {
  const supabase = await createClient();
  
  // 1. Verificar Autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 2. Verificar Role (RBAC) do usuário logado
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';

  // 3. Buscar todos os usuários (Perfis)
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  // Server Action: Deletar Usuário
  async function deleteUserAction(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    // Validar se o solicitante é SUPER_ADMIN
    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (currentProfile?.role !== 'SUPER_ADMIN') throw new Error("Sem permissão para deletar administradores.");

    const targetId = formData.get("id") as string;
    if (targetId === user.id) throw new Error("Não pode deletar a si mesmo.");

    const adminClient = createAdminClient();
    // Deleta do auth.users (O trigger CASCADE apagará o profile)
    const { error } = await adminClient.auth.admin.deleteUser(targetId);
    
    if (error) throw new Error("Falha ao deletar: " + error.message);
    revalidatePath("/manage/users");
  }

  // Server Action: Mudar Papel (Role)
  async function changeRoleAction(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const targetId = formData.get("id") as string;
    const newRole = formData.get("role") as string;

    // Atualiza diretamente usando o cliente seguro (O RLS bloqueará se não for SUPER_ADMIN)
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", targetId);
    
    if (error) throw new Error("Sem permissão ou falha ao alterar cargo: " + error.message);
    revalidatePath("/manage/users");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Contas Administrativas
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Gerencie o acesso interno da equipe de TI ao painel de controle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <InviteForm />

        {/* Lista de Administradores */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border lg:col-span-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-brand-secondary" />
            Equipe Administrativa
          </h2>
          
          <div className="flex flex-col gap-3">
            {profiles?.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-card-border bg-black/20 hover:bg-[#161e2f]/40 transition-colors">
                
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center border text-xs font-bold ${
                    p.role === 'SUPER_ADMIN' 
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' 
                      : 'bg-brand-primary/20 border-brand-primary/30 text-brand-primary'
                  }`}>
                    {p.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200 flex items-center gap-2">
                      {p.full_name}
                      {p.id === user.id && (
                        <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/20">Você</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Membro desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                    p.role === 'SUPER_ADMIN' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  }`}>
                    {p.role}
                  </span>
                  
                  {isSuperAdmin && p.id !== user.id && (
                    <div className="flex items-center gap-1 border-l border-card-border pl-3 ml-1">
                      
                      {/* Botão de Promover/Rebaixar */}
                      <form action={changeRoleAction}>
                        <input type="hidden" name="id" value={p.id} />
                        {p.role === 'ADMIN' ? (
                          <>
                            <input type="hidden" name="role" value="SUPER_ADMIN" />
                            <button type="submit" className="p-2 rounded-lg border border-transparent hover:bg-amber-500/20 hover:text-amber-500 hover:border-amber-500/30 text-gray-400 transition-all" title="Promover a SUPER_ADMIN">
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="role" value="ADMIN" />
                            <button type="submit" className="p-2 rounded-lg border border-transparent hover:bg-gray-500/20 hover:text-gray-300 hover:border-gray-500/30 text-gray-400 transition-all" title="Rebaixar para ADMIN">
                              <ArrowDownCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </form>

                      {/* Botão de Excluir */}
                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <DeleteButton userName={p.full_name} />
                      </form>
                      
                    </div>
                  )}

                  {!isSuperAdmin && (
                    <span title="Sem permissão para alterar" className="ml-2">
                      <ShieldCheck className="h-4 w-4 text-gray-600" />
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
      
      {isSuperAdmin && (
        <DangerZoneButton />
      )}
    </div>
  );
}
