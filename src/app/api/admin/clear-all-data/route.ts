import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas SUPER_ADMIN pode limpar a base de dados.' }, { status: 403 });
    }

    // Deletar na ordem para respeitar chaves estrangeiras caso CASCADE não esteja ligado
    const res1 = await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (res1.error) throw res1.error;
    
    const res2 = await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (res2.error) throw res2.error;

    const res3 = await supabase.from('subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (res3.error) throw res3.error;

    return NextResponse.json({ success: true, message: 'Base de dados limpa com sucesso.' });
  } catch (error: any) {
    console.error('Clear DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
