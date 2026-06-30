-- ============================================================
-- 20260630000000_waitlist: Sistema Lista d'Attesa (Waitlist)
-- ============================================================
-- Consente ai clienti di iscriversi alla lista d'attesa per un
-- giorno interamente occupato. Quando una prenotazione viene
-- cancellata, i clienti in coda vengono notificati via WhatsApp.
-- ============================================================

-- 1. Creazione tabella booking_waitlist
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
                    REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id          UUID REFERENCES public.dogs(id) ON DELETE SET NULL,
  service_type    TEXT NOT NULL DEFAULT 'SELF_SERVICE'
                    CHECK (service_type IN ('SELF_SERVICE', 'ASSISTED_WASH', 'FULL_GROOMING')),
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'WAITING'
                    CHECK (status IN ('WAITING', 'NOTIFIED', 'EXPIRED')),
  notified_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Vincolo unicità: un cliente non può iscriversi due volte allo stesso
  -- giorno per lo stesso servizio nello stesso salone
  CONSTRAINT booking_waitlist_unique
    UNIQUE (tenant_id, customer_id, date, service_type)
);

-- 2. Indici per le query più frequenti
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_date
  ON public.booking_waitlist (tenant_id, date, service_type, status);

CREATE INDEX IF NOT EXISTS idx_waitlist_customer
  ON public.booking_waitlist (customer_id, status);

-- 3. Abilitazione RLS
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

-- 4. Policy: i clienti vedono solo le proprie iscrizioni
DROP POLICY IF EXISTS "waitlist_select_own" ON public.booking_waitlist;
CREATE POLICY "waitlist_select_own"
  ON public.booking_waitlist
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- 5. Policy: i clienti possono iscriversi solo per sé stessi
DROP POLICY IF EXISTS "waitlist_insert_own" ON public.booking_waitlist;
CREATE POLICY "waitlist_insert_own"
  ON public.booking_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- 6. Policy: i clienti possono rimuoversi solo dalla propria coda
DROP POLICY IF EXISTS "waitlist_delete_own" ON public.booking_waitlist;
CREATE POLICY "waitlist_delete_own"
  ON public.booking_waitlist
  FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- 7. Policy: UPDATE via service_role (per aggiornare status a NOTIFIED)
--    Le notifiche avvengono lato server con service_role_key, non RLS cliente
DROP POLICY IF EXISTS "waitlist_update_service_role" ON public.booking_waitlist;
CREATE POLICY "waitlist_update_service_role"
  ON public.booking_waitlist
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Aggiunge tenant_id dinamico come default dalla funzione helper
ALTER TABLE public.booking_waitlist
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

-- 9. Grant necessari
GRANT SELECT, INSERT, DELETE ON public.booking_waitlist TO authenticated;
GRANT ALL ON public.booking_waitlist TO service_role;
