drop policy if exists "bookings_insert_own" on public.bookings;
drop policy if exists "bookings_update_own" on public.bookings;

revoke execute on function public.create_booking(uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.create_booking(uuid, uuid, timestamptz, timestamptz) to authenticated;

revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

