-- ==============================================================================
-- 20260630010000_customers_overview_tenant_details.sql
-- Aggiorna la vista admin_customers_overview per includere nome e slug del salone
-- ==============================================================================

CREATE OR REPLACE VIEW public.admin_customers_overview
WITH (security_invoker = true) AS
SELECT
  tc.customer_id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone,
  tc.tenant_id,
  t.name as tenant_name,       -- Nome del salone
  t.slug as tenant_slug,       -- Slug (sottodominio) del salone
  w.balance_credits,
  COALESCE(COUNT(b.id), 0)::int as bookings_total,
  COALESCE(COUNT(b.id) FILTER (WHERE b.start_time >= NOW() AND b.status IN ('PENDING', 'CONFIRMED')), 0)::int as bookings_upcoming
FROM public.tenant_customers tc
JOIN public.profiles p ON p.id = tc.customer_id
JOIN public.tenants t ON t.id = tc.tenant_id   -- Join per ottenere i dettagli del salone
LEFT JOIN public.wallets w ON w.customer_id = tc.customer_id AND w.tenant_id = tc.tenant_id
LEFT JOIN public.bookings b ON b.customer_id = tc.customer_id AND b.tenant_id = tc.tenant_id
GROUP BY tc.customer_id, p.email, p.first_name, p.last_name, p.phone, tc.tenant_id, t.name, t.slug, w.balance_credits;
