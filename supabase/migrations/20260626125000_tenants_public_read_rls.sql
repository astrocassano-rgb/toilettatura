-- Migrazione: RLS per la tabella tenants
-- Consente l'accesso pubblico in lettura alla tabella tenants in modo che il middleware (anonimo) possa verificare lo stato della scadenza.
-- Consente la scrittura (ALL) solo ai superadmin.

-- 1. Abilita la RLS sulla tabella tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Criterio per consentire la lettura pubblica a chiunque
DROP POLICY IF EXISTS "Allow public read access to tenants" ON public.tenants;
CREATE POLICY "Allow public read access to tenants" ON public.tenants
  FOR SELECT TO public USING (true);

-- 3. Criterio per consentire tutte le operazioni (scrittura/modifica) solo ai superadmin
DROP POLICY IF EXISTS "Allow superadmin write access to tenants" ON public.tenants;
CREATE POLICY "Allow superadmin write access to tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin', false))
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin', false));
