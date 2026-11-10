-- Sample data for development (run AFTER 03_extras.sql)
-- !!! WARNING: DO NOT RUN ON THE SHARED TEAM DATABASE WITHOUT ASKING THE GROUP FIRST !!!
-- The first statement wipes ALL rows in every table, including every account your
-- teammates signed up with, their photos, votes and orders. It cannot be undone.
-- Only re-run it when the whole team agrees to reset to this sample data.
--
-- Demo users have no password, so nobody can log in as them; they only own the sample
-- stalls, photos and orders. To test as a hawker: sign up in the app, then run
--   update users set role = 'hawker' where email = 'you@example.com';
-- (and point a stall at you: update stalls set owner_id = (select id from users where email = 'you@example.com') where id = 1;)

truncate table vouchers, points_ledger, saved_usuals, payments, order_items,
  stall_orders, orders, votes, photos, menu_items, stalls, collection_points,
  hawker_centres, users
  restart identity cascade;

-- ============ USERS ============
insert into users (id, display_name, email, role) values
  ('hawker-demo-1',   'Ah Hock',  'ahhock@example.com',  'hawker'),
  ('hawker-demo-2',   'Lao Ban',  'laoban@example.com',  'hawker'),
  ('hawker-demo-3',   'Ahmad',    'ahmad@example.com',   'hawker'),
  ('customer-demo-1', 'Mei Ling', 'meiling@example.com', 'customer'),
  ('customer-demo-2', 'Raj',      'raj@example.com',     'customer'),
  ('customer-demo-3', 'Wei Jie',  'weijie@example.com',  'customer'),
  ('admin-demo-1',    'Admin',    'admin@example.com',   'admin');

-- ============ PLACES ============
insert into hawker_centres (name, address) values
  ('Maxwell Food Centre', '1 Kadayanallur St, Singapore 069184');                    -- id 1

insert into collection_points (centre_id, name, note) values
  (1, 'Collection Point A', 'Beside Stall #01-12'),                                    -- id 1
  (1, 'Collection Point B', 'Near the main entrance');                                 -- id 2

insert into stalls (centre_id, owner_id, name, cuisine, unit_no, accepts_cdc, avg_prep_minutes) values
  (1, 'hawker-demo-1', 'Ah Hock Chicken Rice', 'Chicken rice', '#01-12', true,   5), -- id 1
  (1, 'hawker-demo-2', 'Lao Ban Laksa',        'Laksa',        '#01-20', true,  12), -- id 2
  (1, 'hawker-demo-3', 'Ahmad Nasi Lemak',     'Malay',        '#02-11', false,  8); -- id 3

insert into menu_items (stall_id, name, description, price_cents, category, prep_minutes, is_available) values
  (1, 'Roasted Chicken Rice', 'Roasted chicken on fragrant rice',      450, 'Rice',    5, true),  -- id 1
  (1, 'Steamed Chicken Rice', 'Steamed chicken on fragrant rice',      450, 'Rice',    5, true),  -- id 2
  (1, 'Char Siew Rice',       'BBQ pork on rice',                      500, 'Rice',    5, true),  -- id 3
  (1, 'Braised Egg',          'Soy-braised egg',                       100, 'Sides',   1, false), -- id 4 (sold out)
  (2, 'Curry Laksa',          'Spicy coconut noodle soup',             580, 'Noodles', 8, true),  -- id 5
  (3, 'Nasi Lemak',           'Coconut rice with sambal',              550, 'Rice',    6, true),  -- id 6
  (2, 'Iced Milo',            null,                                    150, 'Drinks',  1, true),  -- id 7
  (3, 'Nasi Lemak with Chicken Wing', 'Coconut rice, sambal, egg, ikan bilis, peanuts',
                                                                       650, 'Rice',    7, true);  -- id 8

