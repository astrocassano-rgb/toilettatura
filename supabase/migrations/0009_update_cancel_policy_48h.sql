create or replace function public.cancel_booking(
  p_booking_id uuid
)
returns table (
  cancelled boolean,
  refunded boolean,
  refund_credits numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_booking public.bookings%rowtype;
  v_minutes_to_start numeric;
  v_refund_ratio numeric;
  v_refund_credits numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Non autenticato' using errcode = '28000';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_id = v_user_id;

  if not found then
    raise exception 'Prenotazione non trovata' using errcode = 'P0002';
  end if;

  if v_booking.status in ('CANCELLED', 'COMPLETED') then
    cancelled := false;
    refunded := false;
    refund_credits := 0;
    return next;
  end if;

  if v_booking.start_time <= now() then
    raise exception 'Prenotazione gia iniziata' using errcode = 'P0001';
  end if;

  select w.id into v_wallet_id
  from public.wallets w
  where w.customer_id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet non trovato' using errcode = 'P0002';
  end if;

  v_minutes_to_start := extract(epoch from (v_booking.start_time - now())) / 60.0;

  v_refund_ratio := case
    when v_minutes_to_start >= 2880 then 1.0
    when v_minutes_to_start >= 1440 then 0.7
    when v_minutes_to_start >= 720 then 0.5
    when v_minutes_to_start >= 480 then 0.25
    else 0.0
  end;

  v_refund_credits := round((v_booking.total_credits * v_refund_ratio)::numeric, 2);

  update public.bookings
  set status = 'CANCELLED'
  where id = v_booking.id;

  cancelled := true;

  if v_refund_credits > 0 then
    update public.wallets
    set balance_credits = round((public.wallets.balance_credits + v_refund_credits)::numeric, 2)
    where id = v_wallet_id;

    insert into public.token_transactions (wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note)
    values (
      v_wallet_id,
      'BONUS',
      v_refund_credits,
      0,
      null,
      'Rimborso cancellazione ' || round((v_refund_ratio * 100)::numeric, 0)::text || '%'
    );

    refunded := true;
    refund_credits := v_refund_credits;
    return next;
  end if;

  refunded := false;
  refund_credits := 0;
  return next;
end;
$$;

