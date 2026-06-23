-- Executar este script no SQL Editor do Supabase para adicionar as novas colunas

-- 1. Adicionar campos na tabela employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS corporate_email TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- 2. Adicionar campos na tabela subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS activation_date DATE,
ADD COLUMN IF NOT EXISTS package_type TEXT;

-- 3. Caso ainda não exista, permitir que department seja NULL (como backup)
ALTER TABLE public.employees
ALTER COLUMN department DROP NOT NULL;
