-- Indexes, rules, views and the photo storage bucket (safe to run more than once)

-- ============ ORDER NUMBERS ============
-- New orders get an order number automatically: HK1001, HK1002, ...
create sequence if not exists order_no_seq start 1001;
alter sequence order_no_seq owned by orders.order_no;
alter table orders alter column order_no set default ('HK' || nextval('order_no_seq'));

-- ============ UNIQUE RULES ============
create unique index if not exists orders_order_no_key      on orders (order_no);
create unique index if not exists stall_orders_one_per_stall on stall_orders (order_id, stall_id);

alter table users drop constraint if exists users_points_not_negative;
alter table users add  constraint users_points_not_negative check (points >= 0);

-- ============ INDEXES (faster lookups on foreign keys) ============
create index if not exists collection_points_centre_idx on collection_points (centre_id);
create index if not exists stalls_centre_idx            on stalls (centre_id);
create index if not exists stalls_owner_idx             on stalls (owner_id);
create index if not exists menu_items_stall_idx         on menu_items (stall_id);
create index if not exists photos_item_idx              on photos (item_id);
create index if not exists photos_user_idx              on photos (user_id);
create index if not exists votes_photo_idx              on votes (photo_id);
create index if not exists orders_user_idx              on orders (user_id, created_at desc);
create index if not exists stall_orders_stall_idx       on stall_orders (stall_id, status);
create index if not exists order_items_stall_order_idx  on order_items (stall_order_id);
create index if not exists payments_order_idx           on payments (order_id);
create index if not exists points_ledger_user_idx       on points_ledger (user_id);
create index if not exists vouchers_user_idx            on vouchers (user_id);

-- ============ TRIGGERS ============
-- Users cannot upvote their own photo
create or replace function prevent_self_vote() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from photos where id = new.photo_id and user_id = new.user_id) then
    raise exception 'You cannot vote for your own photo';
  end if;
  return new;
end $$;

drop trigger if exists votes_no_self_vote on votes;
create trigger votes_no_self_vote
  before insert on votes
  for each row execute function prevent_self_vote();

-- Adding a row to points_ledger updates the user's points total
-- (use a negative number to spend points)
create or replace function apply_points() returns trigger
language plpgsql set search_path = public as $$
begin
  update users set points = points + new.points where id = new.user_id;
  return new;
end $$;

drop trigger if exists points_ledger_apply on points_ledger;
create trigger points_ledger_apply
  after insert on points_ledger
  for each row execute function apply_points();

-- ============ VIEWS ============
-- security_invoker = true makes views follow the same RLS rules as the tables.

-- Every photo with its number of upvotes
create or replace view photo_votes with (security_invoker = true) as
select p.id as photo_id, p.item_id, p.user_id, p.image_url, p.status, p.created_at,
       count(v.photo_id)::int as vote_count
from photos p
left join votes v on v.photo_id = p.id
group by p.id;

-- The top photo per dish: most votes wins, earliest upload breaks ties.
-- Only approved photos (passed the AI food check) count.
create or replace view top_photos with (security_invoker = true) as
select distinct on (item_id)
       photo_id, item_id, image_url, user_id, vote_count
from photo_votes
where status = 'approved'
order by item_id, vote_count desc, created_at asc;

-- The eMenu: each dish with its stall and the picture to show
-- (top-voted photo, or the stall's default photo if there are none yet)
create or replace view menu_with_photo with (security_invoker = true) as
select m.id, m.stall_id, s.name as stall_name, m.name, m.description,
       m.price_cents, m.category, m.prep_minutes, m.is_available,
       coalesce(t.image_url, s.default_photo_url) as photo_url,
       t.photo_id as top_photo_id
from menu_items m
join stalls s on s.id = m.stall_id
left join top_photos t on t.item_id = m.id;

-- Live queue per stall: PAID orders still being made, and a rough wait time
-- (orders still waiting for payment are not counted)
create or replace view stall_queue with (security_invoker = true) as
select s.id as stall_id, s.name,
       count(o.id)::int                      as orders_ahead,
       (count(o.id) * s.avg_prep_minutes)::int as est_wait_minutes
from stalls s
left join stall_orders so on so.stall_id = s.id and so.status in ('paid','preparing')
left join orders o        on o.id = so.order_id and o.status in ('paid','preparing')
group by s.id;

-- ============ PHOTO STORAGE BUCKET ============
-- Public bucket for dish photos: images only, max 5 MB each
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
