import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  // Try to parse DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr; // Assume it's already ISO or let DB fail gracefully
}

function extractSharedEmail(sharedStr: string): string {
  if (!sharedStr) return '';
  const match = sharedStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : sharedStr.replace('Compartilhado de ', '').trim();
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas SUPER_ADMIN pode realizar importações em massa.' }, { status: 403 });
    }

    const { rows: originalRows, mapping, mode } = await req.json();

    if (!Array.isArray(originalRows) || !mapping) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    // Sort rows so ADM subscriptions are processed first to avoid parent not found errors
    const rows = [...originalRows].sort((a: any, b: any) => {
      const getTipo = (row: any) => {
        for (const [orig, canon] of Object.entries(mapping)) {
          if (canon === 'tipo') return (row[orig] || '').toLowerCase();
        }
        return '';
      };
      const tipoA = getTipo(a);
      const tipoB = getTipo(b);
      const isAdmA = tipoA.includes('adm') || tipoA.includes('365') || tipoA.includes('one drive');
      const isAdmB = tipoB.includes('adm') || tipoB.includes('365') || tipoB.includes('one drive');
      if (isAdmA && !isAdmB) return -1;
      if (!isAdmA && isAdmB) return 1;
      return 0;
    });

    let success = 0;
    let skipped = 0;
    let errors: { line: number; reason: string }[] = [];

    // MODO: Substituir Tudo
    if (mode === 'replace_all') {
      await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy to delete all
      await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Cache para otimizar pesquisas no modo add_new e também buscar subscriptions
    const { data: existingEmployees } = await supabase.from('employees').select('email');
    const employeeEmails = new Set(existingEmployees?.map(e => e.email) || []);

    const { data: existingSubs } = await supabase.from('subscriptions').select('id, account_email, name');
    const subsByEmail = new Map(existingSubs?.map(s => [s.account_email, s.id]) || []);

    const nameCounter = new Map<string, number>();
    if (existingSubs) {
      existingSubs.forEach(s => {
        const match = s.name?.match(/^(.*?)(?: (\d+))?$/);
        if (match) {
           const baseName = match[1].trim();
           const num = match[2] ? parseInt(match[2], 10) : 1;
           if ((nameCounter.get(baseName) || 0) < num) {
             nameCounter.set(baseName, num);
           }
        }
      });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Apply mapping
      const data: Record<string, string> = {};
      for (const [originalHeader, canonicalField] of Object.entries(mapping)) {
        if (canonicalField !== 'ignorar') {
          data[canonicalField as string] = row[originalHeader] || '';
        }
      }

      // Check required basic fields
      if (!data.conta || !data.usuario) {
        errors.push({ line: i + 1, reason: 'Faltam campos obrigatórios (Conta ou Usuário)' });
        continue;
      }

      const rawVencimento = (data.vencimento || '').toLowerCase();
      if (!rawVencimento || rawVencimento.includes('vencid')) {
        errors.push({ line: i + 1, reason: 'Ignorado: Data de vencimento vazia ou assinada como "Vencida"' });
        continue;
      }

      // Add New Mode - Skip existing
      if (mode === 'add_new' && employeeEmails.has(data.conta)) {
        skipped++;
        continue;
      }

      const dept = [data.empresa, data.obra].filter(Boolean).join(' - ');
      const expDate = parseDate(data.vencimento);
      const tipo = (data.tipo || '').toLowerCase();
      
      let targetSubId = null;

      const isFamilyAdm = tipo === 'office family adm' || tipo.includes('one drive');
      const isOffice365 = tipo === 'office 365';
      const isFamilyDependent = tipo === 'office family';

      // Handle Subscription Logic
      if (isFamilyAdm || isOffice365) {
        const isFamily = isFamilyAdm;
        
        // Check if sub already exists (in case it was created in this run or previous)
        if (subsByEmail.has(data.conta)) {
          targetSubId = subsByEmail.get(data.conta);
        } else {
          let baseName = [data.empresa, data.obra].filter(Boolean).join(' - ');
          if (!baseName) baseName = 'M365';
          let finalName = baseName;
          const count = (nameCounter.get(baseName) || 0) + 1;
          nameCounter.set(baseName, count);
          if (count > 1) {
            finalName = `${baseName} ${count.toString().padStart(2, '0')}`;
          }

          const { data: newSub, error: subError } = await supabase.from('subscriptions').insert([{
            name: finalName,
            account_email: data.conta,
            slots_total: isFamily ? 6 : 1,
            expiration_date: expDate || null,
            purchase_date: new Date().toISOString().split('T')[0] // Fallback para constraint
          }]).select().single();

          if (subError) {
            errors.push({ line: i + 1, reason: `Erro ao criar assinatura: ${subError.message}` });
            continue;
          }
          targetSubId = newSub.id;
          subsByEmail.set(data.conta, newSub.id); // Update cache
        }
      } else if (isFamilyDependent) {
        const parentEmail = extractSharedEmail(data.compartilhado);
        if (!parentEmail) {
          errors.push({ line: i + 1, reason: 'Licença Family (Dependente) requer o campo Compartilhado com o email do ADM.' });
          continue;
        }

        // Try to find parent subscription
        targetSubId = subsByEmail.get(parentEmail);
        if (!targetSubId) {
          // It might exist in DB but not cached? (Should be cached). 
          // Re-fetch just in case the ADM was created out of order?
          const { data: parentSub } = await supabase.from('subscriptions').select('id').eq('account_email', parentEmail).single();
          if (parentSub) {
            targetSubId = parentSub.id;
            subsByEmail.set(parentEmail, parentSub.id);
          } else {
            errors.push({ line: i + 1, reason: `Assinatura ADM pai não encontrada para o email: ${parentEmail}` });
            continue;
          }
        }
      } else {
        errors.push({ line: i + 1, reason: `Tipo de licença desconhecido ou vazio: ${data.tipo}` });
        continue;
      }

      // Create Employee
      const { data: newEmp, error: empError } = await supabase.from('employees').insert([{
        name: data.usuario,
        email: data.conta,
        department: dept
      }]).select().single();

      if (empError) {
        errors.push({ line: i + 1, reason: `Erro ao criar colaborador: ${empError.message}` });
        continue;
      }
      employeeEmails.add(data.conta); // Update cache

      // Create Assignment
      if (targetSubId && newEmp) {
        const { error: assignError } = await supabase.from('assignments').insert([{
          subscription_id: targetSubId,
          employee_id: newEmp.id
        }]);

        if (assignError) {
          errors.push({ line: i + 1, reason: `Erro ao vincular licença: ${assignError.message}` });
          continue;
        }
      }

      success++;
    }

    return NextResponse.json({ success, skipped, errors });
  } catch (error: any) {
    console.error('Import execute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
