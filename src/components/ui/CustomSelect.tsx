"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({ options, value, onChange, placeholder = "Selecione...", disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border border-card-border bg-[#090d16] px-4 py-3 text-sm text-left transition-all focus:outline-none focus:ring-1 focus:ring-brand-primary ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-primary/50"
        }`}
      >
        <span className={`block truncate ${!selectedOption ? "text-gray-500" : "text-white font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-primary" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-card-border bg-[#161e2f]/95 backdrop-blur-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200">
          <ul className="max-h-60 overflow-y-auto px-2 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500 text-center">Nenhuma opção disponível</li>
            ) : (
              options.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-all text-sm ${
                    value === opt.value
                      ? "bg-brand-primary/20 text-brand-primary font-bold"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="h-4 w-4 shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
