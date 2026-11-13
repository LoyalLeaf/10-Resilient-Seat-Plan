create table if not exists class_board (
  id integer primary key,
  rev integer not null default 0,
  synced_rev integer not null default 0,
  dirty boolean not null default false,
  dirty_id text,
  points jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into class_board (id)
values (1)
on conflict (id) do nothing;