-- ============ PHOTOS & VOTES ============
-- Placeholder images; real ones will be in the Supabase "photos" bucket
insert into photos (item_id, user_id, image_url, ai_is_food, ai_confidence, ai_matches_dish, status) values
  (1, 'customer-demo-1', 'https://placehold.co/600x400?text=Roasted+Chicken+Rice+1', true,  0.970, true,  'approved'), -- id 1
  (1, 'customer-demo-2', 'https://placehold.co/600x400?text=Roasted+Chicken+Rice+2', true,  0.930, true,  'approved'), -- id 2
  (5, 'customer-demo-1', 'https://placehold.co/600x400?text=Curry+Laksa',            true,  0.950, true,  'approved'), -- id 3
  (1, 'customer-demo-3', 'https://placehold.co/600x400?text=Pending+photo',          null,  null,  null,  'pending'),  -- id 4
  (6, 'customer-demo-2', 'https://placehold.co/600x400?text=Not+food',               false, 0.120, false, 'rejected'); -- id 5

-- Photo 2 gets 2 votes, photo 1 gets 1, so photo 2 becomes Roasted Chicken Rice's picture
insert into votes (user_id, photo_id) values
  ('customer-demo-1', 2),
  ('customer-demo-3', 2),
  ('customer-demo-2', 1),
  ('customer-demo-2', 3),
  ('customer-demo-3', 3);

-- ============ ORDERS ============
-- order_no is filled in automatically (HK1001, HK1002, HK1003)
insert into orders (user_id, centre_id, collection_point_id, pickup_time, asap, status, total_cents, created_at, collected_at) values
  ('customer-demo-1', 1, 1, now() + interval '20 minutes', false, 'preparing',       1480, now() - interval '5 minutes', null),      -- id 1
  ('customer-demo-2', 1, 2, now() - interval '1 day',      true,  'collected',        550, now() - interval '1 day 15 minutes', now() - interval '1 day'), -- id 2
  ('customer-demo-3', 1, 1, now() + interval '30 minutes', false, 'pending_payment',  500, now(), null);                               -- id 3

-- Order 1 is a multi-stall order (chicken rice + laksa)
insert into stall_orders (order_id, stall_id, status, estimated_ready_at, subtotal_cents) values
  (1, 1, 'preparing', now() + interval '10 minutes', 900),  -- id 1
  (1, 2, 'paid',      now() + interval '15 minutes', 580),  -- id 2
  (2, 3, 'collected', now() - interval '1 day',      550),  -- id 3
  (3, 1, 'paid',      null,                          500);  -- id 4

insert into order_items (stall_order_id, item_id, quantity, unit_price_cents, notes) values
  (1, 1, 2, 450, 'Less rice'),
  (2, 5, 1, 580, null),
  (3, 6, 1, 550, 'Extra sambal'),
  (4, 3, 1, 500, null);

insert into payments (order_id, amount_cents, nets_txn_ref, status, created_at, paid_at) values
  (1, 1480, 'NETS-DEMO-0001', 'success', now() - interval '5 minutes', now() - interval '4 minutes'),
  (2,  550, 'NETS-DEMO-0002', 'success', now() - interval '1 day 15 minutes', now() - interval '1 day 14 minutes'),
  (3,  500, null,             'pending', now(), null);

-- ============ EXTRAS ============
insert into saved_usuals (user_id, items, collection_point_id) values
  ('customer-demo-1', '[{"item_id": 1, "quantity": 2}, {"item_id": 5, "quantity": 1}]', 1);

-- The points trigger adds these to users.points automatically
insert into points_ledger (user_id, points, reason) values
  ('customer-demo-1', 10, 'Photo approved'),
  ('customer-demo-1', 10, 'Photo approved'),
  ('customer-demo-2', 10, 'Photo approved'),
  ('customer-demo-2', 15, 'Order HK1002 collected');

insert into vouchers (user_id, value_cents, expires_at) values
  ('customer-demo-1', 100, now() + interval '30 days');

-- ============ QUICK CHECKS (run these after) ============
-- select * from menu_with_photo order by stall_id, id;  -- Roasted Chicken Rice shows photo 2
-- select * from stall_queue;                            -- Ah Hock 1, Lao Ban 1, Ahmad 0 (unpaid HK1003 not counted)
-- select id, display_name, points from users;           -- Mei Ling 20, Raj 25
-- select order_no, status, total_cents from orders;     -- HK1001, HK1002, HK1003
