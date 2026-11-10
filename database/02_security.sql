-- Row Level Security (safe to run more than once)
-- With RLS on, the public (publishable/anon) key can only do what a policy allows.
-- Our Express back end uses the SECRET key, which bypasses RLS, so the server
-- can still read and write everything. Never put the secret key in React or Git.

alter table users             enable row level security;
alter table hawker_centres    enable row level security;
alter table collection_points enable row level security;
alter table stalls            enable row level security;
alter table menu_items        enable row level security;
alter table photos            enable row level security;
alter table votes             enable row level security;
alter table orders            enable row level security;
alter table stall_orders      enable row level security;
alter table order_items       enable row level security;
alter table payments          enable row level security;
alter table saved_usuals      enable row level security;
alter table points_ledger     enable row level security;
alter table vouchers          enable row level security;

-- Menu data is public: anyone may read it, nobody may change it through the public key
drop policy if exists "public read" on hawker_centres;
drop policy if exists "public read" on collection_points;
drop policy if exists "public read" on stalls;
drop policy if exists "public read" on menu_items;
drop policy if exists "public read" on photos;

create policy "public read" on hawker_centres    for select using (true);
create policy "public read" on collection_points for select using (true);
create policy "public read" on stalls            for select using (true);
create policy "public read" on menu_items        for select using (true);
create policy "public read" on photos            for select using (status = 'approved');

-- Everything else (users, votes, orders, payments, points, vouchers) has no policy,
-- so it is private and only reachable through the back end.
