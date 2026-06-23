"use client";

import React from "react";
import { AlertCircle, BrainCircuit } from "lucide-react";

interface ColumnMapperProps {
  headers: string[];
  mapping: Record<string, string>;
  rows: any[];
  setMapping: (mapping: Record<string, string>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  errorMsg: string;
}

const CANONICAL_FIELDS = [
  { value: "ignorar", label: "Ignorar Coluna" },
  { value: "tipo", label: "Tipo (Family/365)" },
  { value: "licencas", label: "Licenças" },
  { value: "conta", label: "Conta (E-mail)" },
  { value: "senha", label: "Senha da Conta" },
  { value: "usuario", label: "Usuário (Nome)" },
  { value: "empresa", label: "Empresa" },
  { value: "conta_adm", label: "Conta Pai (Conta Office ADM)" },
  { value: "vencimento", label: "Vencimento (Data)" },
  { value: "ativacao", label: "Data de Ativação" },
  { value: "pacote", label: "Pacote" },
  { value: "observacao", label: "Observações" },
  { value: "email_corp", label: "E-mail Corporativo" },
];

export function ColumnMapper({ headers, mapping, rows, setMapping, onConfirm, onCancel, errorMsg }: ColumnMapperProps) {
  const previewRows = rows.slice(0, 3);

  const handleSelectChange = (originalHeader: string, newCanonical: string) => {
    setMapping({ ...mapping, [originalHeader]: newCanonical });
  };

  return (
    <div className="glass-panel p-6 border border-brand-secondary/40 rounded-2xl animate-in fade-in slide-in-from-right-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-brand-secondary" />
          Mapeamento IA (Revisão)
        </h2>
        <span className="text-xs font-bold text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-full border border-brand-secondary/20">
          Powered by Groq LLM
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        A inteligência artificial tentou mapear as colunas da sua planilha para os campos do sistema. Revise se os campos estão corretos antes de importar.
      </p>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-card-border mb-8">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-black/40 text-gray-400">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Coluna da Planilha</th>
              <th className="px-4 py-3 min-w-[250px]">Campo no Sistema</th>
              <th className="px-4 py-3">Preview (Linha 1)</th>
              <th className="px-4 py-3">Preview (Linha 2)</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, idx) => (
              <tr key={idx} className="border-b border-card-border bg-black/20 hover:bg-[#161e2f]/40 transition-colors">
                <td className="px-4 py-3 font-bold text-white">{header}</td>
                <td className="px-4 py-3">
                  <select 
                    value={mapping[header] || "ignorar"} 
                    onChange={(e) => handleSelectChange(header, e.target.value)}
                    className="w-full bg-[#090d16] border border-card-border text-white text-sm rounded-lg focus:ring-brand-secondary focus:border-brand-secondary block p-2"
                  >
                    {CANONICAL_FIELDS.map(field => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-400 truncate max-w-[150px]">{previewRows[0]?.[header] || "-"}</td>
                <td className="px-4 py-3 text-gray-400 truncate max-w-[150px]">{previewRows[1]?.[header] || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-card-border">
          Voltar
        </button>
        <button onClick={onConfirm} className="flex-[2] py-3 rounded-xl bg-brand-secondary hover:brightness-110 text-white font-bold transition-all shadow-lg shadow-brand-secondary/20">
          Confirmar e Iniciar Importação
        </button>
      </div>
    </div>
  );
}
