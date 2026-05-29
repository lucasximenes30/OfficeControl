"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteUserAction(email: string, fullName: string, generatePassword: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  
  const adminClient = createAdminClient();
  
  if (generatePassword) {
    // Gerar senha aleatória segura (Letras, números e caracteres especiais)
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%*";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));

    // Criar usuário forçando confirmação de e-mail e injetando a marca d'água de senha temporária
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Ignora o limite de e-mail do Supabase!
      user_metadata: {
        full_name: fullName,
        requires_password_change: true
      }
    });

    if (error) return { error: error.message };
    
    revalidatePath("/manage/users");
    return { success: true, tempPassword };
  } else {
    // Envio tradicional de e-mail de convite
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName }
    });

    if (error) return { error: error.message };
    
    revalidatePath("/manage/users");
    return { success: true };
  }
}
