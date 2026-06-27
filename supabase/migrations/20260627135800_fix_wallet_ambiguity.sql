-- Fix per l'ambiguità sulla colonna balance_credits in admin_adjust_wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_customer_id uuid,
  p_amount_credits numeric,
  p_reason text default null
)
RETURNS TABLE (
  balance_credits numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_balance numeric;
  v_abs numeric;
  v_type public.token_transaction_type;
  v_tenant_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non autorizzato' USING errcode = '28000';
  END IF;

  v_tenant_id := public.current_tenant_id();

  IF p_amount_credits IS NULL OR p_amount_credits = 0 THEN
    RAISE EXCEPTION 'Importo non valido' USING errcode = '22023';
  END IF;

  v_abs := abs(p_amount_credits);
  v_type := case when p_amount_credits > 0 then 'BONUS' else 'DEBIT' end;

  INSERT INTO public.wallets (customer_id, tenant_id, balance_credits, updated_at)
  VALUES (p_customer_id, v_tenant_id, 0, now())
  ON CONFLICT (customer_id, tenant_id) DO NOTHING;

  SELECT w.id, w.balance_credits
    INTO v_wallet_id, v_balance
  FROM public.wallets w
  WHERE w.customer_id = p_customer_id AND w.tenant_id = v_tenant_id
  FOR UPDATE;

  v_balance := round((v_balance + p_amount_credits)::numeric, 2);

  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insufficiente per lo storno' USING errcode = 'P0001';
  END IF;

  UPDATE public.wallets
  SET balance_credits = v_balance
  WHERE id = v_wallet_id;

  INSERT INTO public.token_transactions (wallet_id, tenant_id, type, amount_credits, amount_currency, stripe_intent_id, note)
  VALUES (v_wallet_id, v_tenant_id, v_type, v_abs, 0, null, p_reason);

  balance_credits := v_balance;
  RETURN NEXT;
END;
$$;

-- Fix per l'ambiguità sulla colonna balance_credits in apply_wallet_topup
CREATE OR REPLACE FUNCTION public.apply_wallet_topup(
  p_amount_credits numeric,
  p_amount_currency numeric default 0,
  p_reference text default null
)
RETURNS TABLE (
  applied boolean,
  balance_credits numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wallet_id uuid;
  v_balance numeric;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato' USING errcode = '28000';
  END IF;

  v_tenant_id := public.current_tenant_id();

  IF p_amount_credits IS NULL OR p_amount_credits <= 0 THEN
    RAISE EXCEPTION 'Importo non valido' USING errcode = '22023';
  END IF;

  INSERT INTO public.wallets (customer_id, tenant_id, balance_credits, updated_at)
  VALUES (v_user_id, v_tenant_id, 0, now())
  ON CONFLICT (customer_id, tenant_id) DO NOTHING;

  SELECT w.id, w.balance_credits
    INTO v_wallet_id, v_balance
  FROM public.wallets w
  WHERE w.customer_id = v_user_id AND w.tenant_id = v_tenant_id
  FOR UPDATE;

  IF p_reference IS NOT NULL THEN
    PERFORM 1
    FROM public.token_transactions t
    WHERE t.stripe_intent_id = p_reference AND t.tenant_id = v_tenant_id;
    IF FOUND THEN
      applied := false;
      balance_credits := v_balance;
      RETURN NEXT;
    END IF;
  END IF;

  v_balance := round((v_balance + p_amount_credits)::numeric, 2);

  UPDATE public.wallets
  SET balance_credits = v_balance
  WHERE id = v_wallet_id;

  INSERT INTO public.token_transactions (wallet_id, tenant_id, type, amount_credits, amount_currency, stripe_intent_id, note)
  VALUES (v_wallet_id, v_tenant_id, 'CHARGE', p_amount_credits, greatest(0, coalesce(p_amount_currency, 0)), p_reference, 'Topup');

  applied := true;
  balance_credits := v_balance;
  RETURN NEXT;
EXCEPTION
  WHEN unique_violation THEN
    applied := false;
    balance_credits := v_balance;
    RETURN NEXT;
END;
$$;
