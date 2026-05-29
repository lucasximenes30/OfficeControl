"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, RefreshCcw } from "lucide-react";

interface ImportProgressProps {
  result: {
    success: number;
    skipped: number;
    errors: { line: number; reason: string }[];
  };
  onFinish: () => void;
}

export function ImportProgress({ result, onFinish }: ImportProgressProps) {
  return (
    <div className="glass-panel p-8 border border-emerald-500/40 rounded-2xl animate-in fade-in zoom-in-95">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Importação Concluída!</h2>
        <p className="text-gray-400 mt-2">O processamento da planilha foi finalizado.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-black/20 border border-card-border flex flex-col items-center text-center">
          <span className="text-3xl font-black text-emerald-400">{result.success}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Importados com Sucesso</span>
        </div>
        <div className="p-4 rounded-xl bg-black/20 border border-card-border flex flex-col items-center text-center">
          <span className="text-3xl font-black text-yellow-400">{result.skipped}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Ignorados (Já existiam)</span>
        </div>
        <div className="p-4 rounded-xl bg-black/20 border border-card-border flex flex-col items-center text-center">
          <span className="text-3xl font-black text-red-400">{result.errors.length}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Erros na Linha</span>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertCircle className="h-4 w-4" /> Detalhes dos Erros
          </div>
          <div className="max-h-[200px] overflow-y-auto p-2 custom-scrollbar">
            {result.errors.map((err, idx) => (
              <div key={idx} className="p-2 text-sm text-gray-300 border-b border-white/5 last:border-0 flex gap-3">
                <span className="text-red-400 font-mono font-bold shrink-0">L{err.line}</span>
                <span>{err.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onFinish} className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
        <RefreshCcw className="h-5 w-5" /> Concluir e Recarregar Página
      </button>
    </div>
  );
}
