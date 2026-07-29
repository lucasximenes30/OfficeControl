import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function parseDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleaned = dateStr.trim();
  if (!cleaned || cleaned.toLowerCase().includes('vencid') || cleaned.toLowerCase().includes('não consta') || cleaned === '-') return null;

  // Try to parse DD/MM/YYYY or DD-MM-YYYY
  const parts = cleaned.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  // Check if it's an Excel serial number (e.g. "46231")
  const asNumber = Number(cleaned);
  if (!isNaN(asNumber) && asNumber > 20000 && asNumber < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + asNumber * 86400000);
    return dateObj.toISOString().split('T')[0];
  }

  return cleaned.split('T')[0];
}

function extractSharedEmail(sharedStr: string): string {
  if (!sharedStr) return '';
  const match = sharedStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : sharedStr.trim().toLowerCase();
}

function findParentEmail(row: any, data: any): string {
  // 1. Tentar primeiro do campo mapeado para conta_adm ou compartilhado
  const fromMapped = extractSharedEmail(data.conta_adm || data.compartilhado || '');
  if (fromMapped && fromMapped !== 'conta adm') {
    return fromMapped;
  }

  // 2. Se o campo mapeado estava vazio ou era genérico ("conta adm"), varrer colunas prováveis
  for (const [header, val] of Object.entries(row)) {
    if (!val) continue;
    const h = String(header).toLowerCase();
    if (
      h.includes('adm') ||
      h.includes('membro de') ||
      h.includes('compartilhado') ||
      h.includes('conta') ||
      h.includes('pai') ||
      h.includes('master')
    ) {
      const email = extractSharedEmail(String(val));
      if (email && email !== 'conta adm') {
        return email;
      }
    }
  }

  // 3. Último recurso: varrer qualquer célula da linha que contenha um e-mail diferente do próprio membro e do e-mail corporativo
  for (const [_, val] of Object.entries(row)) {
    if (!val) continue;
    const email = extractSharedEmail(String(val));
    if (
      email &&
      email !== 'conta adm' &&
      email !== extractSharedEmail(data.conta || '') &&
      email !== extractSharedEmail(data.email_corp || '')
    ) {
      return email;
    }
  }

  return '';
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
    const subsByEmail = new Map(existingSubs?.map(s => [s.account_email?.toLowerCase().trim() || '', s.id]) || []);
    const defaultExpiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
      if (!data.conta) {
        errors.push({ line: i + 1, reason: 'Falta campo obrigatório (Conta E-mail)' });
        continue;
      }

      // Add New Mode - Skip existing
      if (mode === 'add_new' && employeeEmails.has(data.conta)) {
        skipped++;
        continue;
      }

      const dept = data.empresa || '';
      const expDate = parseDate(data.vencimento);
      const actDate = parseDate(data.ativacao);
      const tipo = (data.tipo || '').toLowerCase();

      let targetSubId = null;

      const isFamilyAdm = tipo.includes('adm');
      const isFamilyDependent = tipo.includes('membro');
      const isSemAssinatura = tipo.includes('sem assinatura');
      const isOffice365 = tipo === 'office 365'; // Para compatibilidade com antigas

      // Handle Subscription Logic
      if (isFamilyAdm || isOffice365) {
        const isFamily = isFamilyAdm || tipo.includes('family');

        let totalSlots = 6;
        if (!isFamily) totalSlots = 1;
        
        // Como 'data.licencas' na verdade indica vagas livres, mantemos totalSlots fixo
        // O próprio sistema vai calcular dinamicamente as vagas livres com base nos colaboradores vinculados.

        const cleanAccountEmail = data.conta.toLowerCase().trim();
        // Check if sub already exists (in case it was created in this run or previous)
        if (subsByEmail.has(cleanAccountEmail)) {
          targetSubId = subsByEmail.get(cleanAccountEmail);
          await supabase.from('subscriptions').update({
            account_password: data.senha || undefined,
            expiration_date: expDate || undefined,
            package_type: data.pacote || undefined
          }).eq('id', targetSubId);
        } else {
          let baseName = dept || 'M365';
          let finalName = baseName;
          const count = (nameCounter.get(baseName) || 0) + 1;
          nameCounter.set(baseName, count);
          if (count > 1) {
            finalName = `${baseName} ${count.toString().padStart(2, '0')}`;
          }

          const { data: newSub, error: subError } = await supabase.from('subscriptions').insert([{
            name: finalName,
            account_email: cleanAccountEmail,
            account_password: data.senha || null,
            slots_total: totalSlots,
            expiration_date: expDate || defaultExpiration,
            purchase_date: new Date().toISOString().split('T')[0], // Fallback para constraint
            activation_date: actDate || null,
            package_type: data.pacote || null
          }]).select().single();

          if (subError) {
            errors.push({ line: i + 1, reason: `Erro ao criar assinatura: ${subError.message}` });
            continue;
          }
          targetSubId = newSub.id;
          subsByEmail.set(cleanAccountEmail, newSub.id); // Update cache
        }
      } else if (isFamilyDependent) {
        const parentEmail = findParentEmail(row, data);
        if (!parentEmail || parentEmail.toLowerCase() === 'conta adm') {
          errors.push({ line: i + 1, reason: 'Licença Membro requer a coluna Conta Office ADM com o email do ADM.' });
          continue;
        }

        const cleanParentEmail = parentEmail.toLowerCase().trim();
        // Try to find parent subscription
        targetSubId = subsByEmail.get(cleanParentEmail);
        if (!targetSubId) {
          const { data: parentSub } = await supabase.from('subscriptions').select('id').ilike('account_email', cleanParentEmail).maybeSingle();
          if (parentSub) {
            targetSubId = parentSub.id;
            subsByEmail.set(cleanParentEmail, parentSub.id);
          } else {
            // Auto-criar a assinatura ADM caso ainda não exista
            const baseName = `Family ${cleanParentEmail.split('@')[0]}`;
            const { data: newParentSub, error: createError } = await supabase.from('subscriptions').insert([{
              name: baseName,
              account_email: cleanParentEmail,
              slots_total: 6,
              expiration_date: expDate || defaultExpiration,
              purchase_date: new Date().toISOString().split('T')[0]
            }]).select().single();

            if (createError || !newParentSub) {
              errors.push({ line: i + 1, reason: `Erro ao auto-criar assinatura ADM pai (${cleanParentEmail}): ${createError?.message || 'Erro desconhecido'}` });
              continue;
            }
            targetSubId = newParentSub.id;
            subsByEmail.set(cleanParentEmail, newParentSub.id);
          }
        }
      } else if (isSemAssinatura) {
        // Se for sem assinatura, nós apenas não criamos targetSubId
        targetSubId = null;
        if (!data.observacao) {
          data.observacao = 'Sem assinatura/não alocado';
        } else if (!data.observacao.includes('não alocado')) {
          data.observacao = `${data.observacao} | Sem assinatura/não alocado`;
        }
      } else {
        errors.push({ line: i + 1, reason: `Tipo de licença desconhecido ou vazio: ${data.tipo}` });
        continue;
      }

      const userName = (data.usuario || '').trim();
      const isEmptySlot = !userName || userName.toLowerCase() === 'nome' || userName.toLowerCase() === 'não consta';

      const finalUserName = isEmptySlot ? 'Sem usuário' : userName;

      // Create Employee
      const { data: newEmp, error: empError } = await supabase.from('employees').insert([{
        name: finalUserName,
        email: data.conta,
        password: data.senha || null,
        department: dept,
        corporate_email: data.email_corp || null,
        observations: data.observacao || null
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
