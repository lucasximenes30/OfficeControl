"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, User, ShieldCheck, Settings, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
        if (data) {
          setProfile(data);
        } else {
          // Fallback se não existir na tabela profiles ainda (ex: novo banco de testes)
          setProfile({
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            role: user.user_metadata?.role || 'ADMIN'
          });
        }
      } else {
        setProfile({ full_name: 'Deslogado', role: '' });
      }
    };
    fetchUser();
  }, [supabase.auth, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Hide header on login page
  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-card-border bg-[#090d16]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-lg shadow-brand-primary/20 transition-all group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-brand-primary group-hover:to-brand-secondary transition-all duration-300 leading-tight">
                LicenceControl
              </span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider leading-none">
                Microsoft 365
              </span>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/"
                  ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/manage"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/manage"
                  ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="h-4 w-4" />
              Licenças
            </Link>
            <Link
              href="/manage/users"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/manage/users"
                  ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="h-4 w-4" />
              Administradores
            </Link>
          </nav>
        </div>

        {/* User Info & Mobile Nav */}
        <div className="flex items-center gap-4">
          
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-card-border bg-[#161e2f]/50">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${
              profile?.role === 'SUPER_ADMIN' 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' 
                : 'bg-brand-primary/20 border-brand-primary/30 text-brand-primary'
            }`}>
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-200">{profile?.full_name || 'Carregando...'}</p>
              <p className={`text-[10px] font-bold ${profile?.role === 'SUPER_ADMIN' ? 'text-amber-500' : 'text-brand-success'}`}>
                {profile?.role || 'ADMIN'}
              </p>
            </div>
            <button onClick={handleLogout} className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
