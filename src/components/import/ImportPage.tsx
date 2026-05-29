"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Upload, Link as LinkIcon, FileSpreadsheet, AlertTriangle, Play, ChevronRight, CheckCircle2 } from "lucide-react";
import { ColumnMapper } from "./ColumnMapper";
import { ImportProgress } from "./ImportProgress";

type ImportMode = "add_new" | "replace_all";
type Step = "input" | "mapping" | "processing" | "result";

export function ImportPage() {
  const [step, setStep] = useState<Step>("input");
  const [sourceType, setSourceType] = useState<"csv" | "sheets">("csv");
  const [mode, setMode] = useState<ImportMode>("add_new");
  
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const extractGid = (url: string) => {
    const match = url.match(/[#&?]gid=([0-9]+)/);
    return match ? match[1] : "0";
  };

  const handleProcessInput = async () => {
    setErrorMsg("");
    let csvText = "";

    try {
      setIsMappingLoading(true);

      if (sourceType === "sheets") {
        if (!sheetsUrl) throw new Error("Insira a URL da planilha.");
        const sheetId = extractSheetId(sheetsUrl);
        const gid = extractGid(sheetsUrl);
        if (!sheetId) throw new Error("URL do Google Sheets inválida.");
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const res = await fetch(exportUrl);
        if (!res.ok) throw new Error("Falha ao ler a planilha. Ela está pública ou o link está correto?");
        csvText = await res.text();
      } else {
        if (!file) throw new Error("Selecione um arquivo CSV.");
        csvText = await file.text();
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (!results.meta.fields || results.meta.fields.length === 0) {
            setErrorMsg("Nenhum cabeçalho encontrado no arquivo.");
            setIsMappingLoading(false);
            return;
          }
          
          setHeaders(results.meta.fields);
          setRawData(results.data);

          // Call Groq mapping API
          const mapRes = await fetch("/api/import/map-columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ headers: results.meta.fields })
          });

          if (!mapRes.ok) {
            const err = await mapRes.json();
            throw new Error(err.error || "Erro ao mapear colunas via IA.");
          }

          const mapData = await mapRes.json();
          setMapping(mapData.mapping || {});
          setStep("mapping");
          setIsMappingLoading(false);
        }
      });
    } catch (e: any) {
      setErrorMsg(e.message);
      setIsMappingLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    setStep("processing");
    try {
      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawData, mapping, mode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na importação");

      setResult(data);
      setStep("result");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("mapping"); // go back to mapping on error
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* STEPS UI */}
      {step === "input" && (
        <div className="glass-panel p-6 border border-brand-primary/40 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-brand-primary" />
            Importação em Massa (M365)
          </h2>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button onClick={() => setSourceType("csv")} className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${sourceType === "csv" ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-black/20 border-card-border text-gray-400 hover:bg-white/5'}`}>
              <Upload className="h-6 w-6" />
              <span className="font-bold text-sm">Upload CSV</span>
            </button>
            <button onClick={() => setSourceType("sheets")} className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${sourceType === "sheets" ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-black/20 border-card-border text-gray-400 hover:bg-white/5'}`}>
              <LinkIcon className="h-6 w-6" />
              <span className="font-bold text-sm">Google Sheets (Link Público)</span>
            </button>
          </div>

          <div className="mb-8 p-4 rounded-xl bg-black/20 border border-card-border">
            {sourceType === "csv" && (
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/20 file:text-brand-primary hover:file:bg-brand-primary/30" />
            )}
            {sourceType === "sheets" && (
              <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)} className="w-full bg-transparent border-none focus:outline-none text-white text-sm" />
            )}
          </div>

          <h3 className="text-sm font-bold text-white mb-3">Modo de Importação</h3>
          <div className="flex flex-col gap-3 mb-8">
            <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${mode === "add_new" ? 'bg-brand-secondary/10 border-brand-secondary/40' : 'bg-black/20 border-card-border opacity-60 hover:opacity-100'}`}>
              <input type="radio" className="mt-1" checked={mode === "add_new"} onChange={() => setMode("add_new")} />
              <div>
                <p className="font-bold text-white text-sm">Adicionar apenas novos (Seguro)</p>
                <p className="text-xs text-gray-400 mt-1">Ignora e-mails que já existem no sistema. Adiciona o restante mantendo os dados atuais intactos.</p>
              </div>
            </label>
            <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${mode === "replace_all" ? 'bg-red-500/10 border-red-500/40' : 'bg-black/20 border-card-border opacity-60 hover:opacity-100'}`}>
              <input type="radio" className="mt-1" checked={mode === "replace_all"} onChange={() => setMode("replace_all")} />
              <div>
                <p className="font-bold text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Substituir Tudo (Destrutivo)</p>
                <p className="text-xs text-red-400/70 mt-1">Apaga TODOS os funcionários, licenças e vínculos do sistema (exceto perfis de administrador) e importa a planilha do zero.</p>
              </div>
            </label>
          </div>

          <button onClick={handleProcessInput} disabled={isMappingLoading || (sourceType === "csv" && !file) || (sourceType === "sheets" && !sheetsUrl)} className="w-full py-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
            {isMappingLoading ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Avançar para Mapeamento (IA) <ChevronRight className="h-5 w-5" /></>}
          </button>
        </div>
      )}

      {step === "mapping" && (
        <ColumnMapper headers={headers} mapping={mapping} rows={rawData} setMapping={setMapping} onConfirm={handleExecuteImport} onCancel={() => setStep("input")} errorMsg={errorMsg} />
      )}

      {step === "processing" && (
        <div className="glass-panel p-12 border border-brand-primary/40 rounded-2xl flex flex-col items-center justify-center text-center animate-in zoom-in-95">
          <div className="h-16 w-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-white">Importando dados...</h2>
          <p className="text-gray-400 mt-2">Isso pode levar alguns minutos dependendo do tamanho da planilha.</p>
        </div>
      )}

      {step === "result" && (
        <ImportProgress result={result} onFinish={() => window.location.reload()} />
      )}

    </div>
  );
}
