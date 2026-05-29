import { createClient } from "@supabase/supabase-js";

// Este helper DEVE ser utilizado EXCLUSIVAMENTE em rotas de API ou Server Actions (ambientes seguros no servidor).
// Ele possui a chave `service_role` que ignora as regras do RLS, permitindo operações administrativas plenas.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createAdminClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
