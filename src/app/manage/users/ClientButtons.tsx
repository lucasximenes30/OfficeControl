"use client";

import React from "react";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  userName: string;
}

export function DeleteButton({ userName }: DeleteButtonProps) {
  return (
    <button 
      type="submit" 
      className="p-2 rounded-lg border border-transparent hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 text-gray-400 transition-all" 
      title="Excluir Usuário" 
      onClick={(e) => {
        if (!window.confirm(`Tem certeza que deseja DELETAR o usuário ${userName}? Essa ação não pode ser desfeita e ele perderá acesso imediatamente.`)) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
