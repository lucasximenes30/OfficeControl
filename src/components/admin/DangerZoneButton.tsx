"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

export function DangerZoneButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleClearData = async () => {
    if (confirmText !== "CONFIRMAR") return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/clear-all-data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao limpar dados.");
      
      setSuccessMsg("Base de dados limpa com sucesso. Todos os registros foram apagados.");
      setTimeout(() => {
        setIsOpen(false);
        window.location.href = "/manage";
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-8 glass-panel rounded-2xl p-6 border border-red-500/40 bg-red-500/5">
        <h2 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </h2>
        <p className="text-sm text-red-400/80 mb-6">
          Ações nesta área são irreversíveis. Elas afetarão todo o sistema permanentemente.
        </p>
        
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-black/40">
          <div>
            <h3 className="font-bold text-white text-sm">Apagar todos os dados</h3>
            <p className="text-xs text-gray-400 mt-1">Exclui todos os colaboradores, assinaturas e vínculos. Mantém apenas perfis administradores.</p>
          </div>
          <button onClick={() => setIsOpen(true)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/20">
            Limpar Base
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#090d16] border border-red-500/50 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_-10px_rgba(239,68,68,0.4)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 bg-red-500/20 border border-red-500/40 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Você tem absoluta certeza?</h2>
              <p className="text-sm text-red-400 mt-2">
                Esta ação apagará <strong>todos</strong> os dados de licenças, funcionários e vínculos de todo o sistema permanentemente.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm font-bold text-center">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-bold text-center">
                {successMsg}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Digite "CONFIRMAR" para prosseguir
              </label>
              <input 
                type="text" 
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full bg-black/40 border border-card-border rounded-xl px-4 py-3 text-center text-white font-mono uppercase focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button disabled={loading} onClick={() => setIsOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-card-border">
                Cancelar
              </button>
              <button 
                disabled={loading || confirmText !== "CONFIRMAR"} 
                onClick={handleClearData} 
                className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Apagando...' : 'Excluir Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
