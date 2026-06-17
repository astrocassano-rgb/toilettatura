select
  pg_get_functiondef('public.create_booking(uuid, uuid, timestamptz, timestamptz)'::regprocedure) as definition;
