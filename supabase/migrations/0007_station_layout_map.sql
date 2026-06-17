alter table public.stations
add column if not exists layout_x integer,
add column if not exists layout_y integer,
add column if not exists layout_w integer,
add column if not exists layout_h integer,
add column if not exists layout_zone text;

with ranked as (
  select
    id,
    row_number() over (order by created_at asc, id asc) - 1 as idx
  from public.stations
)
update public.stations s
set
  layout_x = coalesce(s.layout_x, 6 + ((ranked.idx % 3) * 31)),
  layout_y = coalesce(s.layout_y, 10 + (((ranked.idx / 3)::integer) * 24)),
  layout_w = coalesce(s.layout_w, 24),
  layout_h = coalesce(s.layout_h, 16),
  layout_zone = coalesce(
    s.layout_zone,
    case s.type
      when 'WASH_BASIN' then 'Area Lavaggio'
      when 'DRYING_ZONE' then 'Area Asciugatura'
      when 'GROOMING_TABLE' then 'Area Toelettatura'
      else 'Area Servizio'
    end
  )
from ranked
where s.id = ranked.id;

alter table public.stations
alter column layout_x set default 6,
alter column layout_y set default 10,
alter column layout_w set default 24,
alter column layout_h set default 16,
alter column layout_zone set default 'Area Servizio';

update public.stations
set
  layout_x = coalesce(layout_x, 6),
  layout_y = coalesce(layout_y, 10),
  layout_w = coalesce(layout_w, 24),
  layout_h = coalesce(layout_h, 16),
  layout_zone = coalesce(layout_zone, 'Area Servizio');

alter table public.stations
alter column layout_x set not null,
alter column layout_y set not null,
alter column layout_w set not null,
alter column layout_h set not null,
alter column layout_zone set not null;

alter table public.stations
add constraint stations_layout_x_range check (layout_x >= 0 and layout_x <= 95),
add constraint stations_layout_y_range check (layout_y >= 0 and layout_y <= 95),
add constraint stations_layout_w_range check (layout_w >= 8 and layout_w <= 100),
add constraint stations_layout_h_range check (layout_h >= 8 and layout_h <= 100);
