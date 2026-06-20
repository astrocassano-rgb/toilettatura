-- Migrazione 0015: Aggiorna create_booking per usare service_type e prezzi da system_settings.

create or replace function public.create_booking(
  p_station_id uuid,
  p_dog_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_service_type public.booking_service_type default 'SELF_SERVICE'
)
returns table (
  booking_id uuid,
  total_credits numeric,
  status public.booking_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_balance numeric;
  v_minutes int;
  v_cost_per_minute numeric;
  v_station_cost numeric;
  v_operator_cost numeric := 0;
  v_total_credits numeric;
  v_station_status public.station_status;
  v_created_booking_id uuid;
  v_created_status public.booking_status;
  
  -- system settings
  v_enable_assisted boolean;
  v_price_assisted integer;
  v_enable_full boolean;
  v_price_full integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Non autenticato' using errcode = '28000';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'Intervallo orario non valido' using errcode = '22007';
  end if;

  select s.cost_per_minute, s.status
    into v_cost_per_minute, v_station_status
  from public.stations s
  where s.id = p_station_id;

  if not found then
    raise exception 'Postazione non trovata' using errcode = 'P0002';
  end if;

  if v_station_status = 'MAINTENANCE' then
    raise exception 'Postazione in manutenzione' using errcode = 'P0001';
  end if;

  perform 1
  from public.dogs d
  where d.id = p_dog_id
    and d.owner_id = v_user_id;

  if not found then
    raise exception 'Cane non valido' using errcode = 'P0001';
  end if;

  -- Read system settings
  select enable_assisted_wash, price_assisted_wash_credits, enable_full_grooming, price_full_grooming_credits
    into v_enable_assisted, v_price_assisted, v_enable_full, v_price_full
  from public.system_settings
  where id = 1;

  -- Validate service type and compute operator cost
  if p_service_type = 'ASSISTED_WASH' then
    if not v_enable_assisted then
       raise exception 'Servizio Lavaggio Assistito non disponibile' using errcode = 'P0001';
    end if;
    v_operator_cost := v_price_assisted;
  elsif p_service_type = 'FULL_GROOMING' then
    if not v_enable_full then
       raise exception 'Servizio Toelettatura Completa non disponibile' using errcode = 'P0001';
    end if;
    v_operator_cost := v_price_full;
  end if;

  v_minutes := greatest(1, ceil(extract(epoch from (p_end_time - p_start_time)) / 60.0)::int);
  v_station_cost := round((v_cost_per_minute * v_minutes)::numeric, 2);
  v_total_credits := v_station_cost + v_operator_cost;

  select w.id, w.balance_credits
    into v_wallet_id, v_balance
  from public.wallets w
  where w.customer_id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet non trovato' using errcode = 'P0002';
  end if;

  if v_balance < v_total_credits then
    raise exception 'Crediti insufficienti' using errcode = 'P0001';
  end if;

  update public.wallets
  set balance_credits = round((balance_credits - v_total_credits)::numeric, 2)
  where id = v_wallet_id;

  insert into public.bookings (customer_id, dog_id, station_id, start_time, end_time, status, total_credits, service_type, operator_cost_credits)
  values (v_user_id, p_dog_id, p_station_id, p_start_time, p_end_time, 'CONFIRMED', v_total_credits, p_service_type, v_operator_cost)
  returning public.bookings.id, public.bookings.status
  into v_created_booking_id, v_created_status;

  booking_id := v_created_booking_id;
  total_credits := v_total_credits;
  status := v_created_status;

  insert into public.token_transactions (wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note)
  values (
    v_wallet_id, 
    'DEBIT', 
    v_total_credits, 
    0, 
    null, 
    case 
      when p_service_type = 'ASSISTED_WASH' then 'Prenotazione Lavaggio Assistito' 
      when p_service_type = 'FULL_GROOMING' then 'Prenotazione Toelettatura Completa'
      else 'Prenotazione self-service' 
    end
  );

  return next;
end;
$$;
