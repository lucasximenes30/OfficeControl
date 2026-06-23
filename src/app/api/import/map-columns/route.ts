import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { headers } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json({ error: 'Headers inválidos' }, { status: 400 });
    }

    const prompt = `Você é um assistente de mapeamento de dados restrito e cirúrgico.
Recebi uma planilha com os seguintes cabeçalhos originais: ${JSON.stringify(headers)}

Seu trabalho é mapear cada cabeçalho fornecido para o campo canônico correto do sistema, analisando o significado deles, mesmo que haja erros de digitação (typos) ou palavras diferentes.
Os campos canônicos permitidos são estritamente:
- tipo (ex: Tipo, OFFICE FAMILY ADM)
- licencas (ex: Licenças, Lincenças)
- conta (ex: Conta Office, Microsoft account)
- usuario (ex: Colaborador)
- empresa (ex: Empresa)
- conta_adm (ex: Conta Office ADM / Membro De, Conta pai)
- vencimento (ex: Vencimento)
- ativacao (ex: Data de Ativação)
- pacote (ex: Pacote)
- observacao (ex: Observações)
- email_corp (ex: Email, Email corporativo)
- senha (ex: Senha, Senha da conta)
- ignorar (Use "ignorar" para campos como setores, contas adm extras, ou qualquer coisa que não se encaixe nos campos acima).

Retorne APENAS um objeto JSON válido no formato:
{"cabeçalho_original": "campo_canônico"}

NÃO retorne formatação markdown (como \`\`\`json). NÃO escreva nenhum texto explicativo antes ou depois. APENAS o JSON puro.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const mapping = JSON.parse(responseContent);

    return NextResponse.json({ mapping });
  } catch (error: any) {
    console.error('Groq mapping error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
