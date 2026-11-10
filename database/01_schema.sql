-- Hawker eMenu database schema (Supabase / PostgreSQL)
-- Run order: 01_schema.sql -> 02_security.sql -> 03_extras.sql -> 04_seed.sql
-- (paste each one into Supabase SQL Editor and click Run)
--
-- Money is stored as whole cents (450 = $4.50).
-- Login is handled by our own server (server/src/routes/auth.js): passwords are
-- hashed with bcrypt into users.password_hash, and new users get a random UUID as id.
--
-- To start over from an empty database, run this first (DELETES ALL DATA):
-- drop table if exists vouchers, points_ledger, saved_usuals, payments, order_items,
--   stall_orders, orders, votes, photos, menu_items, stalls, collection_points,
--   hawker_centres, users cascade;

-- ============ USERS ============
create table users (
  id            text primary key,            -- random UUID made by the server at sign-up
  display_name  text not null,
  email         text unique not null,
  password_hash text,                        -- bcrypt hash; never sent to the React app
  role          text not null default 'customer' check (role in ('customer','hawker','admin')),
  language      text not null default 'en',
  points        int  not null default 0,
  created_at    timestamptz not null default now()
);

-- ============ PLACES ============
create table hawker_centres (
  id      serial primary key,
  name    text not null,
  address text
);

create table collection_points (
  id        serial primary key,
  centre_id int not null references hawker_centres(id),
  name      text not null,
  note      text
);

create table stalls (
  id                serial primary key,
  centre_id         int  not null references hawker_centres(id),
  owner_id          text not null references users(id),
  name              text not null,
  cuisine           text,
  unit_no           text,
  default_photo_url text,
  accepts_cdc       boolean not null default false,
  is_open           boolean not null default true,
  is_paused         boolean not null default false,
  slot_capacity     int not null default 10,
  cutoff_minutes    int not null default 15,
  avg_prep_minutes  int not null default 8
);

create table menu_items (
  id           serial primary key,
  stall_id     int  not null references stalls(id),
  name         text not null,
  description  text,
  price_cents  int  not null check (price_cents >= 0),
  category     text,
  prep_minutes int  not null default 5,
  is_available boolean not null default true
);

-- ============ PHOTOS & VOTES ============
create table photos (
  id              serial primary key,
  item_id         int  not null references menu_items(id),
  user_id         text not null references users(id),
  image_url       text not null,
  ai_is_food      boolean,
  ai_confidence   numeric(4,3),
  ai_matches_dish boolean,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','review','removed')),
  report_count    int not null default 0,
  created_at      timestamptz not null default now()
);

-- The composite primary key enforces ONE vote per user per photo
create table votes (
  user_id    text not null references users(id),
  photo_id   int  not null references photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

-- ============ ORDERS ============
-- One order -> one stall_order per stall -> the items from that stall
create table orders (
  id                  serial primary key,
  user_id             text not null references users(id),
  order_no            text not null,
  centre_id           int  not null references hawker_centres(id),
  collection_point_id int  references collection_points(id),
  pickup_time         timestamptz not null,
  asap                boolean not null default false,
  status              text not null default 'pending_payment'
                      check (status in ('pending_payment','paid','preparing','ready','collected','cancelled')),
  total_cents         int not null,
  created_at          timestamptz not null default now(),
  collected_at        timestamptz
);

create table stall_orders (
  id                 serial primary key,
  order_id           int not null references orders(id) on delete cascade,
  stall_id           int not null references stalls(id),
  status             text not null default 'paid'
                     check (status in ('paid','preparing','ready','collected')),
  estimated_ready_at timestamptz,
  subtotal_cents     int not null
);

create table order_items (
  id               serial primary key,
  stall_order_id   int not null references stall_orders(id) on delete cascade,
  item_id          int not null references menu_items(id),
  quantity         int not null check (quantity > 0),
  unit_price_cents int not null,              -- price at the time of ordering
  notes            text
);

create table payments (
  id           serial primary key,
  order_id     int not null references orders(id),
  amount_cents int not null,
  nets_txn_ref text,
  status       text not null default 'pending'
               check (status in ('pending','success','failed','timeout')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

-- ============ EXTRAS ============
create table saved_usuals (
  user_id             text primary key references users(id),
  items               jsonb not null,        -- e.g. [{"item_id":1,"quantity":2}]
  collection_point_id int references collection_points(id)
);

create table points_ledger (
  id         serial primary key,
  user_id    text not null references users(id),
  points     int  not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

create table vouchers (
  id          serial primary key,
  user_id     text not null references users(id),
  value_cents int not null,
  expires_at  timestamptz not null,
  used        boolean not null default false
);
