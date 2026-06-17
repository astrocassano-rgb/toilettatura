alter table public.token_transactions
add column if not exists note text null;

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "dogs_admin_all" on public.dogs;
create policy "dogs_admin_all"
on public.dogs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.admin_adjust_wallet(
  p_customer_id uuid,
  p_amount_credits numeric,
  p_reason text default null
)
returns table (
  balance_credits numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_balance numeric;
  v_abs numeric;
  v_type public.token_transaction_type;
begin
  if not public.is_admin() then
    raise exception 'Non autorizzato' using errcode = '28000';
  end if;

  if p_amount_credits is null or p_amount_credits = 0 then
    raise exception 'Importo non valido' using errcode = '22023';
  end if;

  v_abs := abs(p_amount_credits);
  v_type := case when p_amount_credits > 0 then 'BONUS' else 'DEBIT' end;

  insert into public.wallets (customer_id, balance_credits, updated_at)
  values (p_customer_id, 0, now())
  on conflict (customer_id) do nothing;

  select w.id, w.balance_credits
    into v_wallet_id, v_balance
  from public.wallets w
  where w.customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'Wallet non trovato' using errcode = 'P0002';
  end if;

  if v_balance + p_amount_credits < 0 then
    raise exception 'Saldo insufficiente per lo storno' using errcode = 'P0001';
  end if;

  update public.wallets
  set balance_credits = round((public.wallets.balance_credits + p_amount_credits)::numeric, 2)
  where id = v_wallet_id
  returning public.wallets.balance_credits into v_balance;

  insert into public.token_transactions (wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note)
  values (v_wallet_id, v_type, v_abs, 0, null, p_reason);

  balance_credits := v_balance;
  return next;
end;
$$;

create or replace function public.apply_wallet_topup(
  p_amount_credits numeric,
  p_amount_currency numeric default 0,
  p_reference text default null
)
returns table (
  applied boolean,
  balance_credits numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_balance numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Non autenticato' using errcode = '28000';
  end if;

  if p_amount_credits is null or p_amount_credits <= 0 then
    raise exception 'Importo non valido' using errcode = '22023';
  end if;

  insert into public.wallets (customer_id, balance_credits, updated_at)
  values (v_user_id, 0, now())
  on conflict (customer_id) do nothing;

  select w.id, w.balance_credits
    into v_wallet_id, v_balance
  from public.wallets w
  where w.customer_id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet non trovato' using errcode = 'P0002';
  end if;

  if p_reference is not null then
    perform 1
    from public.token_transactions t
    where t.stripe_intent_id = p_reference;
    if found then
      applied := false;
      balance_credits := v_balance;
      return next;
    end if;
  end if;

  update public.wallets
  set balance_credits = round((public.wallets.balance_credits + p_amount_credits)::numeric, 2)
  where id = v_wallet_id
  returning public.wallets.balance_credits into v_balance;

  insert into public.token_transactions (wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note)
  values (v_wallet_id, 'CHARGE', p_amount_credits, greatest(0, coalesce(p_amount_currency, 0)), p_reference, 'Topup');

  applied := true;
  balance_credits := v_balance;
  return next;
exception
  when unique_violation then
    applied := false;
    balance_credits := v_balance;
    return next;
end;
$$;

create or replace function public.admin_update_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns table (
  status public.booking_status,
  refunded boolean,
  refund_credits numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_wallet_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Non autorizzato' using errcode = '28000';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Prenotazione non trovata' using errcode = 'P0002';
  end if;

  if v_booking.status = p_status then
    status := v_booking.status;
    refunded := false;
    refund_credits := 0;
    return next;
  end if;

  if v_booking.status = 'CANCELLED' then
    raise exception 'Prenotazione gia annullata' using errcode = 'P0001';
  end if;

  if v_booking.status = 'COMPLETED' and p_status <> 'COMPLETED' then
    raise exception 'Prenotazione gia completata' using errcode = 'P0001';
  end if;

  if p_status = 'CANCELLED' then
    select w.id
      into v_wallet_id
    from public.wallets w
    where w.customer_id = v_booking.customer_id
    for update;

    if not found then
      raise exception 'Wallet non trovato' using errcode = 'P0002';
    end if;

    update public.bookings
    set status = 'CANCELLED'
    where id = v_booking.id;

    update public.wallets
    set balance_credits = round((public.wallets.balance_credits + v_booking.total_credits)::numeric, 2)
    where id = v_wallet_id;

    insert into public.token_transactions (wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note)
    values (v_wallet_id, 'BONUS', v_booking.total_credits, 0, null, coalesce(p_reason, 'Rimborso admin'));

    status := 'CANCELLED';
    refunded := true;
    refund_credits := v_booking.total_credits;
    return next;
  end if;

  if v_booking.status = 'CANCELLED' and p_status <> 'CANCELLED' then
    raise exception 'Transizione non valida' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = p_status
  where id = v_booking.id
  returning public.bookings.status into status;

  refunded := false;
  refund_credits := 0;
  return next;
end;
$$;

create or replace view public.admin_customers_overview as
select
  p.id as customer_id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone,
  w.balance_credits,
  coalesce(count(b.id), 0)::int as bookings_total,
  coalesce(count(b.id) filter (where b.start_time >= now() and b.status in ('PENDING', 'CONFIRMED')), 0)::int as bookings_upcoming
from public.profiles p
left join public.wallets w on w.customer_id = p.id
left join public.bookings b on b.customer_id = p.id
group by p.id, p.email, p.first_name, p.last_name, p.phone, w.balance_credits;

revoke execute on function public.admin_adjust_wallet(uuid, numeric, text) from public;
grant execute on function public.admin_adjust_wallet(uuid, numeric, text) to authenticated;

revoke execute on function public.admin_update_booking_status(uuid, public.booking_status, text) from public;
grant execute on function public.admin_update_booking_status(uuid, public.booking_status, text) to authenticated;

revoke execute on function public.apply_wallet_topup(numeric, numeric, text) from public;
grant execute on function public.apply_wallet_topup(numeric, numeric, text) to authenticated;
